// ExpenseFilters component - filter panel for expenses
import React, { useState, useEffect } from 'react';
import { useExpenseStore } from '../../stores/expenseStore';
import { useCategoryStore } from '../../stores/categoryStore';
import type { ExpenseFilter, User } from '../../types/models';
import { db } from '../../db/database';

export const ExpenseFilters: React.FC = () => {
  const { filter, setFilter, clearFilter } = useExpenseStore();
  const { categories } = useCategoryStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Local state for filter inputs
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(filter.userIds || []);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(filter.categoryIds || []);
  const [dateFrom, setDateFrom] = useState<string>(
    filter.dateFrom ? formatDateForInput(filter.dateFrom) : ''
  );
  const [dateTo, setDateTo] = useState<string>(
    filter.dateTo ? formatDateForInput(filter.dateTo) : ''
  );

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const loadedUsers = await db.users.toArray();
        setUsers(loadedUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadUsers();
  }, []);

  // Sync local state with store filter
  useEffect(() => {
    setSelectedUserIds(filter.userIds || []);
    setSelectedCategoryIds(filter.categoryIds || []);
    setDateFrom(filter.dateFrom ? formatDateForInput(filter.dateFrom) : '');
    setDateTo(filter.dateTo ? formatDateForInput(filter.dateTo) : '');
  }, [filter]);

  // Format date for input field (YYYY-MM-DD)
  function formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Apply filters
  const handleApplyFilters = () => {
    const newFilter: ExpenseFilter = {};
    
    if (selectedUserIds.length > 0) {
      newFilter.userIds = selectedUserIds;
    }
    
    if (selectedCategoryIds.length > 0) {
      newFilter.categoryIds = selectedCategoryIds;
    }
    
    if (dateFrom) {
      newFilter.dateFrom = new Date(dateFrom);
    }
    
    if (dateTo) {
      newFilter.dateTo = new Date(dateTo);
    }
    
    setFilter(newFilter);
    setIsExpanded(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedUserIds([]);
    setSelectedCategoryIds([]);
    setDateFrom('');
    setDateTo('');
    clearFilter();
  };

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Remove individual filter chip
  const removeUserFilter = (userId: string) => {
    const newUserIds = (filter.userIds || []).filter(id => id !== userId);
    setFilter({
      ...filter,
      userIds: newUserIds.length > 0 ? newUserIds : undefined,
    });
  };

  const removeCategoryFilter = (categoryId: string) => {
    const newCategoryIds = (filter.categoryIds || []).filter(id => id !== categoryId);
    setFilter({
      ...filter,
      categoryIds: newCategoryIds.length > 0 ? newCategoryIds : undefined,
    });
  };

  const removeDateFilter = () => {
    setFilter({
      ...filter,
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  // Check if any filters are active
  const hasActiveFilters = 
    (filter.userIds && filter.userIds.length > 0) ||
    (filter.categoryIds && filter.categoryIds.length > 0) ||
    filter.dateFrom ||
    filter.dateTo;

  // Get user name by ID
  const getUserName = (userId: string): string => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string): string => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Filter toggle button and active chips */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                {(filter.userIds?.length || 0) + (filter.categoryIds?.length || 0) + (filter.dateFrom || filter.dateTo ? 1 : 0)}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {/* User filter chips */}
            {filter.userIds?.map(userId => (
              <div
                key={userId}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                <span>{getUserName(userId)}</span>
                <button
                  onClick={() => removeUserFilter(userId)}
                  className="hover:bg-blue-100 rounded-full p-0.5"
                  aria-label={`Remove ${getUserName(userId)} filter`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Category filter chips */}
            {filter.categoryIds?.map(categoryId => {
              const category = categories.find(c => c.id === categoryId);
              return (
                <div
                  key={categoryId}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: category?.color ? `${category.color}20` : '#f3f4f6',
                    color: category?.color || '#374151',
                  }}
                >
                  {category?.icon && <span>{category.icon}</span>}
                  <span>{getCategoryName(categoryId)}</span>
                  <button
                    onClick={() => removeCategoryFilter(categoryId)}
                    className="hover:opacity-70 rounded-full p-0.5"
                    aria-label={`Remove ${getCategoryName(categoryId)} filter`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* Date range filter chip */}
            {(filter.dateFrom || filter.dateTo) && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                <span>
                  {filter.dateFrom && filter.dateTo
                    ? `${formatDateForInput(filter.dateFrom)} - ${formatDateForInput(filter.dateTo)}`
                    : filter.dateFrom
                    ? `From ${formatDateForInput(filter.dateFrom)}`
                    : `Until ${formatDateForInput(filter.dateTo!)}`}
                </span>
                <button
                  onClick={removeDateFilter}
                  className="hover:bg-purple-100 rounded-full p-0.5"
                  aria-label="Remove date filter"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded filter panel */}
      {isExpanded && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* User filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User
              </label>
              <div className="space-y-2">
                {users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map(category => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      {category.icon && <span className="text-lg">{category.icon}</span>}
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="space-y-3">
                <div>
                  <label htmlFor="dateFrom" className="block text-xs text-gray-600 mb-1">
                    From
                  </label>
                  <input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="dateTo" className="block text-xs text-gray-600 mb-1">
                    To
                  </label>
                  <input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
