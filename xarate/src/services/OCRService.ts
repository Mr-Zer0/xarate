import { createWorker, Worker } from 'tesseract.js';
import { receiptStorageService } from './ReceiptStorageService';

export interface OCRResult {
  text: string;
  confidence: number;
  amount?: number;
  date?: Date;
  merchant?: string;
  imageBlob?: Blob; // Original image blob for storage
}

export interface IOCRService {
  captureFromCamera(): Promise<Blob>;
  selectFromGallery(): Promise<Blob>;
  processReceipt(image: Blob): Promise<OCRResult>;
  preprocessImage(image: Blob): Promise<Blob>;
  extractAmount(text: string): number | null;
  extractDate(text: string): Date | null;
  extractMerchant(text: string): string | null;
  uploadReceiptImage(image: Blob, householdId: string, expenseId: string): Promise<string>;
}

export interface IReceiptStorageService {
  uploadReceipt(image: Blob, householdId: string, expenseId: string): Promise<string>;
  deleteReceipt(receiptUrl: string): Promise<void>;
  compressImage(image: Blob, maxWidth?: number): Promise<Blob>;
}

class OCRService implements IOCRService {
  private worker: Worker | null = null;

  /**
   * Initialize Tesseract worker
   */
  private async initWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    try {
      this.worker = await createWorker('eng');
      return this.worker;
    } catch (error) {
      throw new Error(`Failed to initialize OCR worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Capture image from device camera
   */
  async captureFromCamera(): Promise<Blob> {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Stop camera stream
      stream.getTracks().forEach((track) => track.stop());

      // Convert canvas to blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture image from camera'));
          }
        }, 'image/jpeg', 0.9);
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access to scan receipts.');
      }
      throw new Error(`Failed to capture from camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select image from gallery/file system
   */
  async selectFromGallery(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      try {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];

          if (file) {
            resolve(file);
          } else {
            reject(new Error('No file selected'));
          }
        };

        input.oncancel = () => {
          reject(new Error('File selection cancelled'));
        };

        // Trigger file picker
        input.click();
      } catch (error) {
        reject(new Error(`Failed to select from gallery: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(image: Blob): Promise<Blob> {
    try {
      // Create image element
      const img = new Image();
      const imageUrl = URL.createObjectURL(image);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // Create canvas for preprocessing
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and adjust contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale conversion using luminosity method
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Contrast adjustment (increase contrast)
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const adjusted = factor * (gray - 128) + 128;

        // Clamp values
        const final = Math.max(0, Math.min(255, adjusted));

        data[i] = final;     // R
        data[i + 1] = final; // G
        data[i + 2] = final; // B
        // Alpha channel (i + 3) remains unchanged
      }

      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);

      // Clean up
      URL.revokeObjectURL(imageUrl);

      // Convert canvas to blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to preprocess image'));
          }
        }, 'image/jpeg', 0.95);
      });
    } catch (error) {
      throw new Error(`Failed to preprocess image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process receipt image with OCR
   */
  async processReceipt(image: Blob): Promise<OCRResult> {
    try {
      // Preprocess image for better OCR
      const preprocessed = await this.preprocessImage(image);

      // Initialize worker
      const worker = await this.initWorker();

      // Convert blob to image URL
      const imageUrl = URL.createObjectURL(preprocessed);

      // Perform OCR
      const { data } = await worker.recognize(imageUrl);

      // Clean up
      URL.revokeObjectURL(imageUrl);

      // Extract structured data
      const text = data.text;
      const confidence = data.confidence / 100; // Convert to 0-1 range

      const amount = this.extractAmount(text);
      const date = this.extractDate(text);
      const merchant = this.extractMerchant(text);

      return {
        text,
        confidence,
        amount: amount ?? undefined,
        date: date ?? undefined,
        merchant: merchant ?? undefined,
        imageBlob: image, // Include original image for storage
      };
    } catch (error) {
      throw new Error(`Failed to process receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload receipt image to Supabase Storage
   */
  async uploadReceiptImage(image: Blob, householdId: string, expenseId: string): Promise<string> {
    try {
      return await receiptStorageService.uploadReceipt(image, householdId, expenseId);
    } catch (error) {
      throw new Error(`Failed to upload receipt image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract amount from OCR text
   */
  extractAmount(text: string): number | null {
    try {
      // Common patterns for amounts on receipts
      const patterns = [
        /total[:\s]*\$?\s*(\d+[.,]\d{2})/i,           // "Total: $12.34" or "Total 12.34"
        /amount[:\s]*\$?\s*(\d+[.,]\d{2})/i,          // "Amount: $12.34"
        /balance[:\s]*\$?\s*(\d+[.,]\d{2})/i,         // "Balance: $12.34"
        /\$\s*(\d+[.,]\d{2})/g,                       // "$12.34"
        /(\d+[.,]\d{2})\s*(?:usd|eur|gbp|cad)/i,      // "12.34 USD"
      ];

      const amounts: number[] = [];

      for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const amountStr = match[1];
          if (!amountStr) continue;
          
          const normalizedAmount = amountStr.replace(',', '.');
          const amount = parseFloat(normalizedAmount);
          if (!isNaN(amount) && amount > 0) {
            amounts.push(amount);
          }
        }
      }

      // Return the largest amount found (likely the total)
      return amounts.length > 0 ? Math.max(...amounts) : null;
    } catch (error) {
      console.error('Error extracting amount:', error);
      return null;
    }
  }

  /**
   * Extract date from OCR text
   */
  extractDate(text: string): Date | null {
    try {
      // Common date patterns
      const patterns = [
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,  // MM/DD/YYYY or DD/MM/YYYY
        /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,    // YYYY/MM/DD
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i, // Month DD, YYYY
        /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,   // DD Month YYYY
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            // Try to parse the matched date
            const dateStr = match[0];
            const parsed = new Date(dateStr);
            
            // Check if date is valid and not in the future
            if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
              return parsed;
            }

            // Try alternative parsing for DD/MM/YYYY format
            if (match[1] && match[2] && match[3]) {
              const part1 = match[1];
              const part2 = match[2];
              const part3 = match[3];
              
              // Try MM/DD/YYYY
              const date1 = new Date(`${part1}/${part2}/${part3}`);
              if (!isNaN(date1.getTime()) && date1 <= new Date()) {
                return date1;
              }

              // Try DD/MM/YYYY
              const date2 = new Date(`${part2}/${part1}/${part3}`);
              if (!isNaN(date2.getTime()) && date2 <= new Date()) {
                return date2;
              }
            }
          } catch {
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting date:', error);
      return null;
    }
  }

  /**
   * Extract merchant name from OCR text
   */
  extractMerchant(text: string): string | null {
    try {
      // Split text into lines
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      if (lines.length === 0) {
        return null;
      }

      // The merchant name is typically in the first few lines
      // Look for lines that are likely to be merchant names (not numbers, dates, or common receipt words)
      const excludePatterns = [
        /^\d+$/,                                      // Pure numbers
        /^[\d\s\-\(\)]+$/,                           // Phone numbers
        /receipt/i,
        /invoice/i,
        /total/i,
        /subtotal/i,
        /tax/i,
        /date/i,
        /time/i,
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,      // Dates
      ];

      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        
        if (!line) continue;
        
        // Skip if line matches exclude patterns
        if (excludePatterns.some(pattern => pattern.test(line))) {
          continue;
        }

        // Skip very short lines (likely not merchant name)
        if (line.length < 3) {
          continue;
        }

        // Skip lines with mostly numbers
        const digitCount = (line.match(/\d/g) || []).length;
        if (digitCount / line.length > 0.5) {
          continue;
        }

        // This line is likely the merchant name
        return line;
      }

      // Fallback: return first line if nothing else found
      const firstLine = lines[0];
      return firstLine ?? null;
    } catch (error) {
      console.error('Error extracting merchant:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService();
export default ocrService;
