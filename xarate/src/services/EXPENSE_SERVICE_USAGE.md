# ExpenseService Usage Guide

This document provides examples of how to use the ExpenseService for managing expenses in the application.

## Import

```typescript
import { expenseService } from './services/ExpenseService';
```

## Creating an Expense

```typescript
const newExpense = await expenseService.createExpense({
  householdId: 'household-uuid',
  userId: 'user-uuid',
  categoryId: 'category-uuid',
  amount: 49.99,
  description: 'Grocery shopping at Whole Foods',
  date: new Date(),
  syncStatus: 'pending',
});
```

### With Optional Fields

```typescript
const expenseWithReceipt = await expenseService.createExpense({
  householdId: 'household-uuid',
  userId: 'user-uuid',
  categoryId: 'category-uuid',
  amount: 125.50,
  description: 'Electronics purchase',
  date: new Date(),
  receiptImageUrl: 'https://storage.supabase.co/...',
  ocrData: {
    merchantName: 'Best Buy',
    extractedAmount: 125.50,
    extractedDate: new Date(),
    confidence: 0.95,
    rawText: 'Receipt text...',
  },
  syncStatus: 'pending',
});
```

## Getting an Expense

```typescript
const expense = await expenseService.getExpense('expense-uuid');

if (expense) {
  console.log(`Expense: ${expense.description} - $${expense.amount}`);
} else {
  console.log('Expense not found');
}
```

## Updating an Expense

```typescript
const updatedExpense = await expenseService.updateExpense('expense-uuid', {
  amount: 55.00,
  description: 'Updated description',
  categoryId: 'new-category-uuid',
});
```

## Deleting an Expense

```typescript
await expenseService.deleteExpense('expense-uuid');
```

## Listing Expenses

### All Expenses

```typescript
const allExpenses = await expenseService.listExpenses();
```

### With Pagination

```typescript
const expenses = await expenseService.listExpenses(undefined, 20, 0); // First 20 expenses
const nextPage = await expenseService.listExpenses(undefined, 20, 20); // Next 20 expenses
```

### With Filters

```typescript
// Filter by user
const userExpenses = await expenseService.listExpenses({
  userIds: ['user-uuid-1', 'user-uuid-2'],
});

// Filter by category
const categoryExpenses = await expenseService.listExpenses({
  categoryIds: ['groceries-uuid', 'dining-uuid'],
});

// Filter by date range
const dateRangeExpenses = await expenseService.listExpenses({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
});

// Filter by search text
const searchResults = await expenseService.listExpenses({
  searchText: 'grocery',
});

// Combine multiple filters
const filteredExpenses = await expenseService.listExpenses({
  userIds: ['user-uuid'],
  categoryIds: ['groceries-uuid'],
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
  searchText: 'whole foods',
});
```

## Getting Total Amount

```typescript
// Total for all expenses
const total = await expenseService.getTotalAmount();
console.log(`Total spending: $${total.toFixed(2)}`);

// Total with filters
const monthlyTotal = await expenseService.getTotalAmount({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
});
console.log(`January spending: $${monthlyTotal.toFixed(2)}`);
```

## Getting Category Breakdown

```typescript
const categoryBreakdown = await expenseService.getCategoryBreakdown();

categoryBreakdown.forEach(category => {
  console.log(`${category.categoryName}: $${category.total.toFixed(2)} (${category.percentage.toFixed(1)}%)`);
  console.log(`  Count: ${category.count} expenses`);
});

// Example output:
// Groceries: $450.00 (45.0%)
//   Count: 12 expenses
// Dining: $300.00 (30.0%)
//   Count: 8 expenses
```

### With Filters

```typescript
const monthlyBreakdown = await expenseService.getCategoryBreakdown({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
});
```

## Getting User Breakdown

```typescript
const userBreakdown = await expenseService.getUserBreakdown();

userBreakdown.forEach(user => {
  console.log(`${user.userName}: $${user.total.toFixed(2)} (${user.percentage.toFixed(1)}%)`);
  console.log(`  Count: ${user.count} expenses`);
});

// Example output:
// John: $600.00 (60.0%)
//   Count: 15 expenses
// Jane: $400.00 (40.0%)
//   Count: 10 expenses
```

### With Filters

```typescript
const monthlyUserBreakdown = await expenseService.getUserBreakdown({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
});
```

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  const expense = await expenseService.createExpense({
    householdId: 'household-uuid',
    userId: 'user-uuid',
    categoryId: 'category-uuid',
    amount: -10, // Invalid amount
    description: 'Test',
    date: new Date(),
    syncStatus: 'pending',
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
    // Show user-friendly error message
  } else {
    console.error('Unexpected error:', error);
    // Show generic error message
  }
}
```

## Offline Support

The ExpenseService is designed with offline-first functionality:

1. **Read operations** try IndexedDB first, then fall back to Supabase
2. **Write operations** save to Supabase first, then cache in IndexedDB
3. **List operations** automatically cache results in IndexedDB for offline access
4. If Supabase is unavailable, the service falls back to IndexedDB data

```typescript
// This will work offline if data was previously cached
const expenses = await expenseService.listExpenses();
```

## Integration with React Components

### Using in a Component

```typescript
import { useState, useEffect } from 'react';
import { expenseService } from '../services/ExpenseService';
import type { Expense } from '../types/models';

function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.listExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await expenseService.deleteExpense(id);
      // Refresh list
      await loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {expenses.map(expense => (
        <div key={expense.id}>
          <span>{expense.description}</span>
          <span>${expense.amount}</span>
          <button onClick={() => handleDelete(expense.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Requirements Coverage

This implementation covers the following requirements:

- **2.1**: Quick expense entry with amount, description, and category
- **2.2**: Automatic date/time recording
- **2.3**: Decimal values for currency
- **2.4**: Validation of required fields
- **2.5**: Error messages for missing fields
- **4.1**: Display all expenses sorted by date
- **4.2**: Show expense details (amount, description, category, date, user)
- **4.3**: Filter by user, category, and date range
- **4.4**: Update list based on filters
- **5.1**: Display total amount for current view
- **5.2**: Update total based on filters
- **5.3**: Spending breakdown by category
- **5.4**: Spending breakdown by user
- **6.1**: Edit expense option
- **6.2**: Modify expense fields
- **6.3**: Prevent changing expense user
- **6.4**: Delete expense option
- **6.5**: Confirmation before deletion
- **6.6**: Remove from database and update views
- **7.1**: Immediate persistence to storage
