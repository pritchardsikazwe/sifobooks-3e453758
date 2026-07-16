
-- Phase A: Bank Allocations tracking + reversal

CREATE TABLE IF NOT EXISTS public.bank_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_txn_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  target_type text NOT NULL, -- invoice | bill | expense | receipt | account | journal
  target_id uuid,
  target_ref text,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  memo text,
  reference text,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  allocated_by uuid REFERENCES auth.users(id),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  is_reversed boolean NOT NULL DEFAULT false,
  reversed_at timestamptz,
  reversed_by uuid REFERENCES auth.users(id),
  reverse_reason text,
  reversal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_allocations TO authenticated;
GRANT ALL ON public.bank_allocations TO service_role;
ALTER TABLE public.bank_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank_allocations" ON public.bank_allocations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS bank_allocations_txn_idx ON public.bank_allocations(bank_txn_id) WHERE NOT is_reversed;
CREATE INDEX IF NOT EXISTS bank_allocations_user_idx ON public.bank_allocations(user_id, allocated_at DESC);

-- Add status columns to bank_transactions
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS allocated_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unallocated', -- unallocated | partial | allocated | reversed
  ADD COLUMN IF NOT EXISTS last_allocated_at timestamptz;

-- Trigger: recompute allocation totals + status on bank_transactions
CREATE OR REPLACE FUNCTION public.recalc_bank_txn_allocation(_txn_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _sum numeric := 0; _amt numeric; _status text; _last timestamptz;
BEGIN
  SELECT COALESCE(SUM(amount),0), MAX(allocated_at)
    INTO _sum, _last
    FROM bank_allocations WHERE bank_txn_id=_txn_id AND NOT is_reversed;
  SELECT abs(amount) INTO _amt FROM bank_transactions WHERE id=_txn_id;
  IF _sum <= 0 THEN _status := 'unallocated';
  ELSIF _sum + 0.005 < _amt THEN _status := 'partial';
  ELSE _status := 'allocated';
  END IF;
  UPDATE bank_transactions
     SET allocated_amount = _sum,
         status = _status,
         reconciled = (_status = 'allocated'),
         reconciled_at = CASE WHEN _status='allocated' THEN COALESCE(reconciled_at, now()) ELSE NULL END,
         last_allocated_at = _last
   WHERE id=_txn_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_bank_alloc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN PERFORM recalc_bank_txn_allocation(OLD.bank_txn_id); RETURN OLD; END IF;
  PERFORM recalc_bank_txn_allocation(NEW.bank_txn_id);
  IF TG_OP='UPDATE' AND OLD.bank_txn_id <> NEW.bank_txn_id THEN
    PERFORM recalc_bank_txn_allocation(OLD.bank_txn_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bank_alloc_recalc ON public.bank_allocations;
CREATE TRIGGER bank_alloc_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.bank_allocations
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_bank_alloc();

-- Reverse a bank allocation: mirror JE, mark reversed, recompute status
CREATE OR REPLACE FUNCTION public.reverse_bank_allocation(_alloc_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  a record; orig record; l record; _rev_entry uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO a FROM bank_allocations WHERE id=_alloc_id AND user_id=_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  IF a.is_reversed THEN RAISE EXCEPTION 'Already reversed'; END IF;

  IF a.journal_entry_id IS NOT NULL THEN
    SELECT * INTO orig FROM journal_entries WHERE id=a.journal_entry_id;
    IF FOUND THEN
      INSERT INTO journal_entries(user_id, entry_number, entry_date, reference, description, status, total_debit, total_credit, reversal_of)
      VALUES (_uid, orig.entry_number||'-REV', CURRENT_DATE,
              COALESCE(orig.reference,'')||':REV',
              'Reversal — '||COALESCE(_reason,'')||' — '||COALESCE(orig.description,''),
              'posted', orig.total_credit, orig.total_debit, orig.id)
      RETURNING id INTO _rev_entry;
      FOR l IN SELECT * FROM journal_lines WHERE entry_id=orig.id LOOP
        INSERT INTO journal_lines(user_id, entry_id, account_id, description, debit, credit)
        VALUES (_uid, _rev_entry, l.account_id, 'Reversal — '||COALESCE(l.description,''), l.credit, l.debit);
      END LOOP;
      UPDATE journal_entries SET reversed_by=_rev_entry WHERE id=orig.id;
    END IF;
  END IF;

  UPDATE bank_allocations
     SET is_reversed=true, reversed_at=now(), reversed_by=_uid,
         reverse_reason=_reason, reversal_entry_id=_rev_entry
   WHERE id=_alloc_id;

  RETURN jsonb_build_object('ok',true,'reversal_entry',_rev_entry);
END $$;
