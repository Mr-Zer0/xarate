// Category service with Supabase integration and offline-first support
import { supabase } from './supabase';
import { db } from '../db/database';
import type { ICategoryService } from '../types/services';
import type { Category } from '../types/models';
import { ValidationError } from '../types/errors';

export class CategoryService implements ICategoryService {
  /**
   * Create a new category
   */
  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    try {
      // Validate category name
      if (!category.name || category.name.trim().length === 0) {
        throw new ValidationError('Category name is required');
      }

      // Check for duplicate category name in the household
      const existingCategories = await this.listCategories();
      const duplicate = existingCategories.find(
        c => c.name.toLowerCase() === category.name.toLowerCase() && c.householdId === category.householdId
      );
      
      if (duplicate) {
        throw new ValidationError(`Category "${category.name}" already exists`);
      }

      // Map to database column names
      const dbCategory = {
        household_id: category.householdId,
        name: category.name,
        icon: category.icon || null,
        color: category.color,
        is_default: category.isDefault,
      };

      // Insert into Supabase
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .insert(dbCategory)
        .select()
        .single();

      if (categoryError) {
        throw new Error(`Failed to create category: ${categoryError.message}`);
      }

      const newCategory = this.mapCategoryFromDb(categoryData);

      // Save to IndexedDB for offline access
      await db.categories.put(newCategory);

      return newCategory;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    try {
      // Try to get from IndexedDB first (offline-first)
      const localCategory = await db.categories.get(id);
      
      if (localCategory) {
        return localCategory;
      }

      // If not in IndexedDB, fetch from Supabase
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (categoryError) {
        if (categoryError.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Failed to fetch category: ${categoryError.message}`);
      }

      if (!categoryData) {
        return null;
      }

      const category = this.mapCategoryFromDb(categoryData);

      // Save to IndexedDB
      await db.categories.put(category);

      return category;
    } catch (error) {
      throw new Error(`Failed to get category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    try {
      // Get existing category
      const existingCategory = await this.getCategory(id);
      
      if (!existingCategory) {
        throw new ValidationError('Category not found');
      }

      // Prevent updating default categories
      if (existingCategory.isDefault) {
        throw new ValidationError('Cannot modify default categories');
      }

      // Validate name if being updated
      if (updates.name !== undefined) {
        if (!updates.name || updates.name.trim().length === 0) {
          throw new ValidationError('Category name is required');
        }

        // Check for duplicate name
        const existingCategories = await this.listCategories();
        const duplicate = existingCategories.find(
          c => c.id !== id && 
               c.name.toLowerCase() === updates.name!.toLowerCase() && 
               c.householdId === existingCategory.householdId
        );
        
        if (duplicate) {
          throw new ValidationError(`Category "${updates.name}" already exists`);
        }
      }

      // Map to database column names
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.color !== undefined) dbUpdates.color = updates.color;

      // Update in Supabase
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (categoryError) {
        throw new Error(`Failed to update category: ${categoryError.message}`);
      }

      const updatedCategory = this.mapCategoryFromDb(categoryData);

      // Update in IndexedDB
      await db.categories.put(updatedCategory);

      return updatedCategory;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      // Get existing category
      const existingCategory = await this.getCategory(id);
      
      if (!existingCategory) {
        throw new ValidationError('Category not found');
      }

      // Prevent deleting default categories
      if (existingCategory.isDefault) {
        throw new ValidationError('Cannot delete default categories');
      }

      // Check if category has associated expenses
      const expensesWithCategory = await db.expenses
        .where('categoryId')
        .equals(id)
        .count();

      if (expensesWithCategory > 0) {
        // Get or create "Uncategorized" category
        const uncategorizedCategory = await this.getOrCreateUncategorizedCategory(existingCategory.householdId);

        // Reassign all expenses to "Uncategorized"
        const expenses = await db.expenses
          .where('categoryId')
          .equals(id)
          .toArray();

        for (const expense of expenses) {
          expense.categoryId = uncategorizedCategory.id;
          expense.syncStatus = 'pending';
          await db.expenses.put(expense);

          // Also update in Supabase
          await supabase
            .from('expenses')
            .update({ category_id: uncategorizedCategory.id })
            .eq('id', expense.id);
        }
      }

      // Delete from Supabase
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Failed to delete category: ${deleteError.message}`);
      }

      // Delete from IndexedDB
      await db.categories.delete(id);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all categories
   */
  async listCategories(): Promise<Category[]> {
    try {
      // Try to get from IndexedDB first (offline-first)
      const localCategories = await db.categories.toArray();

      // If we have local data, return it
      if (localCategories.length > 0) {
        // Still fetch from Supabase in background to sync
        this.syncCategoriesInBackground();
        return localCategories;
      }

      // If no local data, fetch from Supabase
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (categoriesError) {
        throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
      }

      const categories = categoriesData.map(cat => this.mapCategoryFromDb(cat));

      // Save to IndexedDB
      await db.categories.bulkPut(categories);

      return categories;
    } catch (error) {
      throw new Error(`Failed to list categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default categories
   */
  async getDefaultCategories(): Promise<Category[]> {
    try {
      const allCategories = await this.listCategories();
      return allCategories.filter(cat => cat.isDefault);
    } catch (error) {
      throw new Error(`Failed to get default categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize default categories for a household
   */
  async initializeDefaultCategories(): Promise<void> {
    try {
      // Get current user to determine household
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        throw new Error('No authenticated user');
      }

      // Get user's household
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('household_id')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData) {
        throw new Error('Failed to get user household');
      }

      const householdId = userData.household_id;

      // Check if default categories already exist
      const existingCategories = await db.categories
        .where('householdId')
        .equals(householdId)
        .toArray();

      if (existingCategories.length > 0) {
        console.log('Default categories already initialized');
        return;
      }

      // Define default categories
      const defaultCategories = [
        { name: 'Groceries', icon: '🛒', color: '#10B981' },
        { name: 'Dining', icon: '🍽️', color: '#F59E0B' },
        { name: 'Transportation', icon: '🚗', color: '#3B82F6' },
        { name: 'Utilities', icon: '💡', color: '#8B5CF6' },
        { name: 'Entertainment', icon: '🎬', color: '#EC4899' },
        { name: 'Healthcare', icon: '🏥', color: '#EF4444' },
        { name: 'Shopping', icon: '🛍️', color: '#14B8A6' },
        { name: 'Other', icon: '📦', color: '#6B7280' },
      ];

      const categoriesToInsert = defaultCategories.map(cat => ({
        household_id: householdId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        is_default: true,
      }));

      // Insert into Supabase
      const { data: insertedData, error: insertError } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select();

      if (insertError) {
        throw new Error(`Failed to initialize default categories: ${insertError.message}`);
      }

      // Save to IndexedDB
      const categories = insertedData.map(cat => this.mapCategoryFromDb(cat));
      await db.categories.bulkPut(categories);

      console.log('Default categories initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize default categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or create "Uncategorized" category for expense reassignment
   */
  private async getOrCreateUncategorizedCategory(householdId: string): Promise<Category> {
    try {
      // Try to find existing "Uncategorized" category
      const categories = await this.listCategories();
      const uncategorized = categories.find(
        cat => cat.name === 'Uncategorized' && cat.householdId === householdId
      );

      if (uncategorized) {
        return uncategorized;
      }

      // Create "Uncategorized" category
      return await this.createCategory({
        householdId,
        name: 'Uncategorized',
        icon: '📦',
        color: '#9CA3AF',
        isDefault: false,
      });
    } catch (error) {
      throw new Error(`Failed to get or create Uncategorized category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync categories in background (non-blocking)
   */
  private async syncCategoriesInBackground(): Promise<void> {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Background sync failed:', categoriesError);
        return;
      }

      const categories = categoriesData.map(cat => this.mapCategoryFromDb(cat));
      await db.categories.bulkPut(categories);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  /**
   * Map database category record to Category model
   */
  private mapCategoryFromDb(dbCategory: any): Category {
    const category: Category = {
      id: dbCategory.id as string,
      householdId: dbCategory.household_id as string,
      name: dbCategory.name as string,
      color: dbCategory.color as string,
      isDefault: dbCategory.is_default as boolean,
      createdAt: new Date(dbCategory.created_at as string),
      updatedAt: new Date(dbCategory.updated_at as string),
    };
    
    if (dbCategory.icon) {
      category.icon = dbCategory.icon as string;
    }
    
    return category;
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
