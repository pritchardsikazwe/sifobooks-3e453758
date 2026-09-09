-- SifoBooks period lock controls.
-- Closed periods are immutable at the database boundary for accounting journals.

CREATE OR REPLACE FUNCTION public.accounting_period_is_closed(
  _user_id uuid,
  _entry_date date
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_periods fp
    WHERE fp.user_id = _user_id
      AND fp.status = 'closed'
      AND (
        (fp.period_type = 'month'
          AND fp.period_month = EXTRACT(MONTH FROM _entry_date)::integer
          AND fp.fiscal_year = EXTRACT(YEAR FROM _entry_date)::integer)
        OR
        (fp.period_type = 'year'
          AND fp.fiscal_year = EXTRACT(YEAR FROM _entry_date)::integer)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_accounting_period_open(
  _user_id uuid,
  _entry_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _entry_date IS NULL THEN
    RAISE EXCEPTION 'Accounting date is required';
  END IF;
  IF public.accounting_period_is_closed(_user_id, _entry_date) THEN
    RAISE EXCEPTION 'Accounting period is closed for %', to_char(_entry_date, 'Mon YYYY');
  END IF;
END;
$$;

-- Central posting path must never post into a closed period.
CREATE OR REPLACE FUNCTION public.post_journal_entry(
  _user_id uuid,
  _entry_number text,
  _entry_date date,
  _reference text,
  _description text,
  _lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  entry_id uuid;
  total_dr numeric(18,2);
  total_cr numeric(18,2);
  line_count integer;
  bad_account integer;
BEGIN
  IF me IS NULL OR me <> _user_id THEN
    RAISE EXCEPTION 'Not authorised to post for this user';
  END IF;

  PERFORM public.assert_accounting_period_open(_user_id, _entry_date);

  IF _entry_number IS NULL OR btrim(_entry_number) = '' THEN RAISE EXCEPTION 'Entry number is required'; END IF;
  IF _entry_date IS NULL THEN RAISE EXCEPTION 'Entry date is required'; END IF;
  IF jsonb_typeof(_lines) <> 'array' THEN RAISE EXCEPTION 'Journal lines must be an array'; END IF;

  SELECT count(*),
    round(COALESCE(sum(CASE WHEN COALESCE((x->>'debit')::numeric,0) > 0 THEN (x->>'debit')::numeric ELSE 0 END),0),2),
    round(COALESCE(sum(CASE WHEN COALESCE((x->>'credit')::numeric,0) > 0 THEN (x->>'credit')::numeric ELSE 0 END),0),2)
  INTO line_count,total_dr,total_cr
  FROM jsonb_array_elements(_lines) x;

  IF line_count = 0 THEN RAISE EXCEPTION 'At least one journal line is required'; END IF;
  IF total_dr <= 0 OR total_cr <= 0 OR abs(total_dr-total_cr) > 0.01 THEN
    RAISE EXCEPTION 'Journal is out of balance: debit %, credit %', total_dr, total_cr;
  END IF;

  SELECT count(*) INTO bad_account
  FROM jsonb_array_elements(_lines) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts a
    WHERE a.id = (x->>'account_id')::uuid
      AND a.user_id = _user_id
      AND a.is_active = true
  );
  IF bad_account > 0 THEN RAISE EXCEPTION 'One or more journal accounts are invalid, inactive, or belong to another business'; END IF;

  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE user_id = _user_id AND reference = _reference) THEN
    SELECT id INTO entry_id FROM public.journal_entries WHERE user_id = _user_id AND reference = _reference LIMIT 1;
    RETURN entry_id;
  END IF;

  INSERT INTO public.journal_entries(user_id,entry_number,entry_date,reference,description,status,total_debit,total_credit)
  VALUES (_user_id,_entry_number,_entry_date,_reference,_description,'posted',total_dr,total_cr)
  RETURNING id INTO entry_id;

  INSERT INTO public.journal_lines(user_id,entry_id,account_id,debit,credit,description)
  SELECT _user_id,entry_id,(x->>'account_id')::uuid,
    round(COALESCE((x->>'debit')::numeric,0),2),
    round(COALESCE((x->>'credit')::numeric,0),2),
    NULLIF(x->>'description','')
  FROM jsonb_array_elements(_lines) x;

  RETURN entry_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid,text,date,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_journal_entry(uuid,text,date,text,text,jsonb) TO authenticated, service_role;

-- Protect posted journal dates from being moved into/out of closed periods.
CREATE OR REPLACE FUNCTION public.protect_posted_journal_period()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'posted' AND TG_OP = 'UPDATE' THEN
    IF NEW.entry_date IS DISTINCT FROM OLD.entry_date THEN
      PERFORM public.assert_accounting_period_open(OLD.user_id, NEW.entry_date);
    END IF;
    PERFORM public.assert_accounting_period_open(OLD.user_id, OLD.entry_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_posted_journal_period ON public.journal_entries;
CREATE TRIGGER trg_protect_posted_journal_period
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_posted_journal_period();

-- Reopen/close operations remain explicit and auditable through the existing RPCs.
GRANT EXECUTE ON FUNCTION public.accounting_period_is_closed(uuid,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_accounting_period_open(uuid,date) TO authenticated;
