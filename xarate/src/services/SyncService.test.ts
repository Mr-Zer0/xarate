// SyncService tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncService } from './SyncService';
import { db } from '../db/database';
import { supabase } from './supabase';
import type { Expense, Category, User, SyncOperation } from '../types/models';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

// Mock database
vi.mock('../db/database', () => ({
  db: {
    expenses: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      bulkPut: vi.fn(),
      toArray: vi.fn(),
    },
    categories: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      bulkPut: vi.fn(),
      toArray: vi.fn(),
    },
    users: {
      get: vi.fn(),
      put: vi.fn(),
      bulkPut: vi.fn(),
      toArray: vi.fn(),
    },
    settings: {
      get: vi.fn(),
      put: vi.fn(),
    },
    sync_queue: {
      put: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(() => ({
        toArray: vi.fn(),
      })),
      toArray: vi.fn(),
    },
  },
}));

describe('SyncService', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = new SyncService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    syncService.cleanup();
  });

  describe('syncExpenses', () => {
    it('should sync expenses from Supabase to IndexedDB', async () => {
      const mockExpenses = [
        {
          id: '1',
          household_id: 'h1',
          user_id: 'u1',
          category_id: 'c1',
          amount: '100.00',
          description: 'Test expense',
          date: '2024-01-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        order: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      mockQuery.order.mockResolvedValue({
        data: mockExpenses,
        error: null,
      });

      (db.settings.get as any).mockResolvedValue(null);
      (db.expenses.get as any).mockResolvedValue(null);
      (db.expenses.put as any).mockResolvedValue(undefined);
      (db.settings.put as any).mockResolvedValue(undefined);

      await syncService.syncExpenses();

      expect(supabase.from).toHaveBeenCalledWith('expenses');
      expect(db.expenses.put).toHaveBeenCalled();
      expect(db.settings.put).toHaveBeenCalledWith({
        key: 'lastExpenseSync',
        value: expect.any(String),
      });
    });

    it('should handle sync errors gracefully', async () => {
      const mockError = { message: 'Network error' };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      (db.settings.get as any).mockResolvedValue(null);

      await expect(syncService.syncExpenses()).rejects.toThrow('Failed to sync expenses');
    });
  });

  describe('resolveConflict', () => {
    it('should use remote version when remote is newer', () => {
      const localItem = {
        id: '1',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        syncStatus: 'pending',
      };

      const remoteItem = {
        id: '1',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        syncStatus: 'synced',
      };

      const resolved = syncService.resolveConflict(localItem, remoteItem);

      expect(resolved.updatedAt).toEqual(remoteItem.updatedAt);
      expect(resolved.syncStatus).toBe('synced');
    });

    it('should keep local version when local is newer', () => {
      const localItem = {
        id: '1',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        syncStatus: 'pending',
      };

      const remoteItem = {
        id: '1',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        syncStatus: 'synced',
      };

      const resolved = syncService.resolveConflict(localItem, remoteItem);

      expect(resolved.updatedAt).toEqual(localItem.updatedAt);
      expect(resolved.syncStatus).toBe('conflict');
    });
  });

  describe('queueOperation', () => {
    it('should add operation to sync queue', () => {
      const operation: SyncOperation = {
        id: '1',
        type: 'create',
        entity: 'expense',
        data: { id: '1', amount: 100 },
        timestamp: new Date(),
        retryCount: 0,
      };

      (db.sync_queue.put as any).mockResolvedValue(undefined);

      syncService.queueOperation(operation);

      // Wait a bit for async operation
      setTimeout(() => {
        expect(db.sync_queue.put).toHaveBeenCalledWith(operation);
      }, 100);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      const mockOperations: SyncOperation[] = [
        {
          id: '1',
          type: 'create',
          entity: 'expense',
          data: {},
          timestamp: new Date(),
          retryCount: 0,
        },
        {
          id: '2',
          type: 'update',
          entity: 'category',
          data: {},
          timestamp: new Date(),
          retryCount: 5,
        },
      ];

      (db.sync_queue.toArray as any).mockResolvedValue(mockOperations);
      (db.settings.get as any).mockResolvedValue({
        key: 'lastSync',
        value: '2024-01-01T00:00:00Z',
      });

      const status = await syncService.getQueueStatus();

      expect(status.pending).toBe(1);
      expect(status.failed).toBe(1);
      expect(status.lastSync).toBeInstanceOf(Date);
    });

    it('should handle errors and return default status', async () => {
      (db.sync_queue.toArray as any).mockRejectedValue(new Error('Database error'));

      const status = await syncService.getQueueStatus();

      expect(status.pending).toBe(0);
      expect(status.failed).toBe(0);
      expect(status.lastSync).toBeNull();
    });
  });

  describe('subscribeToExpenses', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };

      (supabase.channel as any).mockReturnValue(mockChannel);

      const callback = vi.fn();
      const unsubscribe = syncService.subscribeToExpenses(callback);

      expect(supabase.channel).toHaveBeenCalledWith('expenses-changes');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToCategories', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };

      (supabase.channel as any).mockReturnValue(mockChannel);

      const callback = vi.fn();
      const unsubscribe = syncService.subscribeToCategories(callback);

      expect(supabase.channel).toHaveBeenCalledWith('categories-changes');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });
});
