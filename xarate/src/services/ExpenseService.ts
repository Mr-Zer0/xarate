// Expense service with Supabase integration and offline-first support
import { supabase } from './supabase';
import { db } from '../db/database';
import { receiptStorageService } from './ReceiptStorageService';
import type { IExpenseService } from '../types/services';
import type { Expense, ExpenseFilter, CategorySummary, UserSummary } from '../types/models';
import { ValidationError } from '../types/errors';

export class ExpenseService implements IExpenseService {
  /**
   * Create a new expense
   * Saves to IndexedDB first for instant UI update, then queues for sync
   */
  async createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    try {
      // Validate required fields
      if (!expense.amount || expense.amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      if (!expense.description || expense.description.trim().length === 0) {
        throw new ValidationError('Description is required');
      }

      if (!expense.categoryId) {
        throw new ValidationError('Category is required');
      }

      if (!expense.userId) {
        throw new ValidationError('User is required');
      }

      if (!expense.householdId) {
        throw new ValidationError('Household is required');
      }

      // Map to database column names
      const dbExpense = {
        household_id: expense.householdId,
        user_id: expense.userId,
        category_id: expense.categoryId,
        amount: expense.amount,
        description: expense.description,
        date: expense.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        receipt_image_url: expense.receiptImageUrl || null,
        ocr_data: expense.ocrData || null,
      };

      // Insert into Supabase
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert(dbExpense)
        .select()
        .single();

      if (expenseError) {
        throw new Error(`Failed to create expense: ${expenseError.message}`);
      }

      const newExpense = this.mapExpenseFromDb(expenseData);

      // Save to IndexedDB for offline access
      await db.expenses.put(newExpense);

      return newExpense;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get an expense by ID
   */
  async getExpense(id: string): Promise<Expense | null> {
    try {
      // Try to get from IndexedDB first (offline-first)
      const localExpense = await db.expenses.get(id);
      
      if (localExpense) {
        return localExpense;
      }

      // If not in IndexedDB, fetch from Supabase
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (expenseError) {
        if (expenseError.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Failed to fetch expense: ${expenseError.message}`);
      }

      if (!expenseData) {
        return null;
      }

      const expense = this.mapExpenseFromDb(expenseData);

      // Save to IndexedDB
      await db.expenses.put(expense);

      return expense;
    } catch (error) {
      throw new Error(`Failed to get expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an expense
   */
  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      // Get existing expense
      const existingExpense = await this.getExpense(id);
      
      if (!existingExpense) {
        throw new ValidationError('Expense not found');
      }

      // Validate updates
      if (updates.amount !== undefined && updates.amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      if (updates.description !== undefined && updates.description.trim().length === 0) {
        throw new ValidationError('Description is required');
      }

      // Map to database column names
      const dbUpdates: any = {};
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString().split('T')[0];
      if (updates.receiptImageUrl !== undefined) dbUpdates.receipt_image_url = updates.receiptImageUrl;
      if (updates.ocrData !== undefined) dbUpdates.ocr_data = updates.ocrData;

      // Update in Supabase
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (expenseError) {
        throw new Error(`Failed to update expense: ${expenseError.message}`);
      }

      const updatedExpense = this.mapExpenseFromDb(expenseData);

      // Update in IndexedDB
      await db.expenses.put(updatedExpense);

      return updatedExpense;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an expense
   */
  async deleteExpense(id: string): Promise<void> {
    try {
      // Get existing expense
      const existingExpense = await this.getExpense(id);
      
      if (!existingExpense) {
        throw new ValidationError('Expense not found');
      }

      // Delete receipt image if exists
      if (existingExpense.receiptImageUrl) {
        await receiptStorageService.deleteReceipt(existingExpense.receiptImageUrl);
      }

      // Delete from Supabase
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Failed to delete expense: ${deleteError.message}`);
      }

      // Delete from IndexedDB
      await db.expenses.delete(id);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to delete expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List expenses with optional filtering and pagination
   */
  async listExpenses(filter?: ExpenseFilter, limit?: number, offset: number = 0): Promise<Expense[]> {
    try {
      // Build query
      let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter) {
        if (filter.userIds && filter.userIds.length > 0) {
          query = query.in('user_id', filter.userIds);
        }

        if (filter.categoryIds && filter.categoryIds.length > 0) {
          query = query.in('category_id', filter.categoryIds);
        }

        if (filter.dateFrom) {
          query = query.gte('date', filter.dateFrom.toISOString().split('T')[0]);
        }

        if (filter.dateTo) {
          query = query.lte('date', filter.dateTo.toISOString().split('T')[0]);
        }

        if (filter.searchText && filter.searchText.trim().length > 0) {
          query = query.ilike('description', `%${filter.searchText}%`);
        }
      }

      // Apply pagination
      if (limit !== undefined) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data: expensesData, error: expensesError } = await query;

      if (expensesError) {
        throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
      }

      const expenses = expensesData.map(exp => this.mapExpenseFromDb(exp));

      // Save to IndexedDB for offline access
      await db.expenses.bulkPut(expenses);

      return expenses;
    } catch (error) {
      // If online query fails, try to get from IndexedDB
      console.error('Failed to fetch from Supabase, trying IndexedDB:', error);
      return this.listExpensesFromIndexedDB(filter, limit, offset);
    }
  }

  /**
   * Get total amount for filtered expenses
   */
  async getTotalAmount(filter?: ExpenseFilter): Promise<number> {
    try {
      const expenses = await this.listExpenses(filter);
      return expenses.reduce((total, expense) => total + expense.amount, 0);
    } catch (error) {
      throw new Error(`Failed to get total amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get spending breakdown by category
   */
  async getCategoryBreakdown(filter?: ExpenseFilter): Promise<CategorySummary[]> {
    try {
      const expenses = await this.listExpenses(filter);
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Group by category
      const categoryMap = new Map<string, { total: number; count: number }>();

      for (const expense of expenses) {
        const existing = categoryMap.get(expense.categoryId) || { total: 0, count: 0 };
        categoryMap.set(expense.categoryId, {
          total: existing.total + expense.amount,
          count: existing.count + 1,
        });
      }

      // Fetch category details
      const categories = await db.categories.toArray();
      const categoryLookup = new Map(categories.map(cat => [cat.id, cat]));

      // Build summary
      const breakdown: CategorySummary[] = [];

      for (const [categoryId, stats] of categoryMap.entries()) {
        const category = categoryLookup.get(categoryId);
        
        breakdown.push({
          categoryId,
          categoryName: category?.name || 'Unknown',
          categoryColor: category?.color || '#6B7280',
          total: stats.total,
          count: stats.count,
          percentage: total > 0 ? (stats.total / total) * 100 : 0,
        });
      }

      // Sort by total descending
      breakdown.sort((a, b) => b.total - a.total);

      return breakdown;
    } catch (error) {
      throw new Error(`Failed to get category breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get spending breakdown by user
   */
  async getUserBreakdown(filter?: ExpenseFilter): Promise<UserSummary[]> {
    try {
      const expenses = await this.listExpenses(filter);
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Group by user
      const userMap = new Map<string, { total: number; count: number }>();

      for (const expense of expenses) {
        const existing = userMap.get(expense.userId) || { total: 0, count: 0 };
        userMap.set(expense.userId, {
          total: existing.total + expense.amount,
          count: existing.count + 1,
        });
      }

      // Fetch user details
      const users = await db.users.toArray();
      const userLookup = new Map(users.map(user => [user.id, user]));

      // Build summary
      const breakdown: UserSummary[] = [];

      for (const [userId, stats] of userMap.entries()) {
        const user = userLookup.get(userId);
        
        breakdown.push({
          userId,
          userName: user?.name || 'Unknown',
          total: stats.total,
          count: stats.count,
          percentage: total > 0 ? (stats.total / total) * 100 : 0,
        });
      }

      // Sort by total descending
      breakdown.sort((a, b) => b.total - a.total);

      return breakdown;
    } catch (error) {
      throw new Error(`Failed to get user breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List expenses from IndexedDB (offline fallback)
   */
  private async listExpensesFromIndexedDB(
    filter?: ExpenseFilter,
    limit?: number,
    offset: number = 0
  ): Promise<Expense[]> {
    try {
      let collection = db.expenses.orderBy('date').reverse();

      // Apply filters
      if (filter) {
        if (filter.userIds && filter.userIds.length > 0) {
          collection = collection.filter(exp => filter.userIds!.includes(exp.userId));
        }

        if (filter.categoryIds && filter.categoryIds.length > 0) {
          collection = collection.filter(exp => filter.categoryIds!.includes(exp.categoryId));
        }

        if (filter.dateFrom) {
          collection = collection.filter(exp => exp.date >= filter.dateFrom!);
        }

        if (filter.dateTo) {
          collection = collection.filter(exp => exp.date <= filter.dateTo!);
        }

        if (filter.searchText && filter.searchText.trim().length > 0) {
          const searchLower = filter.searchText.toLowerCase();
          collection = collection.filter(exp => 
            exp.description.toLowerCase().includes(searchLower)
          );
        }
      }

      // Apply pagination
      if (limit !== undefined) {
        collection = collection.offset(offset).limit(limit);
      }

      return await collection.toArray();
    } catch (error) {
      throw new Error(`Failed to list expenses from IndexedDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database expense record to Expense model
   */
  private mapExpenseFromDb(dbExpense: any): Expense {
    const expense: Expense = {
      id: dbExpense.id as string,
      householdId: dbExpense.household_id as string,
      userId: dbExpense.user_id as string,
      categoryId: dbExpense.category_id as string,
      amount: parseFloat(dbExpense.amount as string),
      description: dbExpense.description as string,
      date: new Date(dbExpense.date as string),
      createdAt: new Date(dbExpense.created_at as string),
      updatedAt: new Date(dbExpense.updated_at as string),
      syncStatus: 'synced',
    };
    
    if (dbExpense.receipt_image_url) {
      expense.receiptImageUrl = dbExpense.receipt_image_url as string;
    }
    
    if (dbExpense.ocr_data) {
      expense.ocrData = dbExpense.ocr_data;
    }
    
    return expense;
  }
}

// Export singleton instance
export const expenseService = new ExpenseService();
