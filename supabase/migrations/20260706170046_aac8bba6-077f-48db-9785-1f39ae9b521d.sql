
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS reconciled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matched_type text,
  ADD COLUMN IF NOT EXISTS matched_id uuid,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;
