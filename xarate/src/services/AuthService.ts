// Authentication service with Supabase integration
import { supabase } from './supabase';
import type { IAuthService } from '../types/services';
import type { User, Household, Session } from '../types/models';
import { AuthError } from '../types/errors';

export class AuthService implements IAuthService {
  /**
   * Sign up a new user with email and password
   */
  async signUp(email: string, password: string, name: string): Promise<User> {
    try {
      // Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new AuthError(`Sign up failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new AuthError('Sign up failed: No user returned');
      }

      // Create household for the new user
      const household = await this.createHousehold(`${name}'s Household`);

      // Create user profile in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          color: this.generateRandomColor(),
          household_id: household.id,
        })
        .select()
        .single();

      if (userError) {
        throw new AuthError(`Failed to create user profile: ${userError.message}`);
      }

      return this.mapUserFromDb(userData);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new AuthError(`Sign in failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new AuthError('Sign in failed: No user returned');
      }

      // Fetch user profile
      const user = await this.getCurrentUser();
      if (!user) {
        throw new AuthError('Failed to fetch user profile');
      }

      return user;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign in with magic link (passwordless)
   */
  async signInWithMagicLink(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw new AuthError(`Magic link failed: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Magic link failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new AuthError(`Sign out failed: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw new AuthError(`Failed to get session: ${error.message}`);
      }

      if (!session) {
        return null;
      }

      // Fetch user profile
      const user = await this.getCurrentUser();
      if (!user) {
        return null;
      }

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token || '',
        expiresAt: new Date(session.expires_at! * 1000),
        user,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<Session> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        throw new AuthError(`Failed to refresh session: ${error.message}`);
      }

      if (!session) {
        throw new AuthError('Failed to refresh session: No session returned');
      }

      // Fetch user profile
      const user = await this.getCurrentUser();
      if (!user) {
        throw new AuthError('Failed to fetch user profile');
      }

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token || '',
        expiresAt: new Date(session.expires_at! * 1000),
        user,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to refresh session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new AuthError(`Failed to get user: ${authError.message}`);
      }

      if (!authUser) {
        return null;
      }

      // Fetch user profile from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        throw new AuthError(`Failed to fetch user profile: ${userError.message}`);
      }

      if (!userData) {
        return null;
      }

      return this.mapUserFromDb(userData);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new AuthError('No authenticated user');
      }

      // Map User fields to database column names
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.color !== undefined) dbUpdates.color = updates.color;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (userError) {
        throw new AuthError(`Failed to update profile: ${userError.message}`);
      }

      return this.mapUserFromDb(userData);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new household
   */
  async createHousehold(name: string): Promise<Household> {
    try {
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({ name })
        .select()
        .single();

      if (householdError) {
        throw new AuthError(`Failed to create household: ${householdError.message}`);
      }

      return this.mapHouseholdFromDb(householdData);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to create household: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invite a user to the household
   */
  async inviteToHousehold(_email: string): Promise<void> {
    try {
      // This is a placeholder - full implementation would require:
      // 1. Generate invite code/token
      // 2. Store invite in database
      // 3. Send email with invite link
      // For now, we'll just throw an error indicating it's not implemented
      throw new AuthError('Household invites not yet implemented');
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to invite user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept a household invite
   */
  async acceptInvite(_inviteCode: string): Promise<void> {
    try {
      // This is a placeholder - full implementation would require:
      // 1. Validate invite code
      // 2. Update user's household_id
      // 3. Mark invite as accepted
      // For now, we'll just throw an error indicating it's not implemented
      throw new AuthError('Household invites not yet implemented');
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`Failed to accept invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database user record to User model
   */
  private mapUserFromDb(dbUser: any): User {
    const user: User = {
      id: dbUser.id as string,
      email: dbUser.email as string,
      name: dbUser.name as string,
      color: dbUser.color as string,
      householdId: dbUser.household_id as string,
      createdAt: new Date(dbUser.created_at as string),
      updatedAt: new Date(dbUser.updated_at as string),
    };
    
    if (dbUser.avatar) {
      user.avatar = dbUser.avatar as string;
    }
    
    return user;
  }

  /**
   * Map database household record to Household model
   */
  private mapHouseholdFromDb(dbHousehold: any): Household {
    return {
      id: dbHousehold.id,
      name: dbHousehold.name,
      createdAt: new Date(dbHousehold.created_at),
      updatedAt: new Date(dbHousehold.updated_at),
    };
  }

  /**
   * Generate a random color for user avatar
   */
  private generateRandomColor(): string {
    const colors = [
      '#EF4444', // red
      '#F59E0B', // amber
      '#10B981', // emerald
      '#3B82F6', // blue
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex]!;
  }
}

// Export singleton instance
export const authService = new AuthService();
