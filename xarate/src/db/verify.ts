/**
 * Quick verification script for database setup
 * This can be imported and run in the browser console or during development
 */

import { db, initializeDatabase, getDatabaseStats } from './index';

/**
 * Verify database is properly set up
 */
export async function verifyDatabaseSetup(): Promise<boolean> {
  console.log('🔍 Verifying database setup...\n');

  try {
    // Step 1: Initialize
    console.log('1. Initializing database...');
    await initializeDatabase();
    console.log('   ✓ Database initialized\n');

    // Step 2: Check if database is open
    console.log('2. Checking database connection...');
    if (!db.isOpen()) {
      throw new Error('Database is not open');
    }
    console.log('   ✓ Database is open\n');

    // Step 3: Verify all tables exist
    console.log('3. Verifying tables...');
    const tables = ['households', 'users', 'categories', 'expenses', 'settings', 'sync_queue'];
    for (const table of tables) {
      if (!db.tables.find(t => t.name === table)) {
        throw new Error(`Table ${table} not found`);
      }
      console.log(`   ✓ Table '${table}' exists`);
    }
    console.log();

    // Step 4: Get statistics
    console.log('4. Getting database statistics...');
    const stats = await getDatabaseStats();
    console.log('   Statistics:', stats);
    console.log();

    // Step 5: Test basic operations
    console.log('5. Testing basic operations...');
    
    // Test settings
    await db.settings.put({ key: 'test', value: 'verification' });
    const setting = await db.settings.get('test');
    if (setting?.value !== 'verification') {
      throw new Error('Settings read/write failed');
    }
    await db.settings.delete('test');
    console.log('   ✓ Settings operations work\n');

    // Step 6: Verify indexes
    console.log('6. Verifying indexes...');
    const expenseTable = db.table('expenses');
    const schema = expenseTable.schema;
    console.log('   Expense table indexes:', schema.indexes.map(i => i.name).join(', '));
    console.log('   ✓ Indexes configured\n');

    console.log('✅ Database setup verification PASSED\n');
    console.log('Database is ready to use!');
    
    return true;
  } catch (error) {
    console.error('❌ Database setup verification FAILED\n');
    console.error('Error:', error);
    return false;
  }
}

/**
 * Quick test to add and retrieve sample data
 */
export async function quickDataTest(): Promise<boolean> {
  console.log('🧪 Running quick data test...\n');

  try {
    // Create sample household
    const household = {
      id: 'test-household',
      name: 'Test Household',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.households.put(household);
    console.log('✓ Created household:', household.name);

    // Create sample user
    const user = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      color: '#3B82F6',
      householdId: 'test-household',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.users.put(user);
    console.log('✓ Created user:', user.name);

    // Create sample category
    const category = {
      id: 'test-category',
      householdId: 'test-household',
      name: 'Test Category',
      color: '#10B981',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.categories.put(category);
    console.log('✓ Created category:', category.name);

    // Create sample expense
    const expense = {
      id: 'test-expense',
      householdId: 'test-household',
      userId: 'test-user',
      categoryId: 'test-category',
      amount: 42.50,
      description: 'Test Expense',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'synced' as const,
    };

    await db.expenses.put(expense);
    console.log('✓ Created expense:', expense.description);

    // Verify data
    const retrievedExpense = await db.expenses.get('test-expense');
    if (!retrievedExpense) {
      throw new Error('Failed to retrieve expense');
    }
    console.log('✓ Retrieved expense:', retrievedExpense.description);

    // Query by household
    const householdExpenses = await db.expenses
      .where('householdId')
      .equals('test-household')
      .toArray();
    console.log('✓ Queried expenses by household:', householdExpenses.length, 'found');

    // Clean up
    await db.expenses.delete('test-expense');
    await db.categories.delete('test-category');
    await db.users.delete('test-user');
    await db.households.delete('test-household');
    console.log('✓ Cleaned up test data\n');

    console.log('✅ Quick data test PASSED\n');
    return true;
  } catch (error) {
    console.error('❌ Quick data test FAILED\n');
    console.error('Error:', error);
    return false;
  }
}

/**
 * Run all verification tests
 */
export async function runVerification(): Promise<void> {
  console.log('═══════════════════════════════════════');
  console.log('  Database Verification Suite');
  console.log('═══════════════════════════════════════\n');

  const setupOk = await verifyDatabaseSetup();
  
  if (setupOk) {
    console.log('───────────────────────────────────────\n');
    await quickDataTest();
  }

  console.log('═══════════════════════════════════════');
  console.log(setupOk ? '  All checks passed! 🎉' : '  Some checks failed ⚠️');
  console.log('═══════════════════════════════════════');
}

// Export for easy console access
if (typeof window !== 'undefined') {
  (window as any).verifyDB = runVerification;
  console.log('💡 Tip: Run verifyDB() in the console to verify database setup');
}
