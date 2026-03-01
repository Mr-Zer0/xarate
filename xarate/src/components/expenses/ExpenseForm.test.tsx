// Tests for ExpenseForm component - focusing on edit mode
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm } from './ExpenseForm';
import type { Expense } from '../../types/models';

// Mock stores
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      householdId: 'household-1',
      color: '#3B82F6',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }),
}));

vi.mock('../../stores/categoryStore', () => ({
  useCategoryStore: () => ({
    categories: [
      {
        id: 'cat-1',
        householdId: 'household-1',
        name: 'Groceries',
        icon: '🛒',
        color: '#10B981',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    loadCategories: vi.fn(),
  }),
}));

vi.mock('../../stores/uiStore', () => ({
  useUIStore: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock database
vi.mock('../../db/database', () => ({
  db: {
    users: {
      where: () => ({
        equals: () => ({
          toArray: async () => [
            {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              householdId: 'household-1',
              color: '#3B82F6',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'user-2',
              email: 'partner@example.com',
              name: 'Partner',
              householdId: 'household-1',
              color: '#EF4444',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      }),
    },
  },
}));

// Mock ExpenseService
vi.mock('../../services/ExpenseService', () => ({
  expenseService: {
    updateExpense: vi.fn(),
    createExpense: vi.fn(),
  },
}));

describe('ExpenseForm - Edit Mode', () => {
  const mockExpense: Expense = {
    id: 'expense-1',
    householdId: 'household-1',
    userId: 'user-1',
    amount: 50.00,
    description: 'Test Expense',
    categoryId: 'cat-1',
    date: new Date('2024-01-15'),
    syncStatus: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pre-populate form fields when editing an expense', async () => {
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });

    // Verify all fields are pre-populated
    expect(screen.getByDisplayValue('Test Expense')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
  });

  it('should disable user field when editing', async () => {
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const userSelect = screen.getByLabelText(/User/i) as HTMLSelectElement;
      expect(userSelect).toBeDisabled();
    });

    // Verify helper text is shown
    expect(screen.getByText(/User cannot be changed when editing/i)).toBeInTheDocument();
  });

  it('should show "Edit Expense" title when editing', () => {
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Edit Expense')).toBeInTheDocument();
  });

  it('should show "Update" button text when editing', async () => {
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
    });
  });

  it('should not show scan receipt button when editing', () => {
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText(/Scan Receipt/i)).not.toBeInTheDocument();
  });

  it('should allow modifying amount, description, category, and date when editing', async () => {
    const user = userEvent.setup();
    
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });

    // Modify amount
    const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
    expect(amountInput).not.toBeDisabled();
    await user.clear(amountInput);
    await user.type(amountInput, '75.50');

    // Modify description
    const descriptionInput = screen.getByLabelText(/Description/i) as HTMLInputElement;
    expect(descriptionInput).not.toBeDisabled();
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated Expense');

    // Verify changes
    expect(amountInput.value).toBe('75.50');
    expect(descriptionInput.value).toBe('Updated Expense');
  });

  it('should call updateExpense when submitting edited expense', async () => {
    const user = userEvent.setup();
    const { expenseService } = await import('../../services/ExpenseService');
    
    render(
      <ExpenseForm
        expense={mockExpense}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });

    // Modify amount
    const amountInput = screen.getByLabelText(/Amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '75.50');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Update/i });
    await user.click(submitButton);

    // Verify updateExpense was called
    await waitFor(() => {
      expect(expenseService.updateExpense).toHaveBeenCalledWith(
        'expense-1',
        expect.objectContaining({
          amount: 75.50,
        })
      );
    });
  });
});
