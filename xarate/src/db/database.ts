import Dexie, { Table } from 'dexie';
import type {
  User,
  Household,
  Category,
  Expense,
  SyncOperation,
} from '../types';

/**
 * Settings interface for storing app configuration
 */
export interface Settings {
  key: string;
  value: any;
}

/**
 * ExpenseTrackerDB - IndexedDB database for offline-first expense tracking
 * 
 * This database mirrors the Supabase schema and provides local storage
 * for offline functionality and fast data access.
 */
export class ExpenseTrackerDB extends Dexie {
  // Declare tables
  households!: Table<Household, string>;
  users!: Table<User, string>;
  categories!: Table<Category, string>;
  expenses!: Table<Expense, string>;
  settings!: Table<Settings, string>;
  sync_queue!: Table<SyncOperation, string>;

  constructor() {
    super('ExpenseTrackerDB');

    // Define database schema
    this.version(1).stores({
      // Households table
      households: 'id, name, createdAt, updatedAt',

      // Users table with indexes
      users: 'id, email, name, householdId, createdAt, updatedAt',

      // Categories table with indexes
      categories: 'id, householdId, name, isDefault, createdAt, updatedAt',

      // Expenses table with compound indexes for efficient querying
      expenses: `
        id,
        householdId,
        userId,
        categoryId,
        date,
        createdAt,
        updatedAt,
        syncStatus,
        [householdId+date],
        [userId+date],
        [categoryId+date]
      `.replace(/\s+/g, ' ').trim(),

      // Settings table for app configuration
      settings: 'key',

      // Sync queue for offline operations
      sync_queue: 'id, type, entity, timestamp, retryCount, [entity+type]',
    });

    // Map tables to classes for better type support
    this.households.mapToClass(HouseholdEntity);
    this.users.mapToClass(UserEntity);
    this.categories.mapToClass(CategoryEntity);
    this.expenses.mapToClass(ExpenseEntity);
  }

  /**
   * Initialize the database and perform any necessary setup
   */
  async initialize(): Promise<void> {
    try {
      // Open the database
      await this.open();
      
      console.log('ExpenseTrackerDB initialized successfully');
      
      // Check if this is first run
      const isFirstRun = await this.isFirstRun();
      
      if (isFirstRun) {
        console.log('First run detected, performing initial setup');
        await this.performFirstRunSetup();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Check if this is the first time the database is being used
   */
  private async isFirstRun(): Promise<boolean> {
    const setting = await this.settings.get('initialized');
    return !setting;
  }

  /**
   * Perform first-run setup tasks
   */
  private async performFirstRunSetup(): Promise<void> {
    // Mark database as initialized
    await this.settings.put({
      key: 'initialized',
      value: true,
    });

    // Set initial sync timestamp
    await this.settings.put({
      key: 'lastSync',
      value: null,
    });

    console.log('First run setup completed');
  }

  /**
   * Clear all data from the database (useful for logout or reset)
   */
  async clearAllData(): Promise<void> {
    await this.transaction('rw', [
      this.households,
      this.users,
      this.categories,
      this.expenses,
      this.sync_queue,
    ], async () => {
      await this.households.clear();
      await this.users.clear();
      await this.categories.clear();
      await this.expenses.clear();
      await this.sync_queue.clear();
    });

    console.log('All data cleared from database');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    households: number;
    users: number;
    categories: number;
    expenses: number;
    syncQueue: number;
  }> {
    return {
      households: await this.households.count(),
      users: await this.users.count(),
      categories: await this.categories.count(),
      expenses: await this.expenses.count(),
      syncQueue: await this.sync_queue.count(),
    };
  }

  /**
   * Export all data (useful for backup)
   */
  async exportData(): Promise<{
    households: Household[];
    users: User[];
    categories: Category[];
    expenses: Expense[];
  }> {
    return {
      households: await this.households.toArray(),
      users: await this.users.toArray(),
      categories: await this.categories.toArray(),
      expenses: await this.expenses.toArray(),
    };
  }

  /**
   * Import data (useful for restore)
   */
  async importData(data: {
    households?: Household[];
    users?: User[];
    categories?: Category[];
    expenses?: Expense[];
  }): Promise<void> {
    await this.transaction('rw', [
      this.households,
      this.users,
      this.categories,
      this.expenses,
    ], async () => {
      if (data.households) {
        await this.households.bulkPut(data.households);
      }
      if (data.users) {
        await this.users.bulkPut(data.users);
      }
      if (data.categories) {
        await this.categories.bulkPut(data.categories);
      }
      if (data.expenses) {
        await this.expenses.bulkPut(data.expenses);
      }
    });

    console.log('Data imported successfully');
  }
}

/**
 * Entity classes for better type support and potential future methods
 */
class HouseholdEntity implements Household {
  id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

class UserEntity implements User {
  id!: string;
  email!: string;
  name!: string;
  avatar?: string;
  color!: string;
  householdId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

class CategoryEntity implements Category {
  id!: string;
  householdId!: string;
  name!: string;
  icon?: string;
  color!: string;
  isDefault!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

class ExpenseEntity implements Expense {
  id!: string;
  householdId!: string;
  userId!: string;
  amount!: number;
  description!: string;
  categoryId!: string;
  date!: Date;
  receiptImageUrl?: string;
  ocrData?: any;
  createdAt!: Date;
  updatedAt!: Date;
  syncStatus!: 'synced' | 'pending' | 'conflict';
}

// Create and export a singleton instance
export const db = new ExpenseTrackerDB();
