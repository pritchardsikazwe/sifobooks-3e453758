-- 1. Extend bank_transactions with lifecycle columns ---------------------
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS is_allocated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_posted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cleared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allocated_at timestamptz,
  ADD COLUMN IF NOT EXISTS allocated_by uuid,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_by uuid,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleared_by uuid,
  ADD COLUMN IF NOT EXISTS cleared_reference text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_transaction_id text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid,
  ADD COLUMN IF NOT EXISTS reconciliation_id uuid,
  ADD COLUMN IF NOT EXISTS reversal_of_transaction_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Duplicate-detection indexes ----------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS bank_txn_external_uidx
  ON public.bank_transactions (user_id, bank_account_id, external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bank_txn_hash_uidx
  ON public.bank_transactions (user_id, bank_account_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- 3. Audit log ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_transaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_txn_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  event text NOT NULL,
  previous_status text,
  new_status text,
  reason text,
  journal_entry_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bank_transaction_events TO authenticated;
GRANT ALL ON public.bank_transaction_events TO service_role;

ALTER TABLE public.bank_transaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads bank txn events"
  ON public.bank_transaction_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owner writes bank txn events"
  ON public.bank_transaction_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS bank_txn_events_txn_idx
  ON public.bank_transaction_events (bank_txn_id, created_at DESC);

-- 4. Status sync trigger -----------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_bank_txn_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _abs numeric := abs(COALESCE(NEW.amount,0));
  _alloc numeric := COALESCE(NEW.allocated_amount,0);
  _prev text := COALESCE(OLD.status, 'imported');
  _next text;
BEGIN
  NEW.is_allocated := _alloc + 0.005 >= _abs AND _abs > 0;
  NEW.is_posted := NEW.journal_entry_id IS NOT NULL OR NEW.is_allocated;

  IF NEW.is_allocated AND NEW.allocated_at IS NULL THEN
    NEW.allocated_at := now();
    NEW.allocated_by := COALESCE(NEW.allocated_by, auth.uid());
  END IF;
  IF NEW.is_posted AND NEW.posted_at IS NULL THEN
    NEW.posted_at := now();
    NEW.posted_by := COALESCE(NEW.posted_by, auth.uid());
  END IF;
  IF NEW.reconciled AND NEW.reconciled_at IS NULL THEN
    NEW.reconciled_at := now();
    NEW.reconciled_by := COALESCE(NEW.reconciled_by, auth.uid());
  END IF;
  IF NEW.is_cleared AND NEW.cleared_at IS NULL THEN
    NEW.cleared_at := now();
    NEW.cleared_by := COALESCE(NEW.cleared_by, auth.uid());
  END IF;

  -- Compute the canonical status
  IF NEW.status IN ('draft','pending','voided','failed','reversed') THEN
    _next := NEW.status;
  ELSIF NEW.is_cleared THEN
    _next := 'cleared';
  ELSIF NEW.reconciled THEN
    _next := 'reconciled';
  ELSIF NEW.is_posted AND NEW.is_allocated THEN
    _next := 'posted';
  ELSIF _alloc > 0 AND _alloc + 0.005 < _abs THEN
    _next := 'partial';
  ELSIF NEW.is_allocated THEN
    _next := 'allocated';
  ELSE
    _next := 'unallocated';
  END IF;

  NEW.status := _next;
  NEW.updated_at := now();

  -- Audit any change
  IF TG_OP = 'UPDATE' AND _prev IS DISTINCT FROM _next THEN
    INSERT INTO public.bank_transaction_events
      (user_id, bank_txn_id, event, previous_status, new_status, journal_entry_id, actor_id)
    VALUES
      (NEW.user_id, NEW.id, 'status_change', _prev, _next, NEW.journal_entry_id, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.bank_transaction_events
      (user_id, bank_txn_id, event, previous_status, new_status, actor_id)
    VALUES
      (NEW.user_id, NEW.id, 'imported', NULL, _next, auth.uid());
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_bank_txn_status ON public.bank_transactions;
CREATE TRIGGER trg_sync_bank_txn_status
  BEFORE INSERT OR UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_bank_txn_status();

-- 5. Clear function -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_bank_transaction(_txn_id uuid, _reference text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _row public.bank_transactions%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO _row FROM public.bank_transactions WHERE id=_txn_id AND user_id=_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF _row.is_cleared THEN RETURN jsonb_build_object('already_cleared',true); END IF;

  UPDATE public.bank_transactions
    SET is_cleared = true,
        cleared_at = now(),
        cleared_by = _uid,
        cleared_reference = COALESCE(_reference, cleared_reference)
    WHERE id=_txn_id;

  RETURN jsonb_build_object('ok',true,'cleared_at',now());
END $$;

-- 6. Rebuild status index ----------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_bank_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _n int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  -- Touch every row so the trigger recomputes flags & status
  UPDATE public.bank_transactions
    SET updated_at = now()
    WHERE user_id = _uid;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN jsonb_build_object('rebuilt', _n);
END $$;

-- 7. Backfill existing rows --------------------------------------------
UPDATE public.bank_transactions SET updated_at = now();