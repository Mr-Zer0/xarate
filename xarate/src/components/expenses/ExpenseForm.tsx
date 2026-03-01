// Expense form component for adding and editing expenses
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { useUIStore } from '../../stores/uiStore';
import { db } from '../../db/database';
import type { Expense, User } from '../../types/models';

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Draft key for localStorage
const DRAFT_KEY = 'expense_form_draft';

interface FormData {
  amount: string;
  description: string;
  categoryId: string;
  date: string | undefined;
  userId: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  categoryId?: string;
  date?: string;
  userId?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSuccess, onCancel }) => {
  const { user: currentUser } = useAuthStore();
  const { categories, loadCategories } = useCategoryStore();
  const { showToast } = useUIStore();
  
  const [householdUsers, setHouseholdUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    userId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Load categories and household users on mount
  useEffect(() => {
    const loadData = async () => {
      // Load categories if not already loaded
      if (categories.length === 0) {
        await loadCategories();
      }

      // Load household users
      if (currentUser?.householdId) {
        try {
          const users = await db.users
            .where('householdId')
            .equals(currentUser.householdId)
            .toArray();
          setHouseholdUsers(users);
        } catch (error) {
          console.error('Failed to load household users:', error);
        }
      }
    };

    loadData();
  }, [categories.length, loadCategories, currentUser]);

  // Initialize form with expense data if editing, or load draft if creating
  useEffect(() => {
    if (expense) {
      // Editing existing expense
      setFormData({
        amount: expense.amount.toString(),
        description: expense.description,
        categoryId: expense.categoryId,
        date: expense.date.toISOString().split('T')[0],
        userId: expense.userId,
      });
    } else {
      // Creating new expense - try to load draft
      const draft = loadDraft();
      if (draft) {
        setFormData({
          ...draft,
          userId: currentUser?.id || '', // Always use current user
        });
      } else if (currentUser?.id) {
        setFormData(prev => ({
          ...prev,
          userId: currentUser.id,
        }));
      }
    }
  }, [expense, currentUser]);

  // Auto-save draft when form data changes (only for new expenses)
  useEffect(() => {
    if (!expense && formData.amount) {
      saveDraft(formData);
    }
  }, [formData, expense]);

  // Load draft from localStorage
  const loadDraft = (): FormData | null => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  };

  // Save draft to localStorage
  const saveDraft = (data: FormData) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  // Clear draft from localStorage
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  // Validate individual field
  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'amount':
        if (!value || value.trim() === '') {
          return 'Amount is required';
        }
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return 'Amount must be a valid number';
        }
        if (numValue <= 0) {
          return 'Amount must be greater than 0';
        }
        if (numValue > 999999.99) {
          return 'Amount is too large';
        }
        // Check for valid decimal places (max 2)
        const decimalParts = value.split('.');
        if (decimalParts.length > 1 && decimalParts[1] && decimalParts[1].length > 2) {
          return 'Amount can have at most 2 decimal places';
        }
        return undefined;

      case 'description':
        if (!value || value.trim() === '') {
          return 'Description is required';
        }
        if (value.trim().length < 2) {
          return 'Description must be at least 2 characters';
        }
        if (value.length > 200) {
          return 'Description must be 200 characters or less';
        }
        return undefined;

      case 'categoryId':
        if (!value) {
          return 'Category is required';
        }
        return undefined;

      case 'date':
        if (!value) {
          return 'Date is required';
        }
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return 'Invalid date';
        }
        // Check if date is not too far in the future (1 year)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (dateValue > oneYearFromNow) {
          return 'Date cannot be more than 1 year in the future';
        }
        return undefined;

      case 'userId':
        if (!value) {
          return 'User is required';
        }
        return undefined;

      default:
        return undefined;
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach(key => {
      const value = formData[key];
      if (value !== undefined) {
        const error = validateField(key, value);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle field change with real-time validation
  const handleFieldChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validate field in real-time
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Please fix the errors in the form');
      return;
    }

    if (!currentUser?.householdId) {
      showToast('error', 'No household found. Please complete setup first.');
      return;
    }

    if (!formData.date) {
      showToast('error', 'Date is required');
      return;
    }

    setLoading(true);

    try {
      const expenseData = {
        householdId: currentUser.householdId,
        userId: formData.userId,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        date: new Date(formData.date),
        syncStatus: 'pending' as const,
      };

      if (expense) {
        // Update existing expense
        const { expenseService } = await import('../../services/ExpenseService');
        await expenseService.updateExpense(expense.id, expenseData);
        showToast('success', 'Expense updated successfully');
      } else {
        // Create new expense
        const { expenseService } = await import('../../services/ExpenseService');
        await expenseService.createExpense(expenseData);
        showToast('success', 'Expense created successfully');
        
        // Clear draft after successful creation
        clearDraft();
        
        // Clear form for potential next entry
        setFormData({
          amount: '',
          description: '',
          categoryId: '',
          date: new Date().toISOString().split('T')[0],
          userId: currentUser?.id || '',
        });
        setErrors({});
      }

      // Call onSuccess callback to close modal/navigate
      onSuccess();
    } catch (err) {
      console.error('Form submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save expense. Please try again.';
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Ask for confirmation if there's unsaved data (only for new expenses)
    if (!expense && (formData.amount || formData.description)) {
      const confirmed = window.confirm(
        'You have unsaved changes. Your draft will be saved. Are you sure you want to cancel?'
      );
      if (!confirmed) {
        return;
      }
    }
    onCancel();
  };

  // Handle scan receipt button click
  const handleScanReceipt = () => {
    // TODO: This will be implemented in task 13 (OCR receipt scanning)
    // For now, show a placeholder message
    showToast('info', 'Receipt scanning will be available soon! OCR feature is coming in the next update.');
    
    // When OCR is implemented (task 13), this will:
    // 1. Open camera or file picker
    // 2. Process the receipt image with OCR
    // 3. Extract amount, date, and merchant name
    // 4. Pre-fill the form fields with extracted data
    // 5. Allow user to review and correct the data
  };

  // Pre-fill form with OCR data (will be called by OCR service in task 13)
  // This function will be used when OCR feature is implemented in task 13
  // Keeping it here for future integration
  /*
  const prefillFromOCR = (ocrData: {
    amount?: number;
    description?: string;
    date?: Date;
  }) => {
    const updates: Partial<FormData> = {};

    if (ocrData.amount !== undefined) {
      updates.amount = ocrData.amount.toFixed(2);
    }

    if (ocrData.description) {
      updates.description = ocrData.description;
    }

    if (ocrData.date) {
      updates.date = ocrData.date.toISOString().split('T')[0];
    }

    setFormData(prev => ({ ...prev, ...updates }));

    // Validate the pre-filled fields
    Object.entries(updates).forEach(([key, value]) => {
      const error = validateField(key as keyof FormData, value as string);
      setErrors(prev => ({
        ...prev,
        [key]: error,
      }));
    });

    showToast('success', 'Receipt data extracted! Please review and adjust if needed.');
  };
  */

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {expense ? 'Edit Expense' : 'Add Expense'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scan Receipt Button - Only show when creating new expense */}
          {!expense && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleScanReceipt}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm"
                disabled={loading}
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                </svg>
                <span>Scan Receipt</span>
              </button>
              <p className="mt-2 text-xs text-center text-gray-500">
                Quickly add expenses by scanning your receipt
              </p>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500 text-lg">$</span>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => handleFieldChange('amount', e.target.value)}
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={loading}
                autoFocus
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="e.g., Grocery shopping"
              disabled={loading}
              maxLength={200}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/200 characters
            </p>
          </div>

          {/* Category Dropdown */}
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => handleFieldChange('categoryId', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.categoryId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.date ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading}
              max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* User Selector */}
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
              User <span className="text-red-500">*</span>
            </label>
            <select
              id="userId"
              value={formData.userId}
              onChange={(e) => handleFieldChange('userId', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.userId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading || !!expense} // Disable when editing
            >
              <option value="">Select a user</option>
              {householdUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.id === currentUser?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
            {errors.userId && (
              <p className="mt-1 text-sm text-red-600">{errors.userId}</p>
            )}
            {expense && (
              <p className="mt-1 text-xs text-gray-500">
                User cannot be changed when editing an expense
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(key => errors[key as keyof FormErrors])}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : expense ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
