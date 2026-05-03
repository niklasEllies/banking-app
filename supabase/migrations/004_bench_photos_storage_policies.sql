-- Storage RLS policies for bench-photos bucket.
-- Public reads are covered by the public bucket setting.
-- Ownership is verified server-side in uploadBenchPhoto before any write reaches storage.

CREATE POLICY "Authenticated users can upload bench photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bench-photos');

CREATE POLICY "Authenticated users can update bench photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bench-photos');

CREATE POLICY "Authenticated users can delete bench photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bench-photos');
