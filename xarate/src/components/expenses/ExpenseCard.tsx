// ExpenseCard component - displays a single expense in a compact card format
import React, { useState } from 'react';
import type { Expense, Category, User } from '../../types/models';

interface ExpenseCardProps {
  expense: Expense;
  category?: Category;
  user?: User;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  category,
  user,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Format full date and time for expanded view
  const formatFullDateTime = (date: Date): string => {
    const expenseDate = new Date(date);
    return expenseDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(expense);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(expense);
    }
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Main card content */}
      <div className="p-4">
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

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
          {/* Full date and time */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Date & Time
            </p>
            <p className="text-sm text-gray-900">
              {formatFullDateTime(expense.date)}
            </p>
          </div>

          {/* Receipt thumbnail */}
          {expense.receiptImageUrl && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Receipt
              </p>
              <div className="relative inline-block">
                <img
                  src={expense.receiptImageUrl}
                  alt="Receipt"
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(expense.receiptImageUrl, '_blank');
                  }}
                  aria-label="View full receipt"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* OCR data */}
          {expense.ocrData && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                OCR Data
              </p>
              <div className="text-sm text-gray-700 space-y-1">
                {expense.ocrData.merchantName && (
                  <p>
                    <span className="font-medium">Merchant:</span> {expense.ocrData.merchantName}
                  </p>
                )}
                {expense.ocrData.confidence !== undefined && (
                  <p>
                    <span className="font-medium">Confidence:</span>{' '}
                    {Math.round(expense.ocrData.confidence * 100)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sync status */}
          {expense.syncStatus && expense.syncStatus !== 'synced' && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Sync Status
              </p>
              <div className="flex items-center space-x-2">
                {expense.syncStatus === 'pending' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-yellow-700">Pending sync</span>
                  </>
                )}
                {expense.syncStatus === 'conflict' && (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-700">Sync conflict</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2 pt-2">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                aria-label="Edit expense"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit</span>
                </div>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                aria-label="Delete expense"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Delete</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
