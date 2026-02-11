// Authentication store for managing user session and authentication state
import { create } from 'zustand';
import type { User, Session } from '../types/models';
import { authService } from '../services/AuthService';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  loadSession: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Sign up a new user
  signUp: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(email, password, name);
      const session = await authService.getCurrentSession();
      set({
        user,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      });
      throw error;
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      const session = await authService.getCurrentSession();
      set({
        user,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      });
      throw error;
    }
  },

  // Sign in with magic link
  signInWithMagicLink: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.signInWithMagicLink(email);
      set({ isLoading: false, error: null });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Magic link failed',
      });
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      });
      throw error;
    }
  },

  // Refresh session
  refreshSession: async () => {
    try {
      const session = await authService.refreshSession();
      set({
        user: session.user,
        session,
        isAuthenticated: true,
      });
    } catch (error) {
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Session refresh failed',
      });
      throw error;
    }
  },

  // Load session on app start
  loadSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.getCurrentSession();
      if (session) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load session',
      });
    }
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(updates);
      set({
        user: updatedUser,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Profile update failed',
      });
      throw error;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
