ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS reversal_reason text,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

CREATE OR REPLACE FUNCTION public.safe_reverse_journal_entry(_entry_id uuid, _reason text, _reversal_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _orig public.journal_entries%ROWTYPE;
  _date date := COALESCE(_reversal_date, CURRENT_DATE);
  _rev_id uuid;
  _closed int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 4 THEN
    RAISE EXCEPTION 'A reversal reason of at least 4 characters is required';
  END IF;

  SELECT * INTO _orig FROM public.journal_entries WHERE id = _entry_id AND user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found';
  END IF;
  IF _orig.status <> 'posted' THEN
    RAISE EXCEPTION 'Only posted entries can be reversed';
  END IF;
  IF _orig.reversed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Entry % has already been reversed', _orig.entry_number;
  END IF;
  IF _orig.reversal_of IS NOT NULL THEN
    RAISE EXCEPTION 'A reversal entry cannot itself be reversed';
  END IF;

  SELECT count(*) INTO _closed FROM public.financial_periods
   WHERE user_id = _uid AND status = 'closed'
     AND fiscal_year = EXTRACT(YEAR FROM _date)::int
     AND (period_month IS NULL OR period_month = EXTRACT(MONTH FROM _date)::int);
  IF _closed > 0 THEN
    RAISE EXCEPTION 'The period for % is closed. Reopen it or use a later reversal date.', _date;
  END IF;

  INSERT INTO public.journal_entries (
    user_id, entry_number, entry_date, reference, description, status,
    total_debit, total_credit, reversal_of, reversal_reason, currency, exchange_rate
  ) VALUES (
    _uid, _orig.entry_number || '-REV', _date,
    COALESCE('REV:' || _orig.reference, 'REV:' || _orig.entry_number),
    'Reversal of ' || _orig.entry_number || ' — ' || btrim(_reason),
    'posted', COALESCE(_orig.total_credit,0), COALESCE(_orig.total_debit,0),
    _orig.id, btrim(_reason), COALESCE(_orig.currency,'ZMW'), COALESCE(_orig.exchange_rate,1)
  ) RETURNING id INTO _rev_id;

  INSERT INTO public.journal_lines (user_id, entry_id, account_id, description, debit, credit)
  SELECT _uid, _rev_id, l.account_id, 'Reversal — ' || COALESCE(l.description,''), COALESCE(l.credit,0), COALESCE(l.debit,0)
  FROM public.journal_lines l WHERE l.entry_id = _orig.id;

  UPDATE public.journal_entries
     SET reversed_by = _rev_id, reversed_at = now(), reversal_reason = btrim(_reason)
   WHERE id = _orig.id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (_uid, 'journal.reverse', 'journal_entries', _orig.id,
          jsonb_build_object('entry_number', _orig.entry_number, 'reversal_id', _rev_id, 'reason', btrim(_reason), 'reversal_date', _date));

  RETURN jsonb_build_object('ok', true, 'reversal_id', _rev_id, 'entry_number', _orig.entry_number || '-REV');
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_reverse_journal_entry(uuid, text, date) TO authenticated;