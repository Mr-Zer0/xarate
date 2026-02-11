# SyncService Usage Guide

## Overview

The `SyncService` provides offline-first synchronization between IndexedDB (local storage) and Supabase (remote database). It implements:

- **Bidirectional sync**: Sync data from Supabase to IndexedDB and vice versa
- **Real-time updates**: Subscribe to live changes from other users/devices
- **Offline queue**: Queue operations when offline and sync when connection is restored
- **Conflict resolution**: Last-write-wins strategy based on timestamps
- **Exponential backoff**: Retry failed operations with increasing delays

## Basic Usage

### Initialize the Service

```typescript
import { syncService } from './services/SyncService';

// Initialize sync service (performs initial sync and sets up subscriptions)
await syncService.initialize();
```

### Manual Sync Operations

```typescript
// Sync all entities
await syncService.syncAll();

// Sync specific entities
await syncService.syncExpenses();
await syncService.syncCategories();
await syncService.syncUsers();
```

### Real-time Subscriptions

```typescript
// Subscribe to expense changes
const unsubscribeExpenses = syncService.subscribeToExpenses((expense) => {
  console.log('Expense updated:', expense);
  // Update UI with new expense data
});

// Subscribe to category changes
const unsubscribeCategories = syncService.subscribeToCategories((category) => {
  console.log('Category updated:', category);
  // Update UI with new category data
});

// Unsubscribe when component unmounts
unsubscribeExpenses();
unsubscribeCategories();
```

### Queue Management

```typescript
import { v4 as uuidv4 } from 'uuid';

// Queue an operation for later sync (when offline)
const operation: SyncOperation = {
  id: uuidv4(),
  type: 'create',
  entity: 'expense',
  data: newExpense,
  timestamp: new Date(),
  retryCount: 0,
};

syncService.queueOperation(operation);

// Process queued operations (automatically called during syncAll)
await syncService.processQueue();

// Get queue status
const status = await syncService.getQueueStatus();
console.log(`Pending: ${status.pending}, Failed: ${status.failed}`);
console.log(`Last sync: ${status.lastSync}`);
```

## Integration Examples

### React Component with Real-time Updates

```typescript
import { useEffect, useState } from 'react';
import { syncService } from '../services/SyncService';
import type { Expense } from '../types/models';

function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    // Initial load
    loadExpenses();

    // Subscribe to real-time updates
    const unsubscribe = syncService.subscribeToExpenses((expense) => {
      // Update local state when expense changes
      setExpenses(prev => {
        const index = prev.findIndex(e => e.id === expense.id);
        if (index >= 0) {
          // Update existing
          const updated = [...prev];
          updated[index] = expense;
          return updated;
        } else {
          // Add new
          return [...prev, expense];
        }
      });
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  async function loadExpenses() {
    // Load from IndexedDB (already synced by SyncService)
    const expenses = await db.expenses.toArray();
    setExpenses(expenses);
  }

  return (
    <div>
      {expenses.map(expense => (
        <ExpenseCard key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
```

### Offline Detection and Sync

```typescript
import { useEffect, useState } from 'react';
import { syncService } from '../services/SyncService';

function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, failed: 0 });

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('Connection restored, syncing...');
      
      try {
        await syncService.syncAll();
        console.log('Sync completed successfully');
      } catch (error) {
        console.error('Sync failed:', error);
      }
      
      updateQueueStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost, working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queue status periodically
    const interval = setInterval(updateQueueStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  async function updateQueueStatus() {
    const status = await syncService.getQueueStatus();
    setQueueStatus(status);
  }

  return (
    <div className="sync-status">
      {isOnline ? (
        <span className="text-green-600">● Online</span>
      ) : (
        <span className="text-orange-600">● Offline</span>
      )}
      
      {queueStatus.pending > 0 && (
        <span className="ml-2 text-sm text-gray-600">
          {queueStatus.pending} pending sync(s)
        </span>
      )}
      
      {queueStatus.failed > 0 && (
        <span className="ml-2 text-sm text-red-600">
          {queueStatus.failed} failed sync(s)
        </span>
      )}
    </div>
  );
}
```

### App Initialization

```typescript
// src/main.tsx or App.tsx
import { useEffect } from 'react';
import { syncService } from './services/SyncService';
import { db } from './db/database';

function App() {
  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize database
        await db.initialize();
        
        // Initialize sync service
        await syncService.initialize();
        
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // App can still work offline with cached data
      }
    }

    initializeApp();

    // Cleanup on unmount
    return () => {
      syncService.cleanup();
    };
  }, []);

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}
```

## Conflict Resolution

The SyncService uses a **last-write-wins** strategy for conflict resolution:

1. When syncing from Supabase, it compares the `updatedAt` timestamp of local and remote items
2. If remote is newer, it overwrites the local version
3. If local is newer, it keeps the local version and marks it as `conflict`
4. Conflicted items will be synced to Supabase on the next queue processing

```typescript
// Example conflict resolution
const localExpense = {
  id: '1',
  amount: 100,
  updatedAt: new Date('2024-01-02T10:00:00Z'),
  syncStatus: 'pending'
};

const remoteExpense = {
  id: '1',
  amount: 150,
  updatedAt: new Date('2024-01-02T09:00:00Z'),
  syncStatus: 'synced'
};

// Local is newer, so it wins
const resolved = syncService.resolveConflict(localExpense, remoteExpense);
// Result: { ...localExpense, syncStatus: 'conflict' }
```

## Error Handling

The SyncService implements robust error handling:

### Exponential Backoff

Failed sync operations are retried with exponential backoff:

- Retry 1: 2 seconds delay
- Retry 2: 4 seconds delay
- Retry 3: 8 seconds delay
- Retry 4: 16 seconds delay
- Retry 5: 32 seconds delay
- After 5 retries: Operation is removed from queue

### Network Errors

Network errors are handled gracefully:

```typescript
try {
  await syncService.syncAll();
} catch (error) {
  if (error.message.includes('network')) {
    // Show offline message to user
    console.log('Working offline, changes will sync when online');
  } else {
    // Handle other errors
    console.error('Sync error:', error);
  }
}
```

## Best Practices

### 1. Initialize Early

Initialize the SyncService as early as possible in your app lifecycle:

```typescript
// In main.tsx or App.tsx
useEffect(() => {
  syncService.initialize();
}, []);
```

### 2. Handle Offline Gracefully

Always assume the app might be offline:

```typescript
// Save to IndexedDB first (instant)
await db.expenses.put(newExpense);

// Queue for sync (will sync when online)
syncService.queueOperation({
  id: uuidv4(),
  type: 'create',
  entity: 'expense',
  data: newExpense,
  timestamp: new Date(),
  retryCount: 0,
});
```

### 3. Subscribe to Real-time Updates

Use real-time subscriptions to keep UI in sync across devices:

```typescript
useEffect(() => {
  const unsubscribe = syncService.subscribeToExpenses(handleExpenseUpdate);
  return () => unsubscribe();
}, []);
```

### 4. Show Sync Status

Display sync status to users so they know when changes are pending:

```typescript
const status = await syncService.getQueueStatus();
if (status.pending > 0) {
  showNotification(`${status.pending} changes pending sync`);
}
```

### 5. Cleanup on Unmount

Always cleanup subscriptions when components unmount:

```typescript
useEffect(() => {
  const unsubscribe = syncService.subscribeToExpenses(callback);
  return () => unsubscribe();
}, []);
```

## Troubleshooting

### Sync Not Working

1. Check network connection: `navigator.onLine`
2. Check Supabase credentials in `.env`
3. Check queue status: `await syncService.getQueueStatus()`
4. Check browser console for errors

### Real-time Updates Not Received

1. Verify Supabase Realtime is enabled in project settings
2. Check that subscriptions are active
3. Verify Row Level Security policies allow reads
4. Check browser console for subscription errors

### Conflicts Not Resolving

1. Verify `updatedAt` timestamps are being set correctly
2. Check that conflict resolution is using correct timestamps
3. Manually process queue: `await syncService.processQueue()`

## Performance Considerations

### Batch Operations

When syncing large amounts of data, the service automatically batches operations:

```typescript
// Syncs all expenses in one query
await syncService.syncExpenses();

// Uses bulkPut for efficient IndexedDB writes
await db.expenses.bulkPut(expenses);
```

### Incremental Sync

The service only syncs items updated since last sync:

```typescript
// Only fetches expenses updated after lastExpenseSync timestamp
const lastSync = await db.settings.get('lastExpenseSync');
query = query.gt('updated_at', lastSync.value);
```

### Background Sync

Sync operations run in the background and don't block the UI:

```typescript
// Non-blocking sync
syncService.syncAll().catch(error => {
  console.error('Background sync failed:', error);
});
```

## API Reference

### Methods

- `syncExpenses()`: Sync expenses from Supabase to IndexedDB
- `syncCategories()`: Sync categories from Supabase to IndexedDB
- `syncUsers()`: Sync users from Supabase to IndexedDB
- `syncAll()`: Sync all entities and process queue
- `subscribeToExpenses(callback)`: Subscribe to real-time expense updates
- `subscribeToCategories(callback)`: Subscribe to real-time category updates
- `resolveConflict(local, remote)`: Resolve conflicts using last-write-wins
- `queueOperation(operation)`: Add operation to sync queue
- `processQueue()`: Process all queued operations
- `getQueueStatus()`: Get current queue status
- `initialize()`: Initialize service and start subscriptions
- `cleanup()`: Cleanup subscriptions and resources

### Types

```typescript
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'user';
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface QueueStatus {
  pending: number;
  failed: number;
  lastSync: Date | null;
}
```
