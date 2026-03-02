import type { CategorySummary } from '../../types/models';

interface CategoryBreakdownProps {
  categories: CategorySummary[];
  isLoading?: boolean;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryBreakdown({ 
  categories, 
  isLoading = false,
  onCategoryClick 
}: CategoryBreakdownProps) {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    if (onCategoryClick) {
      onCategoryClick(categoryId);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
        <div className="text-center py-8 text-gray-500">No expenses to display</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
      <div className="space-y-3">
        {categories.map((category) => (
          <button
            key={category.categoryId}
            onClick={() => handleCategoryClick(category.categoryId)}
            className="w-full text-left space-y-1 p-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Filter by ${category.categoryName}`}
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {category.categoryIcon && (
                  <span className="text-lg" aria-hidden="true">
                    {category.categoryIcon}
                  </span>
                )}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.categoryColor }}
                  aria-hidden="true"
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
                  role="progressbar"
                  aria-valuenow={category.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${category.categoryName} spending percentage`}
                />
              </div>
              <span className="text-xs text-gray-600 w-12 text-right">
                {category.percentage.toFixed(1)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
