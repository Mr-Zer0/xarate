# Authentication Implementation

This directory contains the authentication service implementation for the Personal Expense Tracker PWA.

## Files Created

### Services

- **`supabase.ts`**: Supabase client configuration with auto-refresh and session persistence
- **`AuthService.ts`**: Complete authentication service implementing the `IAuthService` interface

### Components

- **`components/auth/AuthLayout.tsx`**: Wrapper component for authentication pages with consistent styling
- **`components/auth/LoginForm.tsx`**: Login form with email/password and magic link support
- **`components/auth/SignupForm.tsx`**: Signup form with validation and error handling
- **`components/auth/ProtectedRoute.tsx`**: Route wrapper that checks authentication and redirects to login if needed
- **`components/auth/index.ts`**: Barrel export for all auth components

### Pages

- **`pages/LoginPage.tsx`**: Login page using AuthLayout and LoginForm
- **`pages/SignupPage.tsx`**: Signup page using AuthLayout and SignupForm

## Features Implemented

### AuthService

✅ **Authentication Methods**
- `signUp(email, password, name)` - Creates new user with automatic household creation
- `signIn(email, password)` - Email/password authentication
- `signInWithMagicLink(email)` - Passwordless authentication via email
- `signOut()` - Sign out current user

✅ **Session Management**
- `getCurrentSession()` - Get current session with user data
- `refreshSession()` - Refresh expired session tokens
- Auto-refresh tokens enabled in Supabase client

✅ **User Management**
- `getCurrentUser()` - Get authenticated user profile
- `updateProfile(updates)` - Update user name, avatar, or color

✅ **Household Management**
- `createHousehold(name)` - Create new household
- `inviteToHousehold(email)` - Placeholder for future implementation
- `acceptInvite(inviteCode)` - Placeholder for future implementation

✅ **Error Handling**
- Custom `AuthError` class for authentication-specific errors
- Detailed error messages for debugging
- Graceful error handling throughout

### UI Components

✅ **LoginForm**
- Email/password login
- Magic link (passwordless) option
- Form validation with inline errors
- Loading states during authentication
- Success feedback
- Switch to signup option

✅ **SignupForm**
- Name, email, password, confirm password fields
- Comprehensive form validation
- Password strength requirements (min 6 characters)
- Password confirmation matching
- Loading states
- Error display
- Switch to login option

✅ **AuthLayout**
- Consistent styling for auth pages
- Responsive design
- Gradient background
- Card-based layout

✅ **ProtectedRoute**
- Checks authentication status
- Redirects to login if not authenticated
- Loading state while checking auth
- Preserves intended destination for post-login redirect
- Handles session expiration gracefully

## Usage Examples

### Using AuthService

```typescript
import { authService } from './services/AuthService';

// Sign up
const user = await authService.signUp('user@example.com', 'password123', 'John Doe');

// Sign in
const user = await authService.signIn('user@example.com', 'password123');

// Magic link
await authService.signInWithMagicLink('user@example.com');

// Get current user
const user = await authService.getCurrentUser();

// Update profile
const updatedUser = await authService.updateProfile({ name: 'Jane Doe' });

// Sign out
await authService.signOut();
```

### Using Components in Routes

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProtectedRoute } from './components/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

## Environment Variables Required

Make sure to create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Database Requirements

The following tables must exist in your Supabase database:

- `households` - Stores household information
- `users` - Stores user profiles (extends Supabase auth.users)

See the design document for the complete database schema.

## Next Steps

To complete the authentication flow:

1. Set up Supabase project and run database migrations
2. Configure environment variables
3. Implement household setup flow (Task 6)
4. Add authentication state management with Zustand
5. Test authentication flow end-to-end

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.1**: User account creation and management
- **Requirement 1.2**: User profile with name for identification
- **Requirement 10.2**: Simple form with clear labels
- **Requirement 10.4**: Clear feedback on success or failure
