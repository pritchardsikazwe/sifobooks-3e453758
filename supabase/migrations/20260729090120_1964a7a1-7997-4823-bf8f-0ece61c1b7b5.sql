
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text;

-- Storage RLS: users manage their own folder inside the source-documents bucket
CREATE POLICY "src_docs_read_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "src_docs_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "src_docs_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "src_docs_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'source-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
