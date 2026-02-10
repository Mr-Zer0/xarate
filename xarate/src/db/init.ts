import { db } from './database';
import { StorageError } from '../types';

/**
 * Initialize the IndexedDB database
 * This should be called early in the application lifecycle
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new StorageError(
      'Failed to initialize local database',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if the database is ready to use
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await db.open();
    return db.isOpen();
  } catch (error) {
    console.error('Database readiness check failed:', error);
    return false;
  }
}

/**
 * Reset the database (clear all data)
 * Use with caution - this will delete all local data
 */
export async function resetDatabase(): Promise<void> {
  try {
    await db.clearAllData();
    console.log('Database reset completed');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw new StorageError(
      'Failed to reset database',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get database statistics for debugging
 */
export async function getDatabaseStats() {
  try {
    return await db.getStats();
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw new StorageError(
      'Failed to retrieve database statistics',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Export database data for backup
 */
export async function exportDatabaseData() {
  try {
    return await db.exportData();
  } catch (error) {
    console.error('Failed to export database data:', error);
    throw new StorageError(
      'Failed to export database data',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Import database data from backup
 */
export async function importDatabaseData(data: {
  households?: any[];
  users?: any[];
  categories?: any[];
  expenses?: any[];
}) {
  try {
    await db.importData(data);
  } catch (error) {
    console.error('Failed to import database data:', error);
    throw new StorageError(
      'Failed to import database data',
      error instanceof Error ? error : undefined
    );
  }
}
