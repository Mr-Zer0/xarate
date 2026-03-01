import { describe, it, expect } from 'vitest';
import { ocrService } from './OCRService';

describe('OCRService', () => {
  describe('extractAmount', () => {
    it('should extract amount from total line', () => {
      const text = 'Total: $45.99';
      const amount = ocrService.extractAmount(text);
      expect(amount).toBe(45.99);
    });

    it('should extract amount with comma decimal separator', () => {
      const text = 'Total: 45,99';
      const amount = ocrService.extractAmount(text);
      expect(amount).toBe(45.99);
    });

    it('should extract largest amount when multiple found', () => {
      const text = 'Subtotal: $40.00\nTax: $5.99\nTotal: $45.99';
      const amount = ocrService.extractAmount(text);
      expect(amount).toBe(45.99);
    });

    it('should return null when no amount found', () => {
      const text = 'No amounts here';
      const amount = ocrService.extractAmount(text);
      expect(amount).toBeNull();
    });

    it('should extract amount with currency code', () => {
      const text = 'Total: 45.99 USD';
      const amount = ocrService.extractAmount(text);
      expect(amount).toBe(45.99);
    });
  });

  describe('extractDate', () => {
    it('should extract date in MM/DD/YYYY format', () => {
      const text = 'Date: 03/15/2024';
      const date = ocrService.extractDate(text);
      expect(date).toBeInstanceOf(Date);
      expect(date?.getMonth()).toBe(2); // March (0-indexed)
    });

    it('should extract date in Month DD, YYYY format', () => {
      const text = 'March 15, 2024';
      const date = ocrService.extractDate(text);
      expect(date).toBeInstanceOf(Date);
      expect(date?.getMonth()).toBe(2); // March
    });

    it('should return null when no date found', () => {
      const text = 'No dates here';
      const date = ocrService.extractDate(text);
      expect(date).toBeNull();
    });

    it('should not extract future dates', () => {
      const futureYear = new Date().getFullYear() + 10;
      const text = `Date: 01/01/${futureYear}`;
      const date = ocrService.extractDate(text);
      expect(date).toBeNull();
    });
  });

  describe('extractMerchant', () => {
    it('should extract merchant name from first line', () => {
      const text = 'Walmart Supercenter\n123 Main St\nTotal: $45.99';
      const merchant = ocrService.extractMerchant(text);
      expect(merchant).toBe('Walmart Supercenter');
    });

    it('should skip lines with mostly numbers', () => {
      const text = '123456789\nTarget Store\nTotal: $45.99';
      const merchant = ocrService.extractMerchant(text);
      expect(merchant).toBe('Target Store');
    });

    it('should skip common receipt words', () => {
      const text = 'RECEIPT\nStarbucks Coffee\nTotal: $5.99';
      const merchant = ocrService.extractMerchant(text);
      expect(merchant).toBe('Starbucks Coffee');
    });

    it('should return null for empty text', () => {
      const text = '';
      const merchant = ocrService.extractMerchant(text);
      expect(merchant).toBeNull();
    });

    it('should skip very short lines', () => {
      const text = 'AB\nWalmart\nTotal: $45.99';
      const merchant = ocrService.extractMerchant(text);
      expect(merchant).toBe('Walmart');
    });
  });

  describe('selectFromGallery', () => {
    it('should return a promise', () => {
      // This test just verifies the method exists and returns a promise
      // Actual file selection requires user interaction
      const promise = ocrService.selectFromGallery();
      expect(promise).toBeInstanceOf(Promise);
      
      // Cancel the promise to avoid hanging test
      promise.catch(() => {
        // Expected to fail without user interaction
      });
    });
  });
});
