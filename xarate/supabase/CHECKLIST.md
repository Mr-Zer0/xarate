# Supabase Setup Checklist

Use this checklist to track your progress setting up the Supabase backend.

## Setup Steps

- [ ] **Step 1**: Create Supabase project at https://supabase.com/dashboard
  - [ ] Project created and provisioned
  - [ ] Database password saved securely

- [ ] **Step 2**: Run database migration
  - [ ] Opened SQL Editor in Supabase dashboard
  - [ ] Copied and pasted `supabase/migration.sql`
  - [ ] Executed successfully (no errors)
  - [ ] Verified tables exist in Table Editor (households, users, categories, expenses)

- [ ] **Step 3**: Create storage bucket
  - [ ] Created `receipts` bucket in Storage section
  - [ ] Set as private (not public)
  - [ ] Configured file size limit (5 MB)
  - [ ] Set allowed MIME types (image/jpeg, image/png, image/webp)

- [ ] **Step 4**: Apply storage policies
  - [ ] Opened SQL Editor
  - [ ] Copied and pasted `supabase/storage-policies.sql`
  - [ ] Executed successfully (no errors)

- [ ] **Step 5**: Configure authentication
  - [ ] Email provider enabled in Authentication > Providers
  - [ ] Email confirmation settings configured
  - [ ] (Optional) Magic Link enabled

- [ ] **Step 6**: Get API credentials
  - [ ] Copied Project URL from Project Settings > API
  - [ ] Copied anon public key from Project Settings > API

- [ ] **Step 7**: Create .env file
  - [ ] Copied `.env.example` to `.env`
  - [ ] Pasted actual Project URL into `VITE_SUPABASE_URL`
  - [ ] Pasted actual anon key into `VITE_SUPABASE_ANON_KEY`
  - [ ] Saved the file

- [ ] **Step 8**: Verify setup
  - [ ] All 4 tables visible in Table Editor
  - [ ] `receipts` bucket visible in Storage
  - [ ] RLS policies visible in Authentication > Policies
  - [ ] `.env` file exists and has correct values

## Ready to Proceed

Once all items are checked, your Supabase backend is ready and you can proceed to the next task!

## Notes

Add any notes or issues you encountered during setup:

---
