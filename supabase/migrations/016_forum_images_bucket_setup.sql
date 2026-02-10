-- Forum Images Storage Setup
-- Note: Storage buckets cannot be created via SQL migrations.
-- You must create them manually in the Supabase Dashboard.

-- To set up the forum-images bucket:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: "forum-images"
-- 4. Make it PUBLIC (check "Public bucket" option)
-- 5. Click "Create bucket"

-- Storage policies for forum-images bucket:
-- Allow authenticated users to upload their own images

-- Policy: Allow authenticated users to upload forum images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload forum images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-images' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow users to update their uploaded images
CREATE POLICY IF NOT EXISTS "Users can update their forum images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'forum-images' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'forum-images' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow users to delete their uploaded images
CREATE POLICY IF NOT EXISTS "Users can delete their forum images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'forum-images' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow public read access (since bucket is public)
CREATE POLICY IF NOT EXISTS "Public can read forum images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'forum-images');
