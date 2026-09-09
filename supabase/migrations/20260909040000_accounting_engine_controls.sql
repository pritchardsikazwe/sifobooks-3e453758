-- SifoBooks accounting control layer
-- Keeps existing schemas compatible while making posted journals atomic and auditable.

ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS parent_account_id uuid,
  ADD COLUMN IF NOT EXISTS reconciliation_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_control_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cash_bank boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivation_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chart_of_accounts_parent_account_id_fkey'
  ) THEN
    ALTER TABLE public.chart_of_accounts
      ADD CONSTRAINT chart_of_accounts_parent_account_id_fkey
      FOREIGN KEY (parent_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Infer useful control metadata for existing standard accounts without changing balances.
UPDATE public.chart_of_accounts
SET is_control_account = true
WHERE account_code IN ('1100','2100','2200','2201','2300','2310','2320')
  AND COALESCE(is_control_account, false) = false;

UPDATE public.chart_of_accounts
SET is_cash_bank = true, reconciliation_required = true
WHERE account_type = 'asset'
  AND (
    account_code IN ('1000','1001','1002','1010','1020','1030','1040','1050','1060','1070','1200')
    OR account_name ILIKE '%cash%'
    OR account_name ILIKE '%bank%'
    OR account_name ILIKE '%mobile money%'
    OR account_name ILIKE '%momo%'
  );

UPDATE public.chart_of_accounts
SET reconciliation_required = true
WHERE account_code IN ('1100','2100','2300','2310','2320');

-- One atomic posting operation. The client never needs to create a posted header
-- and its lines in separate requests.
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

  IF _entry_number IS NULL OR btrim(_entry_number) = '' THEN
    RAISE EXCEPTION 'Entry number is required';
  END IF;
  IF _entry_date IS NULL THEN
    RAISE EXCEPTION 'Entry date is required';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' THEN
    RAISE EXCEPTION 'Journal lines must be an array';
  END IF;

  SELECT count(*),
         round(COALESCE(sum(CASE WHEN COALESCE((x->>'debit')::numeric,0) > 0 THEN (x->>'debit')::numeric ELSE 0 END),0),2),
         round(COALESCE(sum(CASE WHEN COALESCE((x->>'credit')::numeric,0) > 0 THEN (x->>'credit')::numeric ELSE 0 END),0),2)
  INTO line_count, total_dr, total_cr
  FROM jsonb_array_elements(_lines) x;

  IF line_count = 0 THEN RAISE EXCEPTION 'At least one journal line is required'; END IF;
  IF total_dr <= 0 OR total_cr <= 0 OR abs(total_dr-total_cr) > 0.01 THEN
    RAISE EXCEPTION 'Journal is out of balance: debit %, credit %', total_dr, total_cr;
  END IF;

  SELECT count(*) INTO bad_account
  FROM jsonb_array_elements(_lines) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts a
    WHERE a.id = (x->>'account_id')::uuid AND a.user_id = _user_id AND a.is_active = true
  );
  IF bad_account > 0 THEN RAISE EXCEPTION 'One or more journal accounts are invalid, inactive, or belong to another business'; END IF;

  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE user_id = _user_id AND reference = _reference) THEN
    SELECT id INTO entry_id FROM public.journal_entries WHERE user_id = _user_id AND reference = _reference LIMIT 1;
    RETURN entry_id;
  END IF;

  INSERT INTO public.journal_entries(
    user_id, entry_number, entry_date, reference, description,
    status, total_debit, total_credit
  ) VALUES (
    _user_id, _entry_number, _entry_date, _reference, _description,
    'posted', total_dr, total_cr
  ) RETURNING id INTO entry_id;

  INSERT INTO public.journal_lines(user_id, entry_id, account_id, debit, credit, description)
  SELECT
    _user_id,
    entry_id,
    (x->>'account_id')::uuid,
    round(COALESCE((x->>'debit')::numeric,0),2),
    round(COALESCE((x->>'credit')::numeric,0),2),
    NULLIF(x->>'description','')
  FROM jsonb_array_elements(_lines) x;

  RETURN entry_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid,text,date,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_journal_entry(uuid,text,date,text,text,jsonb) TO authenticated, service_role;

-- Health function used by the Accounting Control Centre.
CREATE OR REPLACE FUNCTION public.accounting_posting_health(_user_id uuid)
RETURNS TABLE(
  posted_entries bigint,
  draft_entries bigint,
  unbalanced_entries bigint,
  orphaned_lines bigint,
  duplicate_references bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM public.journal_entries WHERE user_id = _user_id AND status = 'posted'),
    (SELECT count(*) FROM public.journal_entries WHERE user_id = _user_id AND status = 'draft'),
    (SELECT count(*)
       FROM public.journal_entries e
       WHERE e.user_id = _user_id AND e.status = 'posted'
         AND (abs(COALESCE(e.total_debit,0)-COALESCE(e.total_credit,0)) > 0.01
              OR NOT EXISTS (SELECT 1 FROM public.journal_lines l WHERE l.entry_id=e.id))),
    (SELECT count(*) FROM public.journal_lines l
       WHERE l.user_id = _user_id AND NOT EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id=l.entry_id)),
    (SELECT count(*) FROM (
       SELECT reference FROM public.journal_entries
       WHERE user_id=_user_id AND reference IS NOT NULL
       GROUP BY reference HAVING count(*) > 1
    ) d);
$$;

REVOKE EXECUTE ON FUNCTION public.accounting_posting_health(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accounting_posting_health(uuid) TO authenticated, service_role;
