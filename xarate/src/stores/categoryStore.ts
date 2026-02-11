// Category store for managing categories list
import { create } from 'zustand';
import type { Category } from '../types/models';
import { categoryService } from '../services/CategoryService';

interface CategoryState {
  // State
  categories: Category[];
  selectedCategory: Category | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCategories: () => Promise<void>;
  createCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  selectCategory: (category: Category | null) => void;
  getDefaultCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;
  initializeDefaultCategories: () => Promise<void>;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  // Initial state
  categories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,

  // Load all categories
  loadCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryService.listCategories();
      set({
        categories,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load categories',
      });
    }
  },

  // Create a new category
  createCategory: async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ isLoading: true, error: null });
    try {
      const newCategory = await categoryService.createCategory(category);
      
      // Add to the list
      set({
        categories: [...get().categories, newCategory],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
      });
      throw error;
    }
  },

  // Update an existing category
  updateCategory: async (id: string, updates: Partial<Category>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCategory = await categoryService.updateCategory(id, updates);
      
      // Update in the list
      set({
        categories: get().categories.map(cat => 
          cat.id === id ? updatedCategory : cat
        ),
        selectedCategory: get().selectedCategory?.id === id ? updatedCategory : get().selectedCategory,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
      });
      throw error;
    }
  },

  // Delete a category
  deleteCategory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.deleteCategory(id);
      
      // Remove from the list
      set({
        categories: get().categories.filter(cat => cat.id !== id),
        selectedCategory: get().selectedCategory?.id === id ? null : get().selectedCategory,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      });
      throw error;
    }
  },

  // Select a category
  selectCategory: (category: Category | null) => {
    set({ selectedCategory: category });
  },

  // Get default categories
  getDefaultCategories: () => {
    return get().categories.filter(cat => cat.isDefault);
  },

  // Get category by ID
  getCategoryById: (id: string) => {
    return get().categories.find(cat => cat.id === id);
  },

  // Initialize default categories
  initializeDefaultCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.initializeDefaultCategories();
      
      // Reload categories after initialization
      await get().loadCategories();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize categories',
      });
      throw error;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
