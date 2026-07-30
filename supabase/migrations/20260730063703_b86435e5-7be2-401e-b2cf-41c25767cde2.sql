ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS charge_code text,
  ADD COLUMN IF NOT EXISTS funding_source text;