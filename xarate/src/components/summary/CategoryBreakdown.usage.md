# CategoryBreakdown Component Usage

## Overview
The `CategoryBreakdown` component displays a breakdown of expenses by category with visual indicators and allows users to tap on a category to filter expenses.

## Features
- ✅ Lists categories with amounts and percentages
- ✅ Displays visual progress bars
- ✅ Shows category colors (icons not included in CategorySummary type)
- ✅ Tap to filter expenses by category
- ✅ Loading and empty states
- ✅ Accessible with ARIA labels and keyboard navigation

## Props

```typescript
interface CategoryBreakdownProps {
  categories: CategorySummary[];  // Array of category summaries from ExpenseService
  isLoading?: boolean;            // Optional loading state
  onCategoryClick?: (categoryId: string) => void;  // Callback when category is clicked
}
```

## Usage Example

### Basic Usage
```tsx
import { CategoryBreakdown } from '../components/summary/CategoryBreakdown';
import { useExpenseStore } from '../stores/expenseStore';

function SummaryPage() {
  const { categoryBreakdown, isLoading } = useExpenseStore();

  return (
    <CategoryBreakdown 
      categories={categoryBreakdown}
      isLoading={isLoading}
    />
  );
}
```

### With Filter Callback
```tsx
import { CategoryBreakdown } from '../components/summary/CategoryBreakdown';
import { useExpenseStore } from '../stores/expenseStore';
import { useNavigate } from 'react-router-dom';

function SummaryPage() {
  const { categoryBreakdown, isLoading, setFilter } = useExpenseStore();
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    // Set filter to show only expenses from this category
    setFilter({ categoryIds: [categoryId] });
    
    // Navigate to expenses page
    navigate('/expenses');
  };

  return (
    <CategoryBreakdown 
      categories={categoryBreakdown}
      isLoading={isLoading}
      onCategoryClick={handleCategoryClick}
    />
  );
}
```

### Integration with ExpenseSummary
```tsx
import { ExpenseSummary } from '../components/summary/ExpenseSummary';
import { CategoryBreakdown } from '../components/summary/CategoryBreakdown';
import { useExpenseStore } from '../stores/expenseStore';

function SummaryPage() {
  const { 
    categoryBreakdown, 
    isLoading, 
    filter,
    setFilter 
  } = useExpenseStore();

  const handleCategoryClick = (categoryId: string) => {
    setFilter({ 
      ...filter,
      categoryIds: [categoryId] 
    });
  };

  return (
    <div className="space-y-6">
      <ExpenseSummary />
      
      <CategoryBreakdown 
        categories={categoryBreakdown}
        isLoading={isLoading}
        onCategoryClick={handleCategoryClick}
      />
    </div>
  );
}
```

## Data Source

The component expects data from `ExpenseService.getCategoryBreakdown()`:

```typescript
interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  count: number;
  percentage: number;
}
```

## Styling

The component uses Tailwind CSS and follows the existing design patterns:
- White background with rounded corners and shadow
- Hover effects on category items
- Smooth transitions for progress bars
- Responsive layout
- Focus indicators for accessibility

## Accessibility

- Each category button has an `aria-label` for screen readers
- Progress bars have proper ARIA attributes (`role="progressbar"`, `aria-valuenow`, etc.)
- Keyboard navigation supported
- Focus indicators visible
- Color indicators marked with `aria-hidden` since they're decorative

## Requirements Satisfied

✅ **Requirement 5.3**: Show spending breakdown by category
✅ **Requirement 10.3**: Simple, clean interface with good visual hierarchy
✅ Lists categories with amounts and percentages
✅ Displays visual progress bars
✅ Shows category colors
✅ Tap to filter expenses by category

## Note on Category Icons

The `CategorySummary` interface from `ExpenseService.getCategoryBreakdown()` does not include category icons. To add icons, you would need to:

1. Modify the `getCategoryBreakdown` method in `ExpenseService` to include the icon field
2. Update the `CategorySummary` interface to include `categoryIcon?: string`
3. Update the component to display the icon

Example modification:
```typescript
// In CategoryBreakdown.tsx
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
```
