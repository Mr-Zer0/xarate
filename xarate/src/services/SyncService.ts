// Sync service for Supabase synchronization with offline-first support
import { supabase } from './supabase';
import { db } from '../db/database';
import type { ISyncService } from '../types/services';
import type { Expense, Category, User, SyncOperation, QueueStatus } from '../types/models';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * SyncService handles synchronization between IndexedDB and Supabase
 * Implements offline-first strategy with real-time updates and conflict resolution
 */
export class SyncService implements ISyncService {
  private expenseSubscription: RealtimeChannel | null = null;
  private categorySubscription: RealtimeChannel | null = null;
  private userSubscription: RealtimeChannel | null = null;
  private isProcessingQueue = false;
  private syncInProgress = false;

  /**
   * Sync expenses from Supabase to IndexedDB
   */
  async syncExpenses(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return;
    }

    try {
      this.syncInProgress = true;

      // Get last sync timestamp
      const lastSyncSetting = await db.settings.get('lastExpenseSync');
      const lastSync = lastSyncSetting?.value ? new Date(lastSyncSetting.value) : null;

      // Build query
      let query = supabase
        .from('expenses')
        .select('*')
        .order('updated_at', { ascending: false });

      // Only fetch expenses updated since last sync
      if (lastSync) {
        query = query.gt('updated_at', lastSync.toISOString());
      }

      const { data: expensesData, error: expensesError } = await query;

      if (expensesError) {
        throw new Error(`Failed to sync expenses: ${expensesError.message}`);
      }

      if (expensesData && expensesData.length > 0) {
        // Map and save to IndexedDB
        const expenses = expensesData.map(exp => this.mapExpenseFromDb(exp));

        for (const expense of expenses) {
          // Check for conflicts
          const localExpense = await db.expenses.get(expense.id);
          
          if (localExpense && localExpense.syncStatus === 'pending') {
            // Conflict: local changes not yet synced
            const resolved = this.resolveConflict(localExpense, expense);
            await db.expenses.put(resolved);
          } else {
            // No conflict, update local
            await db.expenses.put(expense);
          }
        }

        console.log(`Synced ${expenses.length} expenses from Supabase`);
      }

      // Update last sync timestamp
      await db.settings.put({
        key: 'lastExpenseSync',
        value: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync expenses:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync categories from Supabase to IndexedDB
   */
  async syncCategories(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return;
    }

    try {
      this.syncInProgress = true;

      // Get last sync timestamp
      const lastSyncSetting = await db.settings.get('lastCategorySync');
      const lastSync = lastSyncSetting?.value ? new Date(lastSyncSetting.value) : null;

      // Build query
      let query = supabase
        .from('categories')
        .select('*')
        .order('updated_at', { ascending: false });

      // Only fetch categories updated since last sync
      if (lastSync) {
        query = query.gt('updated_at', lastSync.toISOString());
      }

      const { data: categoriesData, error: categoriesError } = await query;

      if (categoriesError) {
        throw new Error(`Failed to sync categories: ${categoriesError.message}`);
      }

      if (categoriesData && categoriesData.length > 0) {
        // Map and save to IndexedDB
        const categories = categoriesData.map(cat => this.mapCategoryFromDb(cat));

        for (const category of categories) {
          // Check for conflicts
          const localCategory = await db.categories.get(category.id);
          
          if (localCategory) {
            const resolved = this.resolveConflict(localCategory, category);
            await db.categories.put(resolved);
          } else {
            await db.categories.put(category);
          }
        }

        console.log(`Synced ${categories.length} categories from Supabase`);
      }

      // Update last sync timestamp
      await db.settings.put({
        key: 'lastCategorySync',
        value: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync categories:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync users from Supabase to IndexedDB
   */
  async syncUsers(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return;
    }

    try {
      this.syncInProgress = true;

      // Get last sync timestamp
      const lastSyncSetting = await db.settings.get('lastUserSync');
      const lastSync = lastSyncSetting?.value ? new Date(lastSyncSetting.value) : null;

      // Build query
      let query = supabase
        .from('users')
        .select('*')
        .order('updated_at', { ascending: false });

      // Only fetch users updated since last sync
      if (lastSync) {
        query = query.gt('updated_at', lastSync.toISOString());
      }

      const { data: usersData, error: usersError } = await query;

      if (usersError) {
        throw new Error(`Failed to sync users: ${usersError.message}`);
      }

      if (usersData && usersData.length > 0) {
        // Map and save to IndexedDB
        const users = usersData.map(user => this.mapUserFromDb(user));

        for (const user of users) {
          // Check for conflicts
          const localUser = await db.users.get(user.id);
          
          if (localUser) {
            const resolved = this.resolveConflict(localUser, user);
            await db.users.put(resolved);
          } else {
            await db.users.put(user);
          }
        }

        console.log(`Synced ${users.length} users from Supabase`);
      }

      // Update last sync timestamp
      await db.settings.put({
        key: 'lastUserSync',
        value: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync users:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync all entities (expenses, categories, users)
   */
  async syncAll(): Promise<void> {
    try {
      await this.syncUsers();
      await this.syncCategories();
      await this.syncExpenses();
      
      // Process any queued operations
      await this.processQueue();

      console.log('Full sync completed successfully');
    } catch (error) {
      console.error('Failed to sync all:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time expense updates
   */
  subscribeToExpenses(callback: (expense: Expense) => void): () => void {
    // Unsubscribe from existing subscription
    if (this.expenseSubscription) {
      this.expenseSubscription.unsubscribe();
    }

    // Create new subscription
    this.expenseSubscription = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        async (payload) => {
          console.log('Expense change received:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const expense = this.mapExpenseFromDb(payload.new);
            
            // Update IndexedDB
            await db.expenses.put(expense);
            
            // Notify callback
            callback(expense);
          } else if (payload.eventType === 'DELETE') {
            // Delete from IndexedDB
            await db.expenses.delete(payload.old.id);
            
            // Notify callback with deleted expense
            const deletedExpense = this.mapExpenseFromDb(payload.old);
            deletedExpense.syncStatus = 'synced';
            callback(deletedExpense);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.expenseSubscription) {
        this.expenseSubscription.unsubscribe();
        this.expenseSubscription = null;
      }
    };
  }

  /**
   * Subscribe to real-time category updates
   */
  subscribeToCategories(callback: (category: Category) => void): () => void {
    // Unsubscribe from existing subscription
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }

    // Create new subscription
    this.categorySubscription = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        async (payload) => {
          console.log('Category change received:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const category = this.mapCategoryFromDb(payload.new);
            
            // Update IndexedDB
            await db.categories.put(category);
            
            // Notify callback
            callback(category);
          } else if (payload.eventType === 'DELETE') {
            // Delete from IndexedDB
            await db.categories.delete(payload.old.id);
            
            // Notify callback with deleted category
            const deletedCategory = this.mapCategoryFromDb(payload.old);
            callback(deletedCategory);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.categorySubscription) {
        this.categorySubscription.unsubscribe();
        this.categorySubscription = null;
      }
    };
  }

  /**
   * Resolve conflicts using last-write-wins strategy
   * Compares updatedAt timestamps and keeps the most recent version
   */
  resolveConflict(localItem: any, remoteItem: any): any {
    const localTime = new Date(localItem.updatedAt).getTime();
    const remoteTime = new Date(remoteItem.updatedAt).getTime();

    if (remoteTime > localTime) {
      // Remote is newer, use remote
      console.log('Conflict resolved: using remote version (newer)');
      return { ...remoteItem, syncStatus: 'synced' };
    } else {
      // Local is newer or same, keep local but mark as conflict
      console.log('Conflict resolved: keeping local version (newer or same)');
      return { ...localItem, syncStatus: 'conflict' };
    }
  }

  /**
   * Queue an operation for later sync (used when offline)
   */
  queueOperation(operation: SyncOperation): void {
    // Add to queue asynchronously
    db.sync_queue.put(operation).catch(error => {
      console.error('Failed to queue operation:', error);
    });
  }

  /**
   * Process queued operations and sync to Supabase
   */
  async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      console.log('Queue processing already in progress');
      return;
    }

    try {
      this.isProcessingQueue = true;

      // Get all queued operations, ordered by timestamp
      const operations = await db.sync_queue
        .orderBy('timestamp')
        .toArray();

      if (operations.length === 0) {
        console.log('No operations in queue');
        return;
      }

      console.log(`Processing ${operations.length} queued operations`);

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          
          // Remove from queue on success
          await db.sync_queue.delete(operation.id);
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          
          // Increment retry count
          operation.retryCount++;
          
          // Calculate exponential backoff delay
          const maxRetries = 5;
          if (operation.retryCount >= maxRetries) {
            console.error(`Operation ${operation.id} exceeded max retries, removing from queue`);
            await db.sync_queue.delete(operation.id);
          } else {
            // Update retry count in queue
            await db.sync_queue.put(operation);
            
            // Calculate delay: 2^retryCount seconds (1s, 2s, 4s, 8s, 16s)
            const delayMs = Math.pow(2, operation.retryCount) * 1000;
            console.log(`Will retry operation ${operation.id} after ${delayMs}ms`);
            
            // Schedule retry
            setTimeout(() => {
              this.processQueue();
            }, delayMs);
          }
        }
      }

      console.log('Queue processing completed');
    } catch (error) {
      console.error('Failed to process queue:', error);
      throw error;
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const allOperations = await db.sync_queue.toArray();
      const pending = allOperations.filter(op => op.retryCount < 5).length;
      const failed = allOperations.filter(op => op.retryCount >= 5).length;
      
      const lastSyncSetting = await db.settings.get('lastSync');
      const lastSync = lastSyncSetting?.value ? new Date(lastSyncSetting.value) : null;

      return {
        pending,
        failed,
        lastSync,
      };
    } catch (error) {
      console.error('Failed to get queue status:', error);
      return {
        pending: 0,
        failed: 0,
        lastSync: null,
      };
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    switch (operation.entity) {
      case 'expense':
        await this.processExpenseOperation(operation);
        break;
      case 'category':
        await this.processCategoryOperation(operation);
        break;
      case 'user':
        await this.processUserOperation(operation);
        break;
      default:
        throw new Error(`Unknown entity type: ${operation.entity}`);
    }
  }

  /**
   * Process expense operation
   */
  private async processExpenseOperation(operation: SyncOperation): Promise<void> {
    const expense = operation.data as Expense;

    switch (operation.type) {
      case 'create':
        await this.syncExpenseCreate(expense);
        break;
      case 'update':
        await this.syncExpenseUpdate(expense);
        break;
      case 'delete':
        await this.syncExpenseDelete(expense.id);
        break;
    }
  }

  /**
   * Process category operation
   */
  private async processCategoryOperation(operation: SyncOperation): Promise<void> {
    const category = operation.data as Category;

    switch (operation.type) {
      case 'create':
        await this.syncCategoryCreate(category);
        break;
      case 'update':
        await this.syncCategoryUpdate(category);
        break;
      case 'delete':
        await this.syncCategoryDelete(category.id);
        break;
    }
  }

  /**
   * Process user operation
   */
  private async processUserOperation(operation: SyncOperation): Promise<void> {
    const user = operation.data as User;

    switch (operation.type) {
      case 'update':
        await this.syncUserUpdate(user);
        break;
      default:
        // Users are typically created via auth, not synced
        console.log(`Skipping user ${operation.type} operation`);
    }
  }

  /**
   * Sync expense creation to Supabase
   */
  private async syncExpenseCreate(expense: Expense): Promise<void> {
    const dbExpense = {
      id: expense.id,
      household_id: expense.householdId,
      user_id: expense.userId,
      category_id: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      date: expense.date.toISOString().split('T')[0],
      receipt_image_url: expense.receiptImageUrl || null,
      ocr_data: expense.ocrData || null,
    };

    const { error } = await supabase
      .from('expenses')
      .insert(dbExpense);

    if (error) {
      throw new Error(`Failed to sync expense create: ${error.message}`);
    }

    // Update local sync status
    expense.syncStatus = 'synced';
    await db.expenses.put(expense);
  }

  /**
   * Sync expense update to Supabase
   */
  private async syncExpenseUpdate(expense: Expense): Promise<void> {
    const dbExpense = {
      household_id: expense.householdId,
      user_id: expense.userId,
      category_id: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      date: expense.date.toISOString().split('T')[0],
      receipt_image_url: expense.receiptImageUrl || null,
      ocr_data: expense.ocrData || null,
    };

    const { error } = await supabase
      .from('expenses')
      .update(dbExpense)
      .eq('id', expense.id);

    if (error) {
      throw new Error(`Failed to sync expense update: ${error.message}`);
    }

    // Update local sync status
    expense.syncStatus = 'synced';
    await db.expenses.put(expense);
  }

  /**
   * Sync expense deletion to Supabase
   */
  private async syncExpenseDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to sync expense delete: ${error.message}`);
    }
  }

  /**
   * Sync category creation to Supabase
   */
  private async syncCategoryCreate(category: Category): Promise<void> {
    const dbCategory = {
      id: category.id,
      household_id: category.householdId,
      name: category.name,
      icon: category.icon || null,
      color: category.color,
      is_default: category.isDefault,
    };

    const { error } = await supabase
      .from('categories')
      .insert(dbCategory);

    if (error) {
      throw new Error(`Failed to sync category create: ${error.message}`);
    }
  }

  /**
   * Sync category update to Supabase
   */
  private async syncCategoryUpdate(category: Category): Promise<void> {
    const dbCategory = {
      name: category.name,
      icon: category.icon || null,
      color: category.color,
    };

    const { error } = await supabase
      .from('categories')
      .update(dbCategory)
      .eq('id', category.id);

    if (error) {
      throw new Error(`Failed to sync category update: ${error.message}`);
    }
  }

  /**
   * Sync category deletion to Supabase
   */
  private async syncCategoryDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to sync category delete: ${error.message}`);
    }
  }

  /**
   * Sync user update to Supabase
   */
  private async syncUserUpdate(user: User): Promise<void> {
    const dbUser = {
      name: user.name,
      avatar: user.avatar || null,
      color: user.color,
    };

    const { error } = await supabase
      .from('users')
      .update(dbUser)
      .eq('id', user.id);

    if (error) {
      throw new Error(`Failed to sync user update: ${error.message}`);
    }
  }

  /**
   * Map database expense record to Expense model
   */
  private mapExpenseFromDb(dbExpense: any): Expense {
    const expense: Expense = {
      id: dbExpense.id as string,
      householdId: dbExpense.household_id as string,
      userId: dbExpense.user_id as string,
      categoryId: dbExpense.category_id as string,
      amount: parseFloat(dbExpense.amount as string),
      description: dbExpense.description as string,
      date: new Date(dbExpense.date as string),
      createdAt: new Date(dbExpense.created_at as string),
      updatedAt: new Date(dbExpense.updated_at as string),
      syncStatus: 'synced',
    };
    
    if (dbExpense.receipt_image_url) {
      expense.receiptImageUrl = dbExpense.receipt_image_url as string;
    }
    
    if (dbExpense.ocr_data) {
      expense.ocrData = dbExpense.ocr_data;
    }
    
    return expense;
  }

  /**
   * Map database category record to Category model
   */
  private mapCategoryFromDb(dbCategory: any): Category {
    const category: Category = {
      id: dbCategory.id as string,
      householdId: dbCategory.household_id as string,
      name: dbCategory.name as string,
      color: dbCategory.color as string,
      isDefault: dbCategory.is_default as boolean,
      createdAt: new Date(dbCategory.created_at as string),
      updatedAt: new Date(dbCategory.updated_at as string),
    };
    
    if (dbCategory.icon) {
      category.icon = dbCategory.icon as string;
    }
    
    return category;
  }

  /**
   * Map database user record to User model
   */
  private mapUserFromDb(dbUser: any): User {
    const user: User = {
      id: dbUser.id as string,
      email: dbUser.email as string,
      name: dbUser.name as string,
      color: dbUser.color as string,
      householdId: dbUser.household_id as string,
      createdAt: new Date(dbUser.created_at as string),
      updatedAt: new Date(dbUser.updated_at as string),
    };
    
    if (dbUser.avatar) {
      user.avatar = dbUser.avatar as string;
    }
    
    return user;
  }

  /**
   * Initialize sync service and start real-time subscriptions
   */
  async initialize(): Promise<void> {
    try {
      // Perform initial sync
      await this.syncAll();

      // Set up real-time subscriptions
      this.subscribeToExpenses((expense) => {
        console.log('Real-time expense update:', expense);
      });

      this.subscribeToCategories((category) => {
        console.log('Real-time category update:', category);
      });

      console.log('SyncService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SyncService:', error);
      // Don't throw - allow app to work offline
    }
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    if (this.expenseSubscription) {
      this.expenseSubscription.unsubscribe();
      this.expenseSubscription = null;
    }

    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
      this.categorySubscription = null;
    }

    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
      this.userSubscription = null;
    }

    console.log('SyncService cleaned up');
  }
}

// Export singleton instance
export const syncService = new SyncService();
