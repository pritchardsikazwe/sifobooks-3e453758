
CREATE POLICY "own bank doc read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='bank-documents' AND (auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "own bank doc write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='bank-documents' AND (auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "own bank doc update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='bank-documents' AND (auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "own bank doc delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='bank-documents' AND (auth.uid()::text = (storage.foldername(name))[1]));
