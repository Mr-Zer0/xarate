// Expense store for managing expenses list, filters, and selected expense
import { create } from 'zustand';
import type { Expense, ExpenseFilter, CategorySummary, UserSummary } from '../types/models';
import { expenseService } from '../services/ExpenseService';

interface ExpenseState {
  // State
  expenses: Expense[];
  selectedExpense: Expense | null;
  filter: ExpenseFilter;
  isLoading: boolean;
  error: string | null;
  totalAmount: number;
  categoryBreakdown: CategorySummary[];
  userBreakdown: UserSummary[];
  hasMore: boolean;
  currentOffset: number;

  // Actions
  loadExpenses: (filter?: ExpenseFilter, limit?: number, offset?: number) => Promise<void>;
  loadMoreExpenses: (limit?: number) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  selectExpense: (expense: Expense | null) => void;
  setFilter: (filter: ExpenseFilter) => void;
  clearFilter: () => void;
  loadSummaries: (filter?: ExpenseFilter) => Promise<void>;
  refreshExpenses: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_LIMIT = 20;

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  // Initial state
  expenses: [],
  selectedExpense: null,
  filter: {},
  isLoading: false,
  error: null,
  totalAmount: 0,
  categoryBreakdown: [],
  userBreakdown: [],
  hasMore: true,
  currentOffset: 0,

  // Load expenses with optional filter
  loadExpenses: async (filter?: ExpenseFilter, limit = DEFAULT_LIMIT, offset = 0) => {
    set({ isLoading: true, error: null });
    try {
      const expenses = await expenseService.listExpenses(filter, limit, offset);
      set({
        expenses: offset === 0 ? expenses : [...get().expenses, ...expenses],
        filter: filter || {},
        isLoading: false,
        error: null,
        hasMore: expenses.length === limit,
        currentOffset: offset + expenses.length,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load expenses',
      });
    }
  },

  // Load more expenses (pagination)
  loadMoreExpenses: async (limit = DEFAULT_LIMIT) => {
    const { currentOffset, filter, hasMore, isLoading } = get();
    
    if (!hasMore || isLoading) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const expenses = await expenseService.listExpenses(filter, limit, currentOffset);
      set({
        expenses: [...get().expenses, ...expenses],
        isLoading: false,
        error: null,
        hasMore: expenses.length === limit,
        currentOffset: currentOffset + expenses.length,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load more expenses',
      });
    }
  },

  // Create a new expense
  createExpense: async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ isLoading: true, error: null });
    try {
      const newExpense = await expenseService.createExpense(expense);
      
      // Add to the beginning of the list (most recent first)
      set({
        expenses: [newExpense, ...get().expenses],
        isLoading: false,
        error: null,
      });

      // Refresh summaries
      await get().loadSummaries(get().filter);
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create expense',
      });
      throw error;
    }
  },

  // Update an existing expense
  updateExpense: async (id: string, updates: Partial<Expense>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await expenseService.updateExpense(id, updates);
      
      // Update in the list
      set({
        expenses: get().expenses.map(exp => 
          exp.id === id ? updatedExpense : exp
        ),
        selectedExpense: get().selectedExpense?.id === id ? updatedExpense : get().selectedExpense,
        isLoading: false,
        error: null,
      });

      // Refresh summaries
      await get().loadSummaries(get().filter);
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update expense',
      });
      throw error;
    }
  },

  // Delete an expense
  deleteExpense: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await expenseService.deleteExpense(id);
      
      // Remove from the list
      set({
        expenses: get().expenses.filter(exp => exp.id !== id),
        selectedExpense: get().selectedExpense?.id === id ? null : get().selectedExpense,
        isLoading: false,
        error: null,
      });

      // Refresh summaries
      await get().loadSummaries(get().filter);
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete expense',
      });
      throw error;
    }
  },

  // Select an expense
  selectExpense: (expense: Expense | null) => {
    set({ selectedExpense: expense });
  },

  // Set filter
  setFilter: (filter: ExpenseFilter) => {
    set({ filter, currentOffset: 0 });
    get().loadExpenses(filter);
  },

  // Clear filter
  clearFilter: () => {
    set({ filter: {}, currentOffset: 0 });
    get().loadExpenses({});
  },

  // Load summaries (total, category breakdown, user breakdown)
  loadSummaries: async (filter?: ExpenseFilter) => {
    try {
      const [totalAmount, categoryBreakdown, userBreakdown] = await Promise.all([
        expenseService.getTotalAmount(filter),
        expenseService.getCategoryBreakdown(filter),
        expenseService.getUserBreakdown(filter),
      ]);

      set({
        totalAmount,
        categoryBreakdown,
        userBreakdown,
      });
    } catch (error) {
      console.error('Failed to load summaries:', error);
    }
  },

  // Refresh expenses (reload current view)
  refreshExpenses: async () => {
    const { filter } = get();
    await get().loadExpenses(filter, DEFAULT_LIMIT, 0);
    await get().loadSummaries(filter);
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
