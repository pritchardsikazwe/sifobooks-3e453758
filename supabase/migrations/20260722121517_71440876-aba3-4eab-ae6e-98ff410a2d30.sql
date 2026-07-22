
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS cashbook_type text NOT NULL DEFAULT 'main';

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS voucher_no text,
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS cost_centre text,
  ADD COLUMN IF NOT EXISTS project_ref text,
  ADD COLUMN IF NOT EXISTS fund_source text;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_cashbook_type ON public.bank_accounts(cashbook_type);
