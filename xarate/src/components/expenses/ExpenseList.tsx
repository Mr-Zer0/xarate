// ExpenseList component - displays expenses with infinite scroll and pull-to-refresh
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useExpenseStore } from '../../stores/expenseStore';
import { useCategoryStore } from '../../stores/categoryStore';
import type { Expense, Category, User } from '../../types/models';
import { db } from '../../db/database';

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

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date): string => {
    const today = new Date();
    const expenseDate = new Date(date);
    
    // Check if today
    if (
      expenseDate.getDate() === today.getDate() &&
      expenseDate.getMonth() === today.getMonth() &&
      expenseDate.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }

    // Check if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      expenseDate.getDate() === yesterday.getDate() &&
      expenseDate.getMonth() === yesterday.getMonth() &&
      expenseDate.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }

    // Format as date
    return expenseDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: expenseDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Render expense card
  const renderExpenseCard = (expense: Expense) => {
    const category = getCategoryById(expense.categoryId);
    const user = getUserById(expense.userId);

    return (
      <div
        key={expense.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Category icon */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: `${category?.color || '#6B7280'}20` }}
            >
              {category?.icon || '📦'}
            </div>

            {/* Expense details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {expense.description}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {category?.name || 'Unknown'}
                  </p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
              </div>

              {/* Date and user */}
              <div className="flex items-center mt-2 space-x-3">
                <span className="text-xs text-gray-500">
                  {formatDate(expense.date)}
                </span>
                
                {user && (
                  <div className="flex items-center space-x-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-medium"
                      style={{ backgroundColor: user.color }}
                      title={user.name}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-500">{user.name}</span>
                  </div>
                )}
              </div>

              {/* Category color indicator */}
              <div
                className="mt-2 h-1 rounded-full"
                style={{ backgroundColor: category?.color || '#6B7280' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
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
