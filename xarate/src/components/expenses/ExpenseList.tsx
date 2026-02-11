// ExpenseList component - displays expenses with infinite scroll and pull-to-refresh
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useExpenseStore } from '../../stores/expenseStore';
import { useCategoryStore } from '../../stores/categoryStore';
import type { Expense, Category, User } from '../../types/models';
import { db } from '../../db/database';
import { ExpenseCard } from './ExpenseCard';

export const ExpenseList: React.FC = () => {
  const {
    expenses,
    isLoading,
    error,
    hasMore,
    loadExpenses,
    loadMoreExpenses,
    refreshExpenses,
  } = useExpenseStore();

  const { categories, loadCategories } = useCategoryStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Refs for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        loadExpenses(),
        loadCategories(),
        loadUsers(),
      ]);
    };

    loadInitialData();
  }, []);

  // Load users from IndexedDB
  const loadUsers = async () => {
    try {
      const loadedUsers = await db.users.toArray();
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadMoreExpenses();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMoreExpenses]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0) {
      const touchY = e.touches[0]?.clientY;
      if (touchY !== undefined) {
        touchStartY.current = touchY;
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0 && touchStartY.current > 0) {
      const touchY = e.touches[0]?.clientY;
      if (touchY !== undefined) {
        const distance = touchY - touchStartY.current;
        
        if (distance > 0) {
          setPullDistance(Math.min(distance, 100));
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && !isPullRefreshing) {
      setIsPullRefreshing(true);
      try {
        await refreshExpenses();
      } finally {
        setIsPullRefreshing(false);
        setPullDistance(0);
        touchStartY.current = 0;
      }
    } else {
      setPullDistance(0);
      touchStartY.current = 0;
    }
  }, [pullDistance, isPullRefreshing, refreshExpenses]);

  // Get category by ID
  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  // Get user by ID
  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.id === userId);
  };

  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    // TODO: Navigate to edit page or open edit modal
    console.log('Edit expense:', expense);
  };

  // Handle delete expense
  const handleDeleteExpense = async (expense: Expense) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await useExpenseStore.getState().deleteExpense(expense.id);
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  // Render expense card
  const renderExpenseCard = (expense: Expense) => {
    const category = getCategoryById(expense.categoryId);
    const user = getUserById(expense.userId);

    return (
      <ExpenseCard
        key={expense.id}
        expense={expense}
        category={category}
        user={user}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />
    );
  };

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center py-4 transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <div
            className={`transition-transform ${
              isPullRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${pullDistance * 3.6}deg)`,
            }}
          >
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Expense list */}
        {expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map(renderExpenseCard)}
          </div>
        ) : (
          /* Empty state */
          !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No expenses yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start tracking your expenses by adding your first one
              </p>
            </div>
          )
        )}

        {/* Loading indicator for initial load */}
        {isLoading && expenses.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && expenses.length > 0 && (
          <div ref={observerTarget} className="py-4 flex justify-center">
            {isLoading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && expenses.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No more expenses to load</p>
          </div>
        )}
      </div>
    </div>
  );
};
