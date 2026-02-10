# Supabase Backend Setup Guide

This guide walks you through setting up the Supabase backend for the Personal Expense Tracker application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Personal Expense Tracker (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project"
5. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Run Database Migration

1. In your Supabase dashboard, navigate to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase/migration.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration
6. Verify success - you should see "Success. No rows returned" message

This creates:
- 4 tables: `households`, `users`, `categories`, `expenses`
- Indexes for query performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates

## Step 3: Create Storage Bucket for Receipts

1. Navigate to **Storage** in the left sidebar
2. Click "Create a new bucket"
3. Configure the bucket:
   - **Name**: `receipts`
   - **Public bucket**: Uncheck (keep it private)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`
4. Click "Create bucket"

## Step 4: Apply Storage Policies

1. Go back to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/storage-policies.sql`
4. Paste into the SQL editor
5. Click "Run" to execute

This creates policies that:
- Allow users to upload receipts to their household folder
- Allow users to view receipts from their household
- Allow users to delete receipts from their household

## Step 5: Configure Authentication

1. Navigate to **Authentication** > **Providers** in the left sidebar
2. Ensure **Email** provider is enabled (it should be by default)
3. Configure email settings:
   - **Enable Email Confirmations**: Optional (disable for easier development)
   - **Enable Email Change Confirmations**: Optional
   - **Secure Email Change**: Optional
4. (Optional) Enable **Magic Link** for passwordless authentication:
   - Toggle "Enable Magic Link" to ON

## Step 6: Get API Credentials

1. Navigate to **Project Settings** (gear icon in left sidebar)
2. Click on **API** in the settings menu
3. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

## Step 7: Create .env File

1. In the `xarate` directory, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace the placeholder values:
   ```env
   VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

3. Save the file

**Important**: Never commit `.env` to version control. It's already in `.gitignore`.

## Step 8: Verify Setup

You can verify your setup by checking:

1. **Tables**: Go to **Table Editor** and confirm you see:
   - households
   - users
   - categories
   - expenses

2. **Storage**: Go to **Storage** and confirm the `receipts` bucket exists

3. **RLS**: Go to **Authentication** > **Policies** and confirm policies exist for all tables

## Next Steps

Your Supabase backend is now ready! You can proceed to:
- Task 3: Implement core TypeScript types and interfaces
- Task 4: Implement IndexedDB setup with Dexie.js
- Task 5: Implement authentication service and UI

## Troubleshooting

### Migration fails with "permission denied"
- Make sure you're running the SQL as the project owner
- Check that the UUID extension is enabled

### Storage policies fail
- Ensure the `receipts` bucket is created first
- Verify the bucket name matches exactly ("receipts")

### Can't connect from app
- Double-check your `.env` file has the correct URL and key
- Ensure there are no extra spaces or quotes around the values
- Restart your development server after creating/modifying `.env`

### RLS policies blocking access
- Verify you're authenticated (check `auth.uid()` returns a value)
- Ensure your user has a record in the `users` table with a `household_id`
- Check the policies in **Authentication** > **Policies**

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
