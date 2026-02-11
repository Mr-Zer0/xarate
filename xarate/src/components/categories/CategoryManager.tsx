// Category management component with CRUD operations
import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/CategoryService';
import type { Category } from '../../types/models';
import { ValidationError } from '../../types/errors';
import { CategoryForm } from './CategoryForm';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

export const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [expenseCount, setExpenseCount] = useState<number>(0);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const loadedCategories = await categoryService.listCategories();
      setCategories(loadedCategories);
    } catch (err) {
      setError('Failed to load categories. Please try again.');
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowAddModal(true);
  };

  const handleEditCategory = (category: Category) => {
    if (category.isDefault) {
      return; // Cannot edit default categories
    }
    setEditingCategory(category);
    setShowAddModal(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.isDefault) {
      return; // Cannot delete default categories
    }

    // Check for associated expenses
    const { db } = await import('../../db/database');
    const count = await db.expenses
      .where('categoryId')
      .equals(category.id)
      .count();

    setExpenseCount(count);
    setDeletingCategory(category);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      setError('');
      await categoryService.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      setExpenseCount(0);
      await loadCategories();
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(err.message);
      } else {
        setError('Failed to delete category. Please try again.');
      }
      console.error('Failed to delete category:', err);
    }
  };

  const handleFormSuccess = async () => {
    setShowAddModal(false);
    setEditingCategory(null);
    await loadCategories();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
        <button
          onClick={handleAddCategory}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  {category.icon || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {category.name}
                  </h3>
                  {category.isDefault && (
                    <span className="inline-block mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
              </div>

              {!category.isDefault && (
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit category"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete category"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div
              className="mt-3 h-1 rounded-full"
              style={{ backgroundColor: category.color }}
            ></div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No categories yet</p>
          <button
            onClick={handleAddCategory}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first category
          </button>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showAddModal && (
        <CategoryForm
          category={editingCategory}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowAddModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <DeleteCategoryDialog
          category={deletingCategory}
          expenseCount={expenseCount}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeletingCategory(null);
            setExpenseCount(0);
          }}
        />
      )}
    </div>
  );
};
