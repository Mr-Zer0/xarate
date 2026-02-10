# IndexedDB Database Module

This module provides offline-first local storage using Dexie.js (IndexedDB wrapper).

## Overview

The database mirrors the Supabase schema and provides:
- Fast local data access
- Offline functionality
- Automatic sync queue management
- Type-safe operations

## Database Schema

### Object Stores

1. **households** - Household information
   - Primary key: `id`
   - Indexes: `name`, `createdAt`, `updatedAt`

2. **users** - User profiles
   - Primary key: `id`
   - Indexes: `email`, `name`, `householdId`, `createdAt`, `updatedAt`

3. **categories** - Expense categories
   - Primary key: `id`
   - Indexes: `householdId`, `name`, `isDefault`, `createdAt`, `updatedAt`

4. **expenses** - Expense records
   - Primary key: `id`
   - Indexes: `householdId`, `userId`, `categoryId`, `date`, `syncStatus`
   - Compound indexes: `[householdId+date]`, `[userId+date]`, `[categoryId+date]`

5. **settings** - App configuration
   - Primary key: `key`

6. **sync_queue** - Offline operation queue
   - Primary key: `id`
   - Indexes: `type`, `entity`, `timestamp`, `retryCount`
   - Compound index: `[entity+type]`

## Usage

### Initialization

The database is automatically initialized in `App.tsx`:

```typescript
import { initializeDatabase } from './db';

await initializeDatabase();
```

### Basic Operations

```typescript
import { db } from './db';

// Create
await db.expenses.add({
  id: 'exp-1',
  householdId: 'household-1',
  userId: 'user-1',
  categoryId: 'cat-1',
  amount: 50.00,
  description: 'Groceries',
  date: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  syncStatus: 'synced',
});

// Read
const expense = await db.expenses.get('exp-1');

// Update
await db.expenses.update('exp-1', { amount: 55.00 });

// Delete
await db.expenses.delete('exp-1');

// Query all
const allExpenses = await db.expenses.toArray();
```

### Querying with Indexes

```typescript
// Query by household
const householdExpenses = await db.expenses
  .where('householdId')
  .equals('household-1')
  .toArray();

// Query by date range (using compound index)
const dateRangeExpenses = await db.expenses
  .where('[householdId+date]')
  .between(
    ['household-1', new Date('2024-01-01')],
    ['household-1', new Date('2024-01-31')]
  )
  .toArray();

// Query with sorting
const recentExpenses = await db.expenses
  .orderBy('date')
  .reverse()
  .limit(10)
  .toArray();

// Query with filtering
const pendingExpenses = await db.expenses
  .where('syncStatus')
  .equals('pending')
  .toArray();
```

### Transactions

```typescript
// Atomic operations
await db.transaction('rw', [db.expenses, db.sync_queue], async () => {
  await db.expenses.add(newExpense);
  await db.sync_queue.add(syncOperation);
});
```

### Utility Functions

```typescript
import {
  getDatabaseStats,
  resetDatabase,
  exportDatabaseData,
  importDatabaseData,
} from './db';

// Get statistics
const stats = await getDatabaseStats();
console.log(stats); // { households: 1, users: 2, categories: 8, expenses: 150, syncQueue: 3 }

// Reset database (clear all data)
await resetDatabase();

// Export data for backup
const backup = await exportDatabaseData();

// Import data from backup
await importDatabaseData(backup);
```

## Testing

Run the manual tests in the browser console:

```typescript
import { runAllTests } from './db/database.test';

// Run all tests
await runAllTests();

// Or run individual tests
import {
  testDatabaseInit,
  testHouseholdOperations,
  testExpenseQueries,
  testSyncQueue,
} from './db/database.test';

await testDatabaseInit();
await testHouseholdOperations();
await testExpenseQueries();
await testSyncQueue();
```

## Performance Considerations

1. **Compound Indexes**: Use compound indexes for common query patterns (e.g., `[householdId+date]`)
2. **Bulk Operations**: Use `bulkAdd`, `bulkPut`, `bulkDelete` for multiple records
3. **Transactions**: Group related operations in transactions for atomicity
4. **Pagination**: Use `limit()` and `offset()` for large result sets

## Migration Strategy

When schema changes are needed:

```typescript
// In database.ts
this.version(2).stores({
  // Updated schema
  expenses: '...new indexes...',
}).upgrade(tx => {
  // Migration logic
  return tx.expenses.toCollection().modify(expense => {
    // Transform data
  });
});
```

## Error Handling

All database operations should be wrapped in try-catch blocks:

```typescript
try {
  await db.expenses.add(expense);
} catch (error) {
  if (error.name === 'ConstraintError') {
    // Handle duplicate key
  } else {
    // Handle other errors
    throw new StorageError('Failed to save expense', error);
  }
}
```

## Best Practices

1. Always use transactions for related operations
2. Use compound indexes for common query patterns
3. Keep the sync queue clean (remove processed operations)
4. Regularly check database stats for debugging
5. Handle Date objects properly (Dexie stores them as timestamps)
6. Use bulk operations for better performance
7. Clear old data periodically to prevent database bloat
