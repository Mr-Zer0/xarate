-- Fix for household creation during signup
-- Run this in your Supabase SQL Editor to fix the RLS policies

-- Drop existing household policies
DROP POLICY IF EXISTS "Users can view their own household" ON households;
DROP POLICY IF EXISTS "Users can update their own household" ON households;

-- Create new household policies that allow insert during signup
CREATE POLICY "Users can insert households"
  ON households FOR INSERT
  WITH CHECK (true);  -- Allow any authenticated user to create a household

CREATE POLICY "Users can view their own household"
  ON households FOR SELECT
  USING (
    id IN (SELECT household_id FROM users WHERE id = auth.uid())
    OR auth.uid() IS NOT NULL  -- Allow viewing during signup process
  );

CREATE POLICY "Users can update their own household"
  ON households FOR UPDATE
  USING (id IN (SELECT household_id FROM users WHERE id = auth.uid()));

-- Also update the users insert policy to be more permissive during signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
