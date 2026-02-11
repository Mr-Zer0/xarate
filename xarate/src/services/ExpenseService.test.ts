// Basic tests for ExpenseService
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpenseService } from './ExpenseService';
import type { Expense } from '../types/models';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

// Mock IndexedDB
vi.mock('../db/database', () => ({
  db: {
    expenses: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      bulkPut: vi.fn(),
      toArray: vi.fn(() => Promise.resolve([])),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          filter: vi.fn(() => ({
            filter: vi.fn(() => ({
              offset: vi.fn(() => ({
                limit: vi.fn(() => ({
                  toArray: vi.fn(() => Promise.resolve([])),
                })),
              })),
              toArray: vi.fn(() => Promise.resolve([])),
            })),
            offset: vi.fn(() => ({
              limit: vi.fn(() => ({
                toArray: vi.fn(() => Promise.resolve([])),
              })),
            })),
            toArray: vi.fn(() => Promise.resolve([])),
          })),
          offset: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn(() => Promise.resolve([])),
            })),
          })),
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    categories: {
      toArray: vi.fn(() => Promise.resolve([])),
    },
    users: {
      toArray: vi.fn(() => Promise.resolve([])),
    },
  },
}));

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(() => {
    service = new ExpenseService();
    vi.clearAllMocks();
  });

  describe('createExpense', () => {
    it('should validate required fields', async () => {
      const invalidExpense = {
        householdId: 'household-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: 0, // Invalid
        description: '',
        date: new Date(),
        syncStatus: 'pending' as const,
      };

      await expect(service.createExpense(invalidExpense)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate description', async () => {
      const invalidExpense = {
        householdId: 'household-1',
        userId: 'user-1',
        categoryId: 'category-1',
        amount: 100,
        description: '', // Invalid
        date: new Date(),
        syncStatus: 'pending' as const,
      };

      await expect(service.createExpense(invalidExpense)).rejects.toThrow('Description is required');
    });
  });

  describe('getTotalAmount', () => {
    it('should return 0 for empty expense list', async () => {
      const total = await service.getTotalAmount();
      expect(total).toBe(0);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return empty array for no expenses', async () => {
      const breakdown = await service.getCategoryBreakdown();
      expect(breakdown).toEqual([]);
    });
  });

  describe('getUserBreakdown', () => {
    it('should return empty array for no expenses', async () => {
      const breakdown = await service.getUserBreakdown();
      expect(breakdown).toEqual([]);
    });
  });
});
