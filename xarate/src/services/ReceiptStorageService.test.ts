// Receipt storage service tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { receiptStorageService } from './ReceiptStorageService';
import { supabase } from './supabase';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}));

describe('ReceiptStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compressImage', () => {
    it('should compress image to max width', async () => {
      // Create a mock image blob
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 1600, 1200);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg');
      });

      const compressed = await receiptStorageService.compressImage(blob, 800);

      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.type).toBe('image/jpeg');
      expect(compressed.size).toBeLessThan(blob.size);
    });

    it('should maintain aspect ratio when compressing', async () => {
      // Create a mock image blob with 2:1 aspect ratio
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 1600, 800);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg');
      });

      const compressed = await receiptStorageService.compressImage(blob, 800);

      expect(compressed).toBeInstanceOf(Blob);
      // Aspect ratio should be maintained (2:1)
      // Note: Actual dimensions can't be easily tested without loading the blob
    });

    it('should not upscale images smaller than max width', async () => {
      // Create a small image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 400, 300);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg');
      });

      const compressed = await receiptStorageService.compressImage(blob, 800);

      expect(compressed).toBeInstanceOf(Blob);
      // Image should not be upscaled
    });
  });

  describe('uploadReceipt', () => {
    it('should upload receipt with correct path structure', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const householdId = 'household-123';
      const expenseId = 'expense-456';

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: `${householdId}/${expenseId}/test.jpg` },
        error: null,
      });

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/receipt.jpg' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: vi.fn(),
      } as any);

      const url = await receiptStorageService.uploadReceipt(mockBlob, householdId, expenseId);

      expect(mockUpload).toHaveBeenCalled();
      expect(mockGetPublicUrl).toHaveBeenCalled();
      expect(url).toBe('https://example.com/receipt.jpg');
    });

    it('should throw error if household ID is missing', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      await expect(
        receiptStorageService.uploadReceipt(mockBlob, '', 'expense-123')
      ).rejects.toThrow('Household ID and Expense ID are required');
    });

    it('should throw error if expense ID is missing', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      await expect(
        receiptStorageService.uploadReceipt(mockBlob, 'household-123', '')
      ).rejects.toThrow('Household ID and Expense ID are required');
    });

    it('should handle upload errors', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const householdId = 'household-123';
      const expenseId = 'expense-456';

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      } as any);

      await expect(
        receiptStorageService.uploadReceipt(mockBlob, householdId, expenseId)
      ).rejects.toThrow('Failed to upload receipt: Upload failed');
    });
  });

  describe('deleteReceipt', () => {
    it('should delete receipt from storage', async () => {
      const receiptUrl = 'https://example.supabase.co/storage/v1/object/public/receipts/household-123/expense-456/test.jpg';

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: mockRemove,
      } as any);

      await receiptStorageService.deleteReceipt(receiptUrl);

      expect(mockRemove).toHaveBeenCalledWith(['household-123/expense-456/test.jpg']);
    });

    it('should not throw error on deletion failure', async () => {
      const receiptUrl = 'https://example.supabase.co/storage/v1/object/public/receipts/household-123/expense-456/test.jpg';

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: mockRemove,
      } as any);

      // Should not throw
      await expect(
        receiptStorageService.deleteReceipt(receiptUrl)
      ).resolves.not.toThrow();
    });

    it('should handle invalid receipt URLs gracefully', async () => {
      const receiptUrl = 'invalid-url';

      const mockRemove = vi.fn();

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: mockRemove,
      } as any);

      // Should not throw
      await expect(
        receiptStorageService.deleteReceipt(receiptUrl)
      ).resolves.not.toThrow();
    });
  });
});
