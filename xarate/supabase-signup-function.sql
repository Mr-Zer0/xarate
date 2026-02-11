-- Create a database function to handle signup with household creation
-- This bypasses RLS issues during the signup process
-- Run this in your Supabase SQL Editor

-- Create a function that creates household and user profile atomically
CREATE OR REPLACE FUNCTION create_user_with_household(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_color TEXT,
  household_name TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  new_household_id UUID;
  result json;
BEGIN
  -- Create the household
  INSERT INTO households (name)
  VALUES (household_name)
  RETURNING id INTO new_household_id;

  -- Create the user profile
  INSERT INTO users (id, email, name, color, household_id)
  VALUES (user_id, user_email, user_name, user_color, new_household_id);

  -- Create default categories for the household
  INSERT INTO categories (household_id, name, icon, color, is_default)
  VALUES
    (new_household_id, 'Groceries', '🛒', '#10B981', true),
    (new_household_id, 'Dining', '🍽️', '#F59E0B', true),
    (new_household_id, 'Transportation', '🚗', '#3B82F6', true),
    (new_household_id, 'Utilities', '💡', '#8B5CF6', true),
    (new_household_id, 'Entertainment', '🎬', '#EC4899', true),
    (new_household_id, 'Healthcare', '🏥', '#EF4444', true),
    (new_household_id, 'Shopping', '🛍️', '#14B8A6', true),
    (new_household_id, 'Other', '📦', '#6B7280', true);

  -- Return both household and user data
  SELECT json_build_object(
    'household_id', new_household_id,
    'user_id', user_id
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_household TO authenticated;
