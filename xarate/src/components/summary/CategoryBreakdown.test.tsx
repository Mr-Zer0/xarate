import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryBreakdown } from './CategoryBreakdown';
import type { CategorySummary } from '../../types/models';

describe('CategoryBreakdown', () => {
  const mockCategories: CategorySummary[] = [
    {
      categoryId: '1',
      categoryName: 'Groceries',
      categoryColor: '#10B981',
      categoryIcon: '🛒',
      total: 500,
      count: 10,
      percentage: 50,
    },
    {
      categoryId: '2',
      categoryName: 'Dining',
      categoryColor: '#F59E0B',
      categoryIcon: '🍽️',
      total: 300,
      count: 5,
      percentage: 30,
    },
    {
      categoryId: '3',
      categoryName: 'Transportation',
      categoryColor: '#3B82F6',
      categoryIcon: '🚗',
      total: 200,
      count: 3,
      percentage: 20,
    },
  ];

  it('renders category breakdown with all categories', () => {
    render(<CategoryBreakdown categories={mockCategories} />);

    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
  });

  it('displays category amounts and percentages', () => {
    render(<CategoryBreakdown categories={mockCategories} />);

    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  it('displays category counts', () => {
    render(<CategoryBreakdown categories={mockCategories} />);

    expect(screen.getByText('(10)')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('calls onCategoryClick when a category is clicked', () => {
    const onCategoryClick = vi.fn();
    render(<CategoryBreakdown categories={mockCategories} onCategoryClick={onCategoryClick} />);

    const groceriesButton = screen.getByLabelText('Filter by Groceries');
    fireEvent.click(groceriesButton);

    expect(onCategoryClick).toHaveBeenCalledWith('1');
  });

  it('shows loading state', () => {
    render(<CategoryBreakdown categories={[]} isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no categories', () => {
    render(<CategoryBreakdown categories={[]} isLoading={false} />);

    expect(screen.getByText('No expenses to display')).toBeInTheDocument();
  });

  it('renders progress bars with correct widths', () => {
    render(<CategoryBreakdown categories={mockCategories} />);

    const progressBars = screen.getAllByRole('progressbar');
    
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '50');
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '30');
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '20');
  });

  it('applies correct colors to category indicators and progress bars', () => {
    const { container } = render(<CategoryBreakdown categories={mockCategories} />);

    const colorIndicators = container.querySelectorAll('.w-3.h-3.rounded-full');
    expect(colorIndicators[0]).toHaveStyle({ backgroundColor: '#10B981' });
    expect(colorIndicators[1]).toHaveStyle({ backgroundColor: '#F59E0B' });
    expect(colorIndicators[2]).toHaveStyle({ backgroundColor: '#3B82F6' });
  });

  it('displays category icons when available', () => {
    render(<CategoryBreakdown categories={mockCategories} />);

    expect(screen.getByText('🛒')).toBeInTheDocument();
    expect(screen.getByText('🍽️')).toBeInTheDocument();
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });

  it('does not display icon when not available', () => {
    const categoriesWithoutIcons: CategorySummary[] = [
      {
        categoryId: '1',
        categoryName: 'Groceries',
        categoryColor: '#10B981',
        total: 500,
        count: 10,
        percentage: 50,
      },
    ];

    const { container } = render(<CategoryBreakdown categories={categoriesWithoutIcons} />);
    
    // Should not have any emoji icons
    const icons = container.querySelectorAll('.text-lg');
    expect(icons.length).toBe(0);
  });
});
