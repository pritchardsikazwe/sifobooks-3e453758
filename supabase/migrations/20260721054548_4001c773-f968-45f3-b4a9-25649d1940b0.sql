ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS payee TEXT,
  ADD COLUMN IF NOT EXISTS charge_code TEXT;