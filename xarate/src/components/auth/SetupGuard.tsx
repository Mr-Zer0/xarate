// Setup guard component that checks if user needs household setup
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { supabase } from '../../services/supabase';

interface SetupGuardProps {
  children: React.ReactNode;
}

export const SetupGuard: React.FC<SetupGuardProps> = ({ children }) => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const user = await authService.getCurrentUser();
      
      if (!user) {
        setNeedsSetup(false);
        setIsLoading(false);
        return;
      }

      // Check if household name is still the default auto-generated one
      // Default format is "{name}'s Household"
      if (user.householdId) {
        const { data: household } = await supabase
          .from('households')
          .select('name')
          .eq('id', user.householdId)
          .single();

        if (household) {
          // If household name matches the default pattern, user needs setup
          const defaultPattern = new RegExp(`^.+'s Household$`);
          const needsSetup = defaultPattern.test(household.name);
          setNeedsSetup(needsSetup);
        } else {
          setNeedsSetup(false);
        }
      } else {
        // No household means needs setup
        setNeedsSetup(true);
      }
    } catch (error) {
      console.error('Setup check failed:', error);
      setNeedsSetup(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking setup status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to setup if needed
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  // Render protected content
  return <>{children}</>;
};
