// Service interface definitions

import type {
  Expense,
  ExpenseFilter,
  CategorySummary,
  UserSummary,
  User,
  Category,
  Household,
  Session,
  SyncOperation,
  QueueStatus,
  OCRResult,
} from './models';

export interface IExpenseService {
  // CRUD operations
  createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense>;
  getExpense(id: string): Promise<Expense | null>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  
  // Query operations
  listExpenses(filter?: ExpenseFilter, limit?: number, offset?: number): Promise<Expense[]>;
  getTotalAmount(filter?: ExpenseFilter): Promise<number>;
  getCategoryBreakdown(filter?: ExpenseFilter): Promise<CategorySummary[]>;
  getUserBreakdown(filter?: ExpenseFilter): Promise<UserSummary[]>;
}

export interface IUserService {
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  getUser(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  listUsers(): Promise<User[]>;
  getCurrentUser(): Promise<User | null>;
  setCurrentUser(id: string): Promise<void>;
}

export interface ICategoryService {
  // CRUD operations
  createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  getCategory(id: string): Promise<Category | null>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Query operations
  listCategories(): Promise<Category[]>;
  getDefaultCategories(): Promise<Category[]>;
  
  // Initialization
  initializeDefaultCategories(): Promise<void>;
}

export interface IAuthService {
  // Authentication
  signUp(email: string, password: string, name: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signInWithMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  
  // Session management
  getCurrentSession(): Promise<Session | null>;
  refreshSession(): Promise<Session>;
  
  // User management
  getCurrentUser(): Promise<User | null>;
  updateProfile(updates: Partial<User>): Promise<User>;
  
  // Household management
  createHousehold(name: string): Promise<Household>;
  inviteToHousehold(email: string): Promise<void>;
  acceptInvite(inviteCode: string): Promise<void>;
}

export interface ISyncService {
  // Sync operations
  syncExpenses(): Promise<void>;
  syncCategories(): Promise<void>;
  syncUsers(): Promise<void>;
  syncAll(): Promise<void>;
  
  // Real-time subscriptions
  subscribeToExpenses(callback: (expense: Expense) => void): () => void;
  subscribeToCategories(callback: (category: Category) => void): () => void;
  
  // Conflict resolution
  resolveConflict(localItem: any, remoteItem: any): any;
  
  // Queue management
  queueOperation(operation: SyncOperation): void;
  processQueue(): Promise<void>;
  getQueueStatus(): Promise<QueueStatus>;
}

export interface IOCRService {
  // Image capture
  captureFromCamera(): Promise<Blob>;
  selectFromGallery(): Promise<Blob>;
  
  // OCR processing
  processReceipt(image: Blob): Promise<OCRResult>;
  preprocessImage(image: Blob): Promise<Blob>;
  
  // Data extraction
  extractAmount(text: string): number | null;
  extractDate(text: string): Date | null;
  extractMerchant(text: string): string | null;
}
