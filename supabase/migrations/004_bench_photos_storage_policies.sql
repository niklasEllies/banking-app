-- Storage RLS policies for bench-photos bucket.
-- Bucket is public, so public reads work via the SELECT policy.
-- Writes are restricted to authenticated users; ownership is also verified
-- server-side in uploadBenchPhoto before the Storage call.

-- Public read (required for <img src=...> and for upsert SELECT checks)
CREATE POLICY "bench-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bench-photos');

-- Any authenticated user can upload to the bucket
CREATE POLICY "bench-photos: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bench-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

-- Only the original uploader can overwrite their file (owner_id is set by Storage on INSERT)
CREATE POLICY "bench-photos: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bench-photos' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'bench-photos');

-- Only the original uploader can delete their file
CREATE POLICY "bench-photos: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bench-photos' AND owner_id = auth.uid()::text);
