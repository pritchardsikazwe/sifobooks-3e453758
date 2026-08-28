REVOKE ALL ON FUNCTION public.safe_reverse_journal_entry(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safe_reverse_journal_entry(uuid, text, date) TO authenticated;