import { useEffect, useState } from 'react';
import { ExpenseSummary } from '../components/summary';
import { useExpenseStore } from '../stores/expenseStore';
import { useCategoryStore } from '../stores/categoryStore';
import type { ExpenseFilter } from '../types/models';

export function SummaryPage() {
  const [filter, setFilter] = useState<ExpenseFilter>({});
  const { loadExpenses } = useExpenseStore();
  const { loadCategories } = useCategoryStore();

  useEffect(() => {
    // Load initial data
    loadCategories();
    loadExpenses();
  }, [loadCategories, loadExpenses]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Summary</h1>
          <p className="text-sm text-gray-600 mt-1">
            View your spending breakdown and trends
          </p>
        </div>

        <ExpenseSummary filter={filter} onFilterChange={setFilter} />
      </div>
    </div>
  );
}
