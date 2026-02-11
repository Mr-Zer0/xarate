import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthService';
import { supabase } from '../services/supabase';

const AVAILABLE_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
];

export function HouseholdSetupPage() {
  const navigate = useNavigate();
  const [householdName, setHouseholdName] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]!.value);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setUserName(user.name || '');
        setSelectedColor(user.color || AVAILABLE_COLORS[0]!.value);

        // Load household name if it exists
        if (user.householdId) {
          const { data: household } = await supabase
            .from('households')
            .select('name')
            .eq('id', user.householdId)
            .single();

          if (household) {
            setHouseholdName(household.name);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!householdName.trim()) {
      setError('Please enter a household name');
      return;
    }

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Update household name if household exists
      if (user.householdId) {
        const { error: householdError } = await supabase
          .from('households')
          .update({ name: householdName.trim() })
          .eq('id', user.householdId);

        if (householdError) {
          throw new Error(`Failed to update household: ${householdError.message}`);
        }
      }

      // Update user profile with name and color
      await authService.updateProfile({
        name: userName.trim(),
        color: selectedColor,
      });

      // Navigate to main app
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Household setup failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up household');
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome! 🎉
          </h1>
          <p className="text-gray-600">
            Let's personalize your household
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Household Name */}
          <div>
            <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 mb-2">
              Household Name
            </label>
            <input
              id="householdName"
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="e.g., Smith Family"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={isLoading}
              required
            />
          </div>

          {/* User Name */}
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g., John"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={isLoading}
              required
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Your Color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {AVAILABLE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`
                    h-12 rounded-lg transition-all
                    ${selectedColor === color.value 
                      ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' 
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  disabled={isLoading}
                  aria-label={color.name}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>You can invite other household members later</p>
        </div>
      </div>
    </div>
  );
}
