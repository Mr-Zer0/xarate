# Zustand Stores

This directory contains all Zustand stores for state management in the Personal Expense Tracker application.

## Stores Overview

### 1. authStore
Manages user authentication and session state.

**State:**
- `user`: Current authenticated user
- `session`: Current session with tokens
- `isAuthenticated`: Boolean flag for authentication status
- `isLoading`: Loading state for auth operations
- `error`: Error message if any

**Actions:**
- `signUp(email, password, name)`: Register a new user
- `signIn(email, password)`: Sign in with credentials
- `signInWithMagicLink(email)`: Request magic link for passwordless login
- `signOut()`: Sign out current user
- `refreshSession()`: Refresh the current session
- `loadSession()`: Load session on app start
- `updateProfile(updates)`: Update user profile
- `clearError()`: Clear error state

**Usage Example:**
```typescript
import { useAuthStore } from '@/stores';

function LoginComponent() {
  const { signIn, isLoading, error } = useAuthStore();
  
  const handleLogin = async () => {
    try {
      await signIn('user@example.com', 'password');
      // Navigate to dashboard
    } catch (err) {
      // Error is already in store
    }
  };
  
  return (
    <div>
      {error && <p>{error}</p>}
      <button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </div>
  );
}
```

### 2. expenseStore
Manages expenses list, filters, and summaries.

**State:**
- `expenses`: Array of expenses
- `selectedExpense`: Currently selected expense
- `filter`: Active filter criteria
- `isLoading`: Loading state
- `error`: Error message
- `totalAmount`: Total amount for filtered expenses
- `categoryBreakdown`: Spending by category
- `userBreakdown`: Spending by user
- `hasMore`: Pagination flag
- `currentOffset`: Current pagination offset

**Actions:**
- `loadExpenses(filter, limit, offset)`: Load expenses with optional filter
- `loadMoreExpenses(limit)`: Load next page of expenses
- `createExpense(expense)`: Create a new expense
- `updateExpense(id, updates)`: Update an expense
- `deleteExpense(id)`: Delete an expense
- `selectExpense(expense)`: Select an expense
- `setFilter(filter)`: Apply filter and reload
- `clearFilter()`: Clear all filters
- `loadSummaries(filter)`: Load summaries (total, breakdowns)
- `refreshExpenses()`: Refresh current view
- `clearError()`: Clear error state

**Usage Example:**
```typescript
import { useExpenseStore } from '@/stores';

function ExpenseList() {
  const { 
    expenses, 
    isLoading, 
    loadExpenses, 
    setFilter 
  } = useExpenseStore();
  
  useEffect(() => {
    loadExpenses();
  }, []);
  
  const filterByCategory = (categoryId: string) => {
    setFilter({ categoryIds: [categoryId] });
  };
  
  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {expenses.map(expense => (
        <div key={expense.id}>{expense.description}</div>
      ))}
    </div>
  );
}
```

### 3. categoryStore
Manages categories list.

**State:**
- `categories`: Array of categories
- `selectedCategory`: Currently selected category
- `isLoading`: Loading state
- `error`: Error message

**Actions:**
- `loadCategories()`: Load all categories
- `createCategory(category)`: Create a new category
- `updateCategory(id, updates)`: Update a category
- `deleteCategory(id)`: Delete a category
- `selectCategory(category)`: Select a category
- `getDefaultCategories()`: Get default categories
- `getCategoryById(id)`: Get category by ID
- `initializeDefaultCategories()`: Initialize default categories
- `clearError()`: Clear error state

**Usage Example:**
```typescript
import { useCategoryStore } from '@/stores';

function CategorySelector() {
  const { categories, loadCategories } = useCategoryStore();
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  return (
    <select>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>
          {cat.icon} {cat.name}
        </option>
      ))}
    </select>
  );
}
```

### 4. uiStore
Manages UI state including loading, modals, toasts, and sync status.

**State:**
- `globalLoading`: Global loading flag
- `loadingOperations`: Set of active loading operations
- `modals`: Record of modal states
- `toasts`: Array of toast notifications
- `syncStatus`: Current sync status ('idle' | 'syncing' | 'synced' | 'error')
- `queueStatus`: Sync queue status
- `isOnline`: Online/offline status

**Actions:**
- `setGlobalLoading(loading)`: Set global loading state
- `startLoading(operation)`: Start a loading operation
- `stopLoading(operation)`: Stop a loading operation
- `isOperationLoading(operation)`: Check if operation is loading
- `openModal(id, data)`: Open a modal
- `closeModal(id)`: Close a modal
- `isModalOpen(id)`: Check if modal is open
- `getModalData(id)`: Get modal data
- `showToast(type, message, duration)`: Show a toast notification
- `removeToast(id)`: Remove a toast
- `clearToasts()`: Clear all toasts
- `setSyncStatus(status)`: Set sync status
- `setQueueStatus(status)`: Set queue status
- `setOnlineStatus(isOnline)`: Set online status

**Usage Example:**
```typescript
import { useUIStore } from '@/stores';

function SaveButton() {
  const { showToast, startLoading, stopLoading } = useUIStore();
  
  const handleSave = async () => {
    startLoading('save-expense');
    try {
      await saveExpense();
      showToast('success', 'Expense saved successfully');
    } catch (error) {
      showToast('error', 'Failed to save expense');
    } finally {
      stopLoading('save-expense');
    }
  };
  
  return <button onClick={handleSave}>Save</button>;
}

function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
          <button onClick={() => removeToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
```

## Store Architecture

All stores follow these principles:

1. **Offline-First**: Stores work with services that prioritize local data (IndexedDB) and sync with Supabase
2. **Optimistic Updates**: UI updates immediately, sync happens in background
3. **Error Handling**: Each store has error state and error clearing methods
4. **Loading States**: Track loading for better UX
5. **Type Safety**: Full TypeScript support with proper types

## Integration with Services

Stores are thin wrappers around services:
- `authStore` → `AuthService`
- `expenseStore` → `ExpenseService`
- `categoryStore` → `CategoryService`
- `uiStore` → Manages UI state only

Services handle all business logic, data persistence, and sync. Stores manage React state and provide convenient hooks for components.

## Best Practices

1. **Use stores in components**: Don't call services directly from components
2. **Handle errors**: Always check error state after operations
3. **Clear errors**: Call `clearError()` when appropriate
4. **Loading states**: Use loading states to show feedback
5. **Selective subscriptions**: Only subscribe to the state you need

```typescript
// Good: Only subscribe to what you need
const expenses = useExpenseStore(state => state.expenses);

// Less optimal: Subscribe to entire store
const store = useExpenseStore();
```

## Testing

Stores can be tested by:
1. Mocking the service layer
2. Testing state changes
3. Testing action side effects

Example:
```typescript
import { useExpenseStore } from '@/stores';

describe('expenseStore', () => {
  it('should load expenses', async () => {
    const { loadExpenses, expenses } = useExpenseStore.getState();
    await loadExpenses();
    expect(expenses.length).toBeGreaterThan(0);
  });
});
```
