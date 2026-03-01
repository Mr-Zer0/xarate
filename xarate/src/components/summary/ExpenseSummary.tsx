import { useEffect, useState } from 'react';
import { useExpenseStore } from '../../stores/expenseStore';
import type { ExpenseFilter } from '../../types/models';

type TimePeriod = 'this-month' | 'last-month' | 'custom';

interface ExpenseSummaryProps {
  filter?: ExpenseFilter;
  onFilterChange?: (filter: ExpenseFilter) => void;
}

export function ExpenseSummary({ filter, onFilterChange }: ExpenseSummaryProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');

  const { totalAmount, categoryBreakdown, userBreakdown, loadSummaries, isLoading } = useExpenseStore();

  // Calculate date range based on selected period
  const getDateRange = (period: TimePeriod): { dateFrom: Date; dateTo: Date } | null => {
    const now = new Date();
    
    if (period === 'this-month') {
      const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { dateFrom, dateTo };
    }
    
    if (period === 'last-month') {
      const dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const dateTo = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom, dateTo };
    }
    
    if (period === 'custom' && customDateFrom && customDateTo) {
      return {
        dateFrom: new Date(customDateFrom),
        dateTo: new Date(customDateTo),
      };
    }
    
    return null;
  };

  // Load summaries when period or filter changes
  useEffect(() => {
    const dateRange = getDateRange(timePeriod);
    const summaryFilter: ExpenseFilter = {
      ...filter,
      ...(dateRange && {
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
      }),
    };
    
    loadSummaries(summaryFilter);
  }, [timePeriod, customDateFrom, customDateTo, filter, loadSummaries]);

  // Handle period change
  const handlePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    
    if (period !== 'custom' && onFilterChange) {
      const dateRange = getDateRange(period);
      if (dateRange) {
        onFilterChange({
          ...filter,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
        });
      }
    }
  };

  // Handle custom date change
  const handleCustomDateChange = () => {
    if (customDateFrom && customDateTo && onFilterChange) {
      onFilterChange({
        ...filter,
        dateFrom: new Date(customDateFrom),
        dateTo: new Date(customDateTo),
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Time Period</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handlePeriodChange('this-month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timePeriod === 'this-month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => handlePeriodChange('last-month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timePeriod === 'last-month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => handlePeriodChange('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timePeriod === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range Inputs */}
        {timePeriod === 'custom' && (
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="date-from" className="block text-xs text-gray-600 mb-1">
                From
              </label>
              <input
                id="date-from"
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                onBlur={handleCustomDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="date-to" className="block text-xs text-gray-600 mb-1">
                To
              </label>
              <input
                id="date-to"
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                onBlur={handleCustomDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Total Spending */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-sm font-medium opacity-90 mb-2">Total Spending</h2>
        <p className="text-4xl font-bold">
          {isLoading ? '...' : formatCurrency(totalAmount)}
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : categoryBreakdown.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No expenses in this period</div>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map((category) => (
              <div key={category.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.categoryColor }}
                    />
                    <span className="font-medium text-gray-900">{category.categoryName}</span>
                    <span className="text-gray-500">({category.count})</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(category.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: category.categoryColor,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-12 text-right">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Breakdown */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">By User</h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : userBreakdown.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No expenses in this period</div>
        ) : (
          <div className="space-y-4">
            {userBreakdown.map((user) => (
              <div key={user.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.userName}</p>
                      <p className="text-xs text-gray-500">{user.count} expenses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(user.total)}</p>
                    <p className="text-xs text-gray-600">{user.percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${user.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
