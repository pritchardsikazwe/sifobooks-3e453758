
CREATE OR REPLACE FUNCTION public.post_asset_disposal(_disposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  a record;
  je_id uuid;
  cost numeric;
  acc numeric;
  proceeds numeric;
  bv numeric;
  gain_loss numeric;
  cost_acct uuid;
  acc_acct uuid;
  cash_acct uuid;
  gl_acct uuid;
BEGIN
  SELECT * INTO d FROM public.asset_disposals WHERE id = _disposal_id;
  IF d IS NULL THEN RAISE EXCEPTION 'Disposal not found'; END IF;
  IF d.journal_entry_id IS NOT NULL THEN RETURN d.journal_entry_id; END IF;

  SELECT * INTO a FROM public.fixed_assets WHERE id = d.asset_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Asset not found'; END IF;

  cost := COALESCE(a.cost, 0);
  acc := COALESCE(a.accumulated_depreciation, 0);
  proceeds := COALESCE(d.proceeds, 0);
  bv := cost - acc;
  gain_loss := proceeds - bv; -- positive = gain, negative = loss

  cost_acct := public.ensure_account(d.user_id, '1500', 'Fixed Assets - Cost', 'asset');
  acc_acct  := public.ensure_account(d.user_id, '1590', 'Accumulated Depreciation', 'asset');
  cash_acct := public.ensure_account(d.user_id, '1000', 'Cash / Bank', 'asset');
  IF gain_loss >= 0 THEN
    gl_acct := public.ensure_account(d.user_id, '4900', 'Gain on Disposal of Assets', 'income');
  ELSE
    gl_acct := public.ensure_account(d.user_id, '6900', 'Loss on Disposal of Assets', 'expense');
  END IF;

  INSERT INTO public.journal_entries(user_id, entry_date, reference, description, source_type, source_id, status)
  VALUES (d.user_id, d.disposal_date, 'DISP-'||substr(_disposal_id::text,1,8), 'Disposal of '||a.description, 'asset_disposal', _disposal_id, 'posted')
  RETURNING id INTO je_id;

  -- Remove accumulated depreciation (DR)
  IF acc <> 0 THEN
    INSERT INTO public.journal_lines(journal_entry_id, account_id, debit, credit, description)
    VALUES (je_id, acc_acct, acc, 0, 'Reverse accumulated depreciation');
  END IF;
  -- Cash proceeds (DR)
  IF proceeds <> 0 THEN
    INSERT INTO public.journal_lines(journal_entry_id, account_id, debit, credit, description)
    VALUES (je_id, cash_acct, proceeds, 0, 'Disposal proceeds');
  END IF;
  -- Remove asset cost (CR)
  INSERT INTO public.journal_lines(journal_entry_id, account_id, debit, credit, description)
  VALUES (je_id, cost_acct, 0, cost, 'Remove asset cost');
  -- Gain / Loss
  IF gain_loss > 0 THEN
    INSERT INTO public.journal_lines(journal_entry_id, account_id, debit, credit, description)
    VALUES (je_id, gl_acct, 0, gain_loss, 'Gain on disposal');
  ELSIF gain_loss < 0 THEN
    INSERT INTO public.journal_lines(journal_entry_id, account_id, debit, credit, description)
    VALUES (je_id, gl_acct, -gain_loss, 0, 'Loss on disposal');
  END IF;

  UPDATE public.asset_disposals
     SET gain_loss = gain_loss, journal_entry_id = je_id
   WHERE id = _disposal_id;

  UPDATE public.fixed_assets
     SET status = 'disposed'
   WHERE id = d.asset_id;

  RETURN je_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_asset_disposal(uuid) TO authenticated;
