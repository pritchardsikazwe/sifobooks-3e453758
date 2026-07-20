
-- Reconciliation Sessions (formal statement-vs-book reconciliation with locking)
CREATE TABLE public.reconciliation_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  statement_date date NOT NULL,
  statement_start_date date,
  statement_balance numeric NOT NULL DEFAULT 0,
  opening_balance numeric NOT NULL DEFAULT 0,
  book_balance numeric NOT NULL DEFAULT 0,
  cleared_deposits numeric NOT NULL DEFAULT 0,
  cleared_payments numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft | completed | locked
  notes text,
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_sessions TO authenticated;
GRANT ALL ON public.reconciliation_sessions TO service_role;
ALTER TABLE public.reconciliation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_recon_sessions" ON public.reconciliation_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_recon_sessions_updated
BEFORE UPDATE ON public.reconciliation_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link bank transactions to a reconciliation session (which "clears" them)
CREATE TABLE public.reconciliation_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
  bank_txn_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  cleared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, bank_txn_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_lines TO authenticated;
GRANT ALL ON public.reconciliation_lines TO service_role;
ALTER TABLE public.reconciliation_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_recon_lines" ON public.reconciliation_lines FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recon_lines_session ON public.reconciliation_lines(session_id);
CREATE INDEX idx_recon_lines_txn ON public.reconciliation_lines(bank_txn_id);
CREATE INDEX idx_recon_sessions_account ON public.reconciliation_sessions(bank_account_id, statement_date DESC);

-- Guardrail: prevent edits to bank transactions locked into a completed/locked session
CREATE OR REPLACE FUNCTION public.prevent_locked_bank_txn_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _locked int;
BEGIN
  SELECT count(*) INTO _locked
  FROM public.reconciliation_lines rl
  JOIN public.reconciliation_sessions rs ON rs.id = rl.session_id
  WHERE rl.bank_txn_id = COALESCE(NEW.id, OLD.id)
    AND rs.status IN ('completed','locked');
  IF _locked > 0 THEN
    RAISE EXCEPTION 'Bank transaction is locked by a completed reconciliation session';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_prevent_locked_bank_txn_upd ON public.bank_transactions;
CREATE TRIGGER trg_prevent_locked_bank_txn_upd
BEFORE UPDATE OF amount, txn_date, description, reference, bank_account_id ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_bank_txn_edit();

DROP TRIGGER IF EXISTS trg_prevent_locked_bank_txn_del ON public.bank_transactions;
CREATE TRIGGER trg_prevent_locked_bank_txn_del
BEFORE DELETE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_bank_txn_edit();

-- RPC to compute recon summary (book balance, cleared totals, difference)
CREATE OR REPLACE FUNCTION public.compute_reconciliation(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  s record; _opening numeric := 0; _deposits numeric := 0; _payments numeric := 0;
  _book numeric := 0; _diff numeric := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO s FROM reconciliation_sessions WHERE id=_session_id AND user_id=_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  -- Cleared totals from linked bank transactions
  SELECT
    COALESCE(SUM(CASE WHEN bt.amount > 0 THEN bt.amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN bt.amount < 0 THEN -bt.amount ELSE 0 END),0)
  INTO _deposits, _payments
  FROM reconciliation_lines rl
  JOIN bank_transactions bt ON bt.id = rl.bank_txn_id
  WHERE rl.session_id = _session_id AND rl.cleared;

  _opening := COALESCE(s.opening_balance, 0);
  _book := _opening + _deposits - _payments;
  _diff := s.statement_balance - _book;

  UPDATE reconciliation_sessions
    SET cleared_deposits=_deposits, cleared_payments=_payments,
        book_balance=_book, difference=_diff, updated_at=now()
    WHERE id=_session_id;

  RETURN jsonb_build_object(
    'opening_balance', _opening,
    'cleared_deposits', _deposits,
    'cleared_payments', _payments,
    'book_balance', _book,
    'statement_balance', s.statement_balance,
    'difference', _diff,
    'balanced', abs(_diff) < 0.01
  );
END $$;

-- RPC to lock a completed session
CREATE OR REPLACE FUNCTION public.lock_reconciliation(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _diff numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  PERFORM compute_reconciliation(_session_id);
  SELECT difference INTO _diff FROM reconciliation_sessions WHERE id=_session_id AND user_id=_uid;
  IF _diff IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF abs(_diff) >= 0.01 THEN
    RAISE EXCEPTION 'Cannot lock: statement and book balances differ by %', _diff;
  END IF;
  UPDATE reconciliation_sessions
    SET status='locked', locked_at=now(), locked_by=_uid, updated_at=now()
    WHERE id=_session_id AND user_id=_uid;
  -- Mark linked bank transactions reconciled
  UPDATE bank_transactions bt
    SET reconciled=true, reconciled_at=COALESCE(reconciled_at, now())
    FROM reconciliation_lines rl
    WHERE rl.session_id=_session_id AND rl.bank_txn_id=bt.id;
  RETURN jsonb_build_object('locked', true);
END $$;
