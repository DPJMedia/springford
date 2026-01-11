-- Storage policies for ads bucket
-- Run this after creating the 'ads' storage bucket in Supabase Dashboard

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload ads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ads' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update ads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ads' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'ads' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete ads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ads' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow public read access to ads
CREATE POLICY "Public can view ads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ads');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Storage policies for ads bucket created successfully!';
  RAISE NOTICE 'Make sure the ads bucket exists and is set to public in Supabase Dashboard → Storage';
END $$;



