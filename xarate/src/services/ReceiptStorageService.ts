// Receipt image storage service with compression and Supabase Storage integration
import { supabase } from './supabase';

export interface IReceiptStorageService {
  uploadReceipt(image: Blob, householdId: string, expenseId: string): Promise<string>;
  deleteReceipt(receiptUrl: string): Promise<void>;
  compressImage(image: Blob, maxWidth?: number): Promise<Blob>;
}

class ReceiptStorageService implements IReceiptStorageService {
  private readonly BUCKET_NAME = 'receipts';
  private readonly MAX_WIDTH = 800;
  private readonly JPEG_QUALITY = 0.85;

  /**
   * Upload receipt image to Supabase Storage
   * Compresses image before upload and generates unique filename
   */
  async uploadReceipt(image: Blob, householdId: string, expenseId: string): Promise<string> {
    try {
      // Validate inputs
      if (!householdId || !expenseId) {
        throw new Error('Household ID and Expense ID are required');
      }

      // Compress image before upload
      const compressedImage = await this.compressImage(image, this.MAX_WIDTH);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = this.getFileExtension(compressedImage.type);
      const filename = `${expenseId}_${timestamp}.${extension}`;
      
      // Build storage path: household_id/expense_id/filename
      const filePath = `${householdId}/${expenseId}/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, compressedImage, {
          contentType: compressedImage.type,
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        throw new Error(`Failed to upload receipt: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      throw new Error(`Failed to upload receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete receipt image from Supabase Storage
   */
  async deleteReceipt(receiptUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(receiptUrl);

      if (!filePath) {
        throw new Error('Invalid receipt URL');
      }

      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete receipt: ${error.message}`);
      }
    } catch (error) {
      // Log error but don't throw - deletion failures shouldn't block expense deletion
      console.error('Failed to delete receipt:', error);
    }
  }

  /**
   * Compress image to reduce file size
   * Resizes to max width while maintaining aspect ratio
   */
  async compressImage(image: Blob, maxWidth: number = this.MAX_WIDTH): Promise<Blob> {
    try {
      // Create image element
      const img = new Image();
      const imageUrl = URL.createObjectURL(image);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      // Create canvas for compression
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Clean up
      URL.revokeObjectURL(imageUrl);

      // Convert canvas to blob with compression
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          this.JPEG_QUALITY
        );
      });
    } catch (error) {
      throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    return mimeToExt[mimeType] || 'jpg';
  }

  /**
   * Extract file path from Supabase Storage URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      // URL format: https://{project}.supabase.co/storage/v1/object/public/receipts/{path}
      const match = url.match(/\/receipts\/(.+)$/);
      return match?.[1] ?? null;
    } catch (error) {
      console.error('Failed to extract file path from URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const receiptStorageService = new ReceiptStorageService();
export default receiptStorageService;
