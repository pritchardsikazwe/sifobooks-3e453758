
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid,
  name text NOT NULL,
  bank_name text,
  account_number text,
  currency text NOT NULL DEFAULT 'ZMW',
  opening_balance numeric NOT NULL DEFAULT 0,
  opening_date date DEFAULT CURRENT_DATE,
  gl_account_id uuid REFERENCES public.chart_of_accounts(id),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank_accounts" ON public.bank_accounts FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER trg_bank_accounts_updated BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);
ALTER TABLE public.bank_allocations ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_account ON public.bank_transactions(bank_account_id);

CREATE TABLE public.bank_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  bank_txn_id uuid REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  file_path text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_documents TO authenticated;
GRANT ALL ON public.bank_documents TO service_role;
ALTER TABLE public.bank_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank_documents" ON public.bank_documents FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.bank_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains',
  pattern text NOT NULL,
  direction text,
  suggested_account_id uuid REFERENCES public.chart_of_accounts(id),
  suggested_target_type text DEFAULT 'gl',
  auto_apply boolean NOT NULL DEFAULT false,
  priority int NOT NULL DEFAULT 100,
  hits int NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_rules TO authenticated;
GRANT ALL ON public.bank_rules TO service_role;
ALTER TABLE public.bank_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank_rules" ON public.bank_rules FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER trg_bank_rules_updated BEFORE UPDATE ON public.bank_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.bank_running_balance AS
SELECT
  ba.id AS bank_account_id,
  ba.user_id,
  ba.name,
  ba.currency,
  ba.opening_balance
    + COALESCE((SELECT SUM(bt.amount) FROM public.bank_transactions bt WHERE bt.bank_account_id = ba.id), 0)
    AS current_balance,
  (SELECT COUNT(*) FROM public.bank_transactions bt WHERE bt.bank_account_id = ba.id AND NOT COALESCE(bt.reconciled,false)) AS unreconciled_count,
  (SELECT COUNT(*) FROM public.bank_transactions bt WHERE bt.bank_account_id = ba.id AND COALESCE(bt.status,'unallocated')='unallocated') AS unallocated_count
FROM public.bank_accounts ba;
GRANT SELECT ON public.bank_running_balance TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_bank_rules()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _uid uuid := auth.uid();
  r record; bt record; _matched int := 0; _entry uuid; _bank uuid; _gl uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  _bank := ensure_account(_uid,'1000','Cash & Bank','asset');
  FOR bt IN
    SELECT * FROM bank_transactions
    WHERE user_id=_uid AND COALESCE(status,'unallocated')='unallocated' AND NOT COALESCE(reconciled,false)
  LOOP
    FOR r IN
      SELECT * FROM bank_rules
      WHERE user_id=_uid AND is_active AND auto_apply
        AND (direction IS NULL OR direction='any'
             OR (direction='inflow' AND bt.amount>0)
             OR (direction='outflow' AND bt.amount<0))
        AND (
          (match_type='contains' AND position(lower(pattern) IN lower(COALESCE(bt.description,'')))>0)
          OR (match_type='equals' AND lower(pattern)=lower(COALESCE(bt.description,'')))
          OR (match_type='regex' AND COALESCE(bt.description,'') ~* pattern)
        )
      ORDER BY priority ASC
      LIMIT 1
    LOOP
      _gl := r.suggested_account_id;
      IF _gl IS NULL THEN CONTINUE; END IF;
      INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit)
      VALUES (_uid, 'JE-RULE-'||substr(bt.id::text,1,8), bt.txn_date, 'RULE:'||bt.id::text,
              'Auto: '||r.name||' — '||COALESCE(bt.description,''), 'posted', abs(bt.amount), abs(bt.amount))
      RETURNING id INTO _entry;
      IF bt.amount < 0 THEN
        INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
          (_uid, _entry, _gl, abs(bt.amount), 0, r.name),
          (_uid, _entry, _bank, 0, abs(bt.amount), 'Bank outflow');
      ELSE
        INSERT INTO journal_lines(user_id, entry_id, account_id, debit, credit, description) VALUES
          (_uid, _entry, _bank, bt.amount, 0, 'Bank inflow'),
          (_uid, _entry, _gl, 0, bt.amount, r.name);
      END IF;
      INSERT INTO bank_allocations(user_id, bank_txn_id, target_type, target_id, amount, memo, journal_entry_id, bank_account_id)
      VALUES (_uid, bt.id, 'gl', _gl, abs(bt.amount), r.name, _entry, bt.bank_account_id);
      UPDATE bank_rules SET hits=hits+1, last_used_at=now() WHERE id=r.id;
      _matched := _matched + 1;
      EXIT;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('rule_matches', _matched);
END $fn$;
