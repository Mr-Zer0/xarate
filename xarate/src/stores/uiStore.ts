// UI store for managing loading states, modals, toasts, and sync status
import { create } from 'zustand';
import type { QueueStatus } from '../types/models';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface Modal {
  id: string;
  isOpen: boolean;
  data?: any;
}

interface UIState {
  // Loading states
  globalLoading: boolean;
  loadingOperations: Set<string>;

  // Modals
  modals: Record<string, Modal>;

  // Toasts
  toasts: Toast[];

  // Sync status
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  queueStatus: QueueStatus | null;
  isOnline: boolean;

  // Actions - Loading
  setGlobalLoading: (loading: boolean) => void;
  startLoading: (operation: string) => void;
  stopLoading: (operation: string) => void;
  isOperationLoading: (operation: string) => boolean;

  // Actions - Modals
  openModal: (id: string, data?: any) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
  getModalData: (id: string) => any;

  // Actions - Toasts
  showToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Actions - Sync
  setSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error') => void;
  setQueueStatus: (status: QueueStatus) => void;
  setOnlineStatus: (isOnline: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  globalLoading: false,
  loadingOperations: new Set(),
  modals: {},
  toasts: [],
  syncStatus: 'idle',
  queueStatus: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // Set global loading state
  setGlobalLoading: (loading: boolean) => {
    set({ globalLoading: loading });
  },

  // Start a loading operation
  startLoading: (operation: string) => {
    const operations = new Set(get().loadingOperations);
    operations.add(operation);
    set({ loadingOperations: operations });
  },

  // Stop a loading operation
  stopLoading: (operation: string) => {
    const operations = new Set(get().loadingOperations);
    operations.delete(operation);
    set({ loadingOperations: operations });
  },

  // Check if an operation is loading
  isOperationLoading: (operation: string) => {
    return get().loadingOperations.has(operation);
  },

  // Open a modal
  openModal: (id: string, data?: any) => {
    set({
      modals: {
        ...get().modals,
        [id]: { id, isOpen: true, data },
      },
    });
  },

  // Close a modal
  closeModal: (id: string) => {
    const modals = { ...get().modals };
    if (modals[id]) {
      modals[id] = { ...modals[id], isOpen: false };
    }
    set({ modals });
  },

  // Check if a modal is open
  isModalOpen: (id: string) => {
    return get().modals[id]?.isOpen || false;
  },

  // Get modal data
  getModalData: (id: string) => {
    return get().modals[id]?.data;
  },

  // Show a toast notification
  showToast: (type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, message, duration };
    
    set({ toasts: [...get().toasts, toast] });

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  // Remove a toast
  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter(toast => toast.id !== id) });
  },

  // Clear all toasts
  clearToasts: () => {
    set({ toasts: [] });
  },

  // Set sync status
  setSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error') => {
    set({ syncStatus: status });
  },

  // Set queue status
  setQueueStatus: (status: QueueStatus) => {
    set({ queueStatus: status });
  },

  // Set online status
  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
    
    // Show toast when going offline/online
    if (isOnline) {
      get().showToast('success', 'Back online', 3000);
    } else {
      get().showToast('warning', 'You are offline', 3000);
    }
  },
}));

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useUIStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useUIStore.getState().setOnlineStatus(false);
  });
}
