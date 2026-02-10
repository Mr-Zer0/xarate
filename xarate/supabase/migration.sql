-- Personal Expense Tracker - Database Migration
-- Run this SQL in your Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  color TEXT NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, name)
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  receipt_image_url TEXT,
  ocr_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_expenses_household ON expenses(household_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_household_date ON expenses(household_id, date DESC);

CREATE INDEX idx_categories_household ON categories(household_id);
CREATE INDEX idx_users_household ON users(household_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Households Policies
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  USING (id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their household"
  ON households FOR UPDATE
  USING (id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert households"
  ON households FOR INSERT
  WITH CHECK (true);

-- Users Policies
CREATE POLICY "Users can view household members"
  ON users FOR SELECT
  USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Categories Policies
CREATE POLICY "Users can view household categories"
  ON categories FOR SELECT
  USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create household categories"
  ON categories FOR INSERT
  WITH CHECK (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update household categories"
  ON categories FOR UPDATE
  USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete custom categories"
  ON categories FOR DELETE
  USING (
    household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    AND is_default = FALSE
  );

-- Expenses Policies
CREATE POLICY "Users can view household expenses"
  ON expenses FOR SELECT
  USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create household expenses"
  ON expenses FOR INSERT
  WITH CHECK (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update household expenses"
  ON expenses FOR UPDATE
  USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete household expenses"
  ON expenses FOR DELETE
  USING (household_id IN (
    SELECT household_id FROM users WHERE id = auth.uid()
  ));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_households_updated_at 
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
