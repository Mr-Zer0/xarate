/**
 * Manual test file for database functionality
 * Run this in the browser console to verify database setup
 */

import { db, initializeDatabase, getDatabaseStats } from './index';
import type { Household, Expense } from '../types';

/**
 * Test database initialization
 */
export async function testDatabaseInit() {
  console.log('Testing database initialization...');
  
  try {
    await initializeDatabase();
    console.log('✓ Database initialized successfully');
    
    const stats = await getDatabaseStats();
    console.log('✓ Database stats:', stats);
    
    return true;
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    return false;
  }
}

/**
 * Test CRUD operations on households
 */
export async function testHouseholdOperations() {
  console.log('Testing household operations...');
  
  try {
    // Create
    const household: Household = {
      id: 'test-household-1',
      name: 'Test Household',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.households.add(household);
    console.log('✓ Household created');
    
    // Read
    const retrieved = await db.households.get('test-household-1');
    console.log('✓ Household retrieved:', retrieved);
    
    // Update
    await db.households.update('test-household-1', { name: 'Updated Household' });
    const updated = await db.households.get('test-household-1');
    console.log('✓ Household updated:', updated);
    
    // Delete
    await db.households.delete('test-household-1');
    const deleted = await db.households.get('test-household-1');
    console.log('✓ Household deleted:', deleted === undefined);
    
    return true;
  } catch (error) {
    console.error('✗ Household operations failed:', error);
    return false;
  }
}

/**
 * Test expense queries with indexes
 */
export async function testExpenseQueries() {
  console.log('Testing expense queries...');
  
  try {
    // Create test data
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        householdId: 'household-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 50.00,
        description: 'Groceries',
        date: new Date('2024-01-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
      },
      {
        id: 'exp-2',
        householdId: 'household-1',
        userId: 'user-2',
        categoryId: 'cat-2',
        amount: 30.00,
        description: 'Dining',
        date: new Date('2024-01-16'),
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
      },
      {
        id: 'exp-3',
        householdId: 'household-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 75.00,
        description: 'More Groceries',
        date: new Date('2024-01-17'),
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      },
    ];
    
    await db.expenses.bulkAdd(expenses);
    console.log('✓ Test expenses created');
    
    // Query by household
    const householdExpenses = await db.expenses
      .where('householdId')
      .equals('household-1')
      .toArray();
    console.log('✓ Query by household:', householdExpenses.length, 'expenses');
    
    // Query by user
    const userExpenses = await db.expenses
      .where('userId')
      .equals('user-1')
      .toArray();
    console.log('✓ Query by user:', userExpenses.length, 'expenses');
    
    // Query by date range using compound index
    const dateRangeExpenses = await db.expenses
      .where('[householdId+date]')
      .between(
        ['household-1', new Date('2024-01-15')],
        ['household-1', new Date('2024-01-17')]
      )
      .toArray();
    console.log('✓ Query by date range:', dateRangeExpenses.length, 'expenses');
    
    // Query by sync status
    const pendingExpenses = await db.expenses
      .where('syncStatus')
      .equals('pending')
      .toArray();
    console.log('✓ Query by sync status:', pendingExpenses.length, 'pending');
    
    // Clean up
    await db.expenses.clear();
    console.log('✓ Test data cleaned up');
    
    return true;
  } catch (error) {
    console.error('✗ Expense queries failed:', error);
    return false;
  }
}

/**
 * Test sync queue operations
 */
export async function testSyncQueue() {
  console.log('Testing sync queue...');
  
  try {
    // Add operations to queue
    const operations = [
      {
        id: 'op-1',
        type: 'create' as const,
        entity: 'expense' as const,
        data: { amount: 100 },
        timestamp: new Date(),
        retryCount: 0,
      },
      {
        id: 'op-2',
        type: 'update' as const,
        entity: 'category' as const,
        data: { name: 'Updated' },
        timestamp: new Date(),
        retryCount: 1,
      },
    ];
    
    await db.sync_queue.bulkAdd(operations);
    console.log('✓ Operations added to queue');
    
    // Query by entity
    const expenseOps = await db.sync_queue
      .where('entity')
      .equals('expense')
      .toArray();
    console.log('✓ Query by entity:', expenseOps.length, 'operations');
    
    // Query by compound index
    const categoryUpdates = await db.sync_queue
      .where('[entity+type]')
      .equals(['category', 'update'])
      .toArray();
    console.log('✓ Query by entity+type:', categoryUpdates.length, 'operations');
    
    // Clean up
    await db.sync_queue.clear();
    console.log('✓ Queue cleaned up');
    
    return true;
  } catch (error) {
    console.error('✗ Sync queue operations failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('=== Running Database Tests ===\n');
  
  const results = {
    init: await testDatabaseInit(),
    household: await testHouseholdOperations(),
    queries: await testExpenseQueries(),
    syncQueue: await testSyncQueue(),
  };
  
  console.log('\n=== Test Results ===');
  console.log('Initialization:', results.init ? '✓ PASS' : '✗ FAIL');
  console.log('Household Operations:', results.household ? '✓ PASS' : '✗ FAIL');
  console.log('Expense Queries:', results.queries ? '✓ PASS' : '✗ FAIL');
  console.log('Sync Queue:', results.syncQueue ? '✓ PASS' : '✗ FAIL');
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\nOverall:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
  
  return allPassed;
}
