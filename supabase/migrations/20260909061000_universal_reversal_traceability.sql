-- SifoBooks: universal reversal + transaction traceability.
-- Additive migration: existing journals remain intact.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS source_module text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_of uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_reversed_by_fkey') THEN
    ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.journal_entries(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_reversal_of_fkey') THEN
    ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_reversal_of_fkey FOREIGN KEY (reversal_of) REFERENCES public.journal_entries(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON public.journal_entries(user_id, source_module, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reversal_of ON public.journal_entries(reversal_of);

CREATE OR REPLACE FUNCTION public.safe_reverse_journal_entry(
  _entry_id uuid,
  _reason text,
  _reversal_date date DEFAULT CURRENT_DATE
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  src public.journal_entries%ROWTYPE;
  reversal_id uuid;
  reversal_number text;
  reversal_ref text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO src FROM public.journal_entries WHERE id = _entry_id AND user_id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF src.status <> 'posted' THEN RAISE EXCEPTION 'Only posted journals can be reversed'; END IF;
  IF src.reversed_by IS NOT NULL THEN RAISE EXCEPTION 'Journal entry is already reversed'; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reversal_of = src.id) THEN RAISE EXCEPTION 'Journal entry already has a reversal'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'Reversal reason is required'; END IF;

  reversal_number := src.entry_number || '-REV';
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE user_id = me AND entry_number = reversal_number) THEN
    reversal_number := src.entry_number || '-REV-' || to_char(clock_timestamp(), 'HH24MISSMS');
  END IF;
  reversal_ref := COALESCE(src.reference, src.entry_number) || ':REV';

  INSERT INTO public.journal_entries(
    user_id, entry_number, entry_date, reference, description, status,
    total_debit, total_credit, source_module, source_type, source_id,
    source_reference, reversal_of, reversal_reason
  )
  VALUES (
    me, reversal_number, COALESCE(_reversal_date, CURRENT_DATE), reversal_ref,
    'Reversal of ' || src.entry_number || CASE WHEN btrim(_reason) <> '' THEN ' — ' || btrim(_reason) ELSE '' END,
    'posted', src.total_debit, src.total_credit, src.source_module, 'reversal', src.id,
    src.source_reference, src.id, btrim(_reason)
  ) RETURNING id INTO reversal_id;

  INSERT INTO public.journal_lines(user_id, entry_id, account_id, debit, credit, description)
  SELECT me, reversal_id, account_id, credit, debit,
         'Reversal: ' || COALESCE(description, src.entry_number)
  FROM public.journal_lines
  WHERE entry_id = src.id;

  UPDATE public.journal_entries
  SET status = 'reversed', reversed_by = reversal_id
  WHERE id = src.id;

  RETURN reversal_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.safe_reverse_journal_entry(uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safe_reverse_journal_entry(uuid,text,date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transaction_trace(_entry_id uuid)
RETURNS TABLE(
  entry_id uuid, entry_number text, entry_date date, status text, reference text,
  description text, source_module text, source_type text, source_id uuid,
  source_reference text, reversal_of uuid, reversed_by uuid,
  line_count bigint, total_debit numeric, total_credit numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT e.id, e.entry_number, e.entry_date, e.status, e.reference, e.description,
         e.source_module, e.source_type, e.source_id, e.source_reference,
         e.reversal_of, e.reversed_by, count(l.id), e.total_debit, e.total_credit
  FROM public.journal_entries e
  LEFT JOIN public.journal_lines l ON l.entry_id = e.id
  WHERE e.id = _entry_id AND e.user_id = auth.uid()
  GROUP BY e.id;
$$;

REVOKE EXECUTE ON FUNCTION public.transaction_trace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transaction_trace(uuid) TO authenticated, service_role;
