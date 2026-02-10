-- Personal Expense Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  color TEXT NOT NULL,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  date TIMESTAMPTZ NOT NULL,
  receipt_image_url TEXT,
  ocr_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household ON expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for households
CREATE POLICY "Users can view their own household"
  ON households FOR SELECT
  USING (id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own household"
  ON households FOR UPDATE
  USING (id IN (SELECT household_id FROM users WHERE id = auth.uid()));

-- RLS Policies for users
CREATE POLICY "Users can view users in their household"
  ON users FOR SELECT
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their household"
  ON categories FOR SELECT
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert categories in their household"
  ON categories FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update categories in their household"
  ON categories FOR UPDATE
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete categories in their household"
  ON categories FOR DELETE
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses in their household"
  ON expenses FOR SELECT
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert expenses in their household"
  ON expenses FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update expenses in their household"
  ON expenses FOR UPDATE
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete expenses in their household"
  ON expenses FOR DELETE
  USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()));

-- Insert default categories (will be created per household by the app)
-- This is just a reference of what categories should exist
COMMENT ON TABLE categories IS 'Default categories: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Travel, Other';
