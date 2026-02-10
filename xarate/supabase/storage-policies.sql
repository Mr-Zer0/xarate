-- Storage Bucket Policies for Receipt Images
-- Run this SQL in your Supabase SQL Editor after creating the 'receipts' bucket

-- Users can upload receipts to their household folder
CREATE POLICY "Users can upload household receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Users can view household receipts
CREATE POLICY "Users can view household receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete household receipts
CREATE POLICY "Users can delete household receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM users WHERE id = auth.uid()
    )
  );
