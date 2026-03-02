# Implementation Plan

- [x] 1. Initialize project structure and dependencies
  - Create React + TypeScript + Vite project
  - Install core dependencies: React Router, Zustand, Tailwind CSS, Dexie.js, Supabase client, Workbox
  - Configure TypeScript with strict mode
  - Set up Tailwind CSS configuration
  - Create folder structure: components, services, stores, types, utils
  - _Requirements: 8.1, 10.1_

- [x] 2. Set up Supabase backend
  - Create Supabase project and obtain API keys
  - Write and execute database migration SQL (households, users, categories, expenses tables)
  - Configure Row Level Security policies for all tables
  - Create storage bucket for receipts with access policies
  - Set up authentication providers (email/password)
  - Create .env file with Supabase credentials
  - _Requirements: 1.1, 7.1, 8.5_

- [x] 3. Implement core TypeScript types and interfaces
  - Define User, Household, Category, Expense interfaces
  - Define OCRData, ExpenseFilter, SyncOperation interfaces
  - Define service interfaces (IExpenseService, IUserService, ICategoryService, IAuthService, ISyncService, IOCRService)
  - Define error types and enums
  - _Requirements: All requirements (foundation)_

- [x] 4. Implement IndexedDB setup with Dexie.js
  - Create Dexie database class with schema definition
  - Define object stores: households, users, categories, expenses, settings, sync_queue
  - Create indexes for efficient querying
  - Implement database initialization and migration logic
  - _Requirements: 7.1, 7.2, 7.3, 8.3_

- [x] 5. Implement authentication service and UI
- [x] 5.1 Create AuthService with Supabase integration
  - Implement signUp, signIn, signInWithMagicLink, signOut methods
  - Implement session management (getCurrentSession, refreshSession)
  - Implement getCurrentUser and updateProfile methods
  - Handle authentication errors and token refresh
  - _Requirements: 1.1, 1.2_

- [x] 5.2 Create authentication UI components
  - Build LoginForm component with email/password fields
  - Build SignupForm component with email, password, name fields
  - Create AuthLayout wrapper component
  - Implement form validation and error display
  - Add loading states and success feedback
  - _Requirements: 1.1, 1.2, 10.2, 10.4_

- [x] 5.3 Implement protected route wrapper
  - Create ProtectedRoute component that checks authentication
  - Redirect unauthenticated users to login
  - Handle session expiration gracefully
  - _Requirements: 1.1_

- [x] 6. Implement household setup flow
- [x] 6.1 Create household creation logic
  - Implement createHousehold method in AuthService
  - Automatically create household on first user signup
  - Initialize default categories for new household
  - _Requirements: 1.1, 3.1_

- [x] 6.2 Build household setup UI
  - Create HouseholdSetup component for first-time users
  - Collect household name
  - Create user profile with name, color selection
  - Show success message and navigate to main app
  - _Requirements: 1.1, 1.2, 10.2_

- [x] 7. Implement CategoryService and category management
- [x] 7.1 Create CategoryService with CRUD operations
  - Implement createCategory, getCategory, updateCategory, deleteCategory methods
  - Implement listCategories and getDefaultCategories methods
  - Implement initializeDefaultCategories with 8 default categories
  - Sync category operations with Supabase
  - Handle category deletion with expense reassignment logic
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12_

- [x] 7.2 Build CategoryManager UI component
  - Display list of all categories with icons and colors
  - Implement add new category button and modal
  - Create category form with name, icon picker, color picker
  - Implement edit category functionality
  - Implement delete category with confirmation dialog
  - Show warning if category has associated expenses
  - Disable delete/edit for default categories
  - _Requirements: 3.4, 3.5, 3.7, 3.8, 3.9, 3.12_

- [ ] 8. Implement ExpenseService with offline-first sync
- [x] 8.1 Create ExpenseService with CRUD operations
  - Implement createExpense method (save to IndexedDB, queue for sync)
  - Implement getExpense, updateExpense, deleteExpense methods
  - Implement listExpenses with filtering and pagination
  - Implement getTotalAmount, getCategoryBreakdown, getUserBreakdown methods
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1_

- [x] 8.2 Implement SyncService for Supabase synchronization
  - Implement syncExpenses, syncCategories, syncUsers methods
  - Implement queue management (queueOperation, processQueue)
  - Implement conflict resolution with last-write-wins strategy
  - Implement real-time subscriptions for expenses, categories, users
  - Handle offline queue processing when connection restored
  - Implement exponential backoff for failed sync operations
  - _Requirements: 7.1, 8.3, 8.4, 8.5_

- [x] 9. Create Zustand stores for state management
  - Create authStore (user session, authentication state)
  - Create expenseStore (expenses list, filters, selected expense)
  - Create categoryStore (categories list)
  - Create uiStore (loading states, modals, toasts, sync status)
  - Connect stores to services
  - _Requirements: All requirements (state management foundation)_

- [ ] 10. Build expense list and filtering UI
- [x] 10.1 Create ExpenseList component
  - Display expenses in card layout sorted by date (most recent first)
  - Show amount, description, category icon/color, date, user avatar
  - Implement infinite scroll or pagination
  - Add pull-to-refresh for mobile
  - Show empty state when no expenses
  - _Requirements: 4.1, 4.2, 10.1, 10.3, 10.6_

- [x] 10.2 Create ExpenseCard component
  - Display expense summary in compact card
  - Show category color indicator
  - Display user avatar/name
  - Add tap to expand for details
  - Show edit and delete action buttons
  - Display receipt thumbnail if available
  - _Requirements: 4.2, 6.1, 6.4, 10.3_

- [x] 10.3 Create ExpenseFilters component
  - Build filter panel with user, category, date range filters
  - Implement date range picker
  - Add clear filters button
  - Display active filter chips
  - Update expense list when filters change
  - _Requirements: 4.3, 4.4, 4.5_

- [ ] 11. Build expense form for adding and editing
- [x] 11.1 Create ExpenseForm component
  - Build form with amount, description, category, date, user fields
  - Implement real-time validation (required fields, amount format)
  - Add category dropdown with all categories
  - Add date picker with default to today
  - Show user selector (current user pre-selected)
  - Display validation errors inline
  - Implement auto-save draft to prevent data loss
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 6.2, 6.3, 10.2, 10.4_

- [x] 11.2 Implement form submission and feedback
  - Handle form submit (create or update expense)
  - Show loading state during save
  - Display success toast on save
  - Display error toast on failure
  - Clear form after successful creation
  - Navigate back to list after save
  - _Requirements: 2.4, 2.5, 7.1, 10.4_

- [x] 11.3 Add scan receipt button to form
  - Add prominent "Scan Receipt" button with camera icon
  - Integrate with OCR flow (implemented in task 13)
  - Pre-fill form fields with OCR data when available
  - _Requirements: 9.1, 9.7_

- [ ] 12. Implement expense editing and deletion
- [x] 12.1 Create edit expense flow
  - Load expense data into ExpenseForm
  - Pre-populate all fields except user (locked)
  - Save updates to IndexedDB and sync to Supabase
  - Show success feedback
  - _Requirements: 6.1, 6.2, 6.3, 10.4_

- [x] 12.2 Implement delete expense functionality
  - Add delete button to ExpenseCard
  - Show confirmation dialog before deletion
  - Delete from IndexedDB and sync to Supabase
  - Update expense list immediately
  - Show success toast
  - _Requirements: 6.4, 6.5, 6.6, 10.4_

- [ ] 13. Implement OCR receipt scanning feature
- [x] 13.1 Create OCRService with Tesseract.js
  - Install and configure Tesseract.js
  - Implement captureFromCamera using Camera API
  - Implement selectFromGallery for file upload
  - Implement preprocessImage (grayscale, contrast adjustment)
  - Implement processReceipt method with OCR processing
  - Implement extractAmount, extractDate, extractMerchant parsers
  - Handle OCR errors gracefully
  - _Requirements: 9.1, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 13.2 Build ReceiptScanner UI component
  - Create camera viewfinder interface
  - Add capture button and gallery upload option
  - Request camera permission with proper messaging
  - Show permission denied message and fallback
  - Display image preview with crop/rotate tools
  - Show processing indicator during OCR
  - Display extracted data with confidence scores
  - Allow manual correction of extracted fields
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7, 9.8, 9.9_

- [x] 13.3 Implement receipt image storage
  - Upload receipt image to Supabase Storage
  - Generate unique filename with household_id/expense_id path
  - Compress image before upload (max 800px width)
  - Store image URL in expense record
  - Display receipt thumbnail in ExpenseCard
  - _Requirements: 9.10_

- [ ] 14. Build summary and analytics views
- [x] 14.1 Create ExpenseSummary component
  - Display total spending prominently
  - Add time period selector (This Month, Last Month, Custom Range)
  - Calculate and display spending by category (pie/bar chart)
  - Calculate and display spending by user (comparison)
  - Update summaries when filters change
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.3_

- [x] 14.2 Create CategoryBreakdown component
  - List categories with amounts and percentages
  - Display visual progress bars
  - Show category colors and icons
  - Add tap to filter expenses by category
  - _Requirements: 5.3, 10.3_

- [ ] 15. Implement app layout and navigation
- [x] 15.1 Create AppShell layout component
  - Build responsive layout with header and navigation
  - Add app title and user switcher in header
  - Implement bottom navigation for mobile (Expenses, Add, Summary)
  - Implement sidebar navigation for desktop
  - Add sync status indicator
  - _Requirements: 10.1, 10.3, 10.5, 10.6_

- [x] 15.2 Set up React Router navigation
  - Define routes: /login, /signup, /setup, /expenses, /add, /edit/:id, /summary, /categories
  - Implement route guards for authentication
  - Add navigation transitions
  - Handle 404 page
  - _Requirements: 10.1_

- [x] 15.3 Create floating action button for mobile
  - Add FAB for quick expense entry on mobile
  - Position fixed at bottom right
  - Navigate to add expense form on tap
  - _Requirements: 10.1, 10.6_

- [ ] 16. Implement PWA functionality
- [ ] 16.1 Create Web App Manifest
  - Define app name, short name, description
  - Add app icons (192x192, 512x512)
  - Set display mode to standalone
  - Define theme color and background color
  - Set start URL and scope
  - _Requirements: 8.1, 8.6, 8.7_

- [ ] 16.2 Configure service worker with Workbox
  - Set up Workbox in Vite configuration
  - Implement cache-first strategy for app shell
  - Implement network-first strategy for API calls
  - Add offline fallback page
  - Implement background sync for queued operations
  - Handle service worker updates
  - _Requirements: 8.3, 8.4, 8.5, 8.7_

- [ ] 16.3 Add install prompt and offline indicator
  - Detect PWA install availability
  - Show install prompt banner
  - Add "Add to Home Screen" button in settings
  - Display offline indicator when no connection
  - Show sync status (syncing, synced, offline)
  - _Requirements: 8.2, 8.3, 8.4_

- [ ] 17. Implement error handling and user feedback
  - Create Toast notification component for success/error messages
  - Create ErrorBoundary component for React errors
  - Implement global error handler for uncaught errors
  - Add loading spinners for async operations
  - Create confirmation dialog component
  - Implement retry logic for failed operations
  - _Requirements: 2.5, 7.4, 9.3, 9.9, 10.4_

- [ ] 18. Add responsive design and mobile optimizations
  - Implement mobile-first responsive layouts
  - Optimize touch targets (minimum 44x44px)
  - Add touch gestures (swipe to delete, pull to refresh)
  - Test on various screen sizes (mobile, tablet, desktop)
  - Optimize font sizes and spacing for mobile
  - Ensure proper viewport configuration
  - _Requirements: 10.5, 10.6_

- [ ] 19. Implement accessibility features
  - Add proper ARIA labels to all interactive elements
  - Ensure keyboard navigation works throughout app
  - Test with screen readers
  - Verify color contrast ratios (4.5:1 minimum)
  - Add focus indicators to all focusable elements
  - Ensure all form inputs have labels
  - Add skip navigation links
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 20. Build and deploy application
  - Run production build with Vite
  - Test PWA functionality in production build
  - Run Lighthouse audit (target 90+ PWA score)
  - Deploy frontend to Vercel/Netlify
  - Configure environment variables for production
  - Test on real devices (Android, iOS)
  - Verify offline functionality works
  - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7_
