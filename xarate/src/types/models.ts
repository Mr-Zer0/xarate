// Core data models for the expense tracker application

export interface User {
  id: string;              // UUID (matches Supabase auth user ID)
  email: string;           // User's email (from Supabase auth)
  name: string;            // User's display name
  avatar?: string;         // Avatar URL (Supabase Storage) or emoji
  color: string;           // Theme color for user
  householdId: string;     // Reference to shared household
  createdAt: Date;
  updatedAt: Date;
}

export interface Household {
  id: string;              // UUID
  name: string;            // Household name (e.g., "Smith Family")
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;              // UUID
  householdId: string;     // Reference to household
  name: string;            // Category name
  icon?: string;           // Icon name or emoji
  color: string;           // Color hex code
  isDefault: boolean;      // True for system categories
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;              // UUID
  householdId: string;     // Reference to household
  userId: string;          // Reference to User
  amount: number;          // Decimal amount (stored as numeric in PostgreSQL)
  description: string;     // Expense description
  categoryId: string;      // Reference to Category
  date: Date;              // Expense date
  receiptImageUrl?: string;// Supabase Storage URL
  ocrData?: OCRData;       // OCR extracted data (JSONB in PostgreSQL)
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict'; // Local only, not in DB
}

export interface OCRData {
  merchantName?: string;
  extractedAmount?: number;
  extractedDate?: Date;
  confidence: number;      // 0-1 confidence score
  rawText: string;         // Full OCR text
}

export interface ExpenseFilter {
  userIds?: string[];
  categoryIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'expense' | 'category' | 'user';
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface QueueStatus {
  pending: number;
  failed: number;
  lastSync: Date | null;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon?: string;
  total: number;
  count: number;
  percentage: number;
}

export interface UserSummary {
  userId: string;
  userName: string;
  total: number;
  count: number;
  percentage: number;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: User;
}

export interface OCRResult {
  text: string;
  confidence: number;
  amount?: number;
  date?: Date;
  merchant?: string;
}
