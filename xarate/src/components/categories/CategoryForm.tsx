// Category form component for adding and editing categories
import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/CategoryService';
import type { Category } from '../../types/models';
import { ValidationError } from '../../types/errors';

interface CategoryFormProps {
  category?: Category | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Predefined color palette
const COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6B7280', // gray
  '#84CC16', // lime
  '#06B6D4', // cyan
  '#A855F7', // purple
];

// Predefined icon options
const ICONS = [
  '🛒', '🍽️', '🚗', '💡', '🎬', '🏥', '🛍️', '📦',
  '🏠', '✈️', '🎓', '💼', '🎮', '📱', '👕', '⚽',
  '🎵', '📚', '🍕', '☕', '🎨', '🔧', '💰', '🎁',
];

export const CategoryForm: React.FC<CategoryFormProps> = ({ category, onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6B7280');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form with category data if editing
  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon || '📦');
      setColor(category.color);
    }
  }, [category]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Category name is required');
      return false;
    }

    if (name.trim().length > 50) {
      setError('Category name must be 50 characters or less');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (category) {
        // Update existing category
        await categoryService.updateCategory(category.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        // Create new category
        // Get current user's household
        const { supabase } = await import('../../services/supabase');
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          throw new Error('No authenticated user');
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('household_id')
          .eq('id', authUser.id)
          .single();

        if (userError || !userData) {
          throw new Error('Failed to get user household');
        }

        await categoryService.createCategory({
          householdId: userData.household_id,
          name: name.trim(),
          icon,
          color,
          isDefault: false,
        });
      }

      onSuccess();
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(err.message);
      } else {
        setError(category ? 'Failed to update category' : 'Failed to create category');
      }
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {category ? 'Edit Category' : 'Add Category'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Groceries"
              disabled={loading}
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  onClick={() => setIcon(iconOption)}
                  className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg border-2 transition-all ${
                    icon === iconOption
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    color === colorOption
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  disabled={loading}
                  title={colorOption}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${color}20` }}
              >
                {icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{name || 'Category Name'}</p>
                <div
                  className="mt-1 h-1 w-20 rounded-full"
                  style={{ backgroundColor: color }}
                ></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
