-- Phase 1: Kwacha default + multi-currency infrastructure

-- 1) Set every company to ZMW base currency (safe relabel)
UPDATE public.companies SET base_currency='ZMW' WHERE base_currency IS NULL OR base_currency <> 'ZMW';
ALTER TABLE public.companies ALTER COLUMN base_currency SET DEFAULT 'ZMW';
ALTER TABLE public.companies ALTER COLUMN base_currency SET NOT NULL;

-- 2) Ensure every transactional table has currency + exchange_rate
ALTER TABLE public.invoices        ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.bills           ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.quotes          ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.credit_notes    ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.receipts        ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;

ALTER TABLE public.expenses          ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW';
ALTER TABLE public.expenses          ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.bill_payments     ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW';
ALTER TABLE public.bill_payments     ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW';
ALTER TABLE public.bank_transactions ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.journal_entries   ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW';
ALTER TABLE public.journal_entries   ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1;
ALTER TABLE public.payslips          ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW';
ALTER TABLE public.payroll_runs      ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW';

-- 3) Relabel every existing row's currency to ZMW (safe: numeric values unchanged)
UPDATE public.invoices        SET currency='ZMW' WHERE currency IS NULL OR currency <> 'ZMW';
UPDATE public.bills           SET currency='ZMW' WHERE currency IS NULL OR currency <> 'ZMW';
UPDATE public.quotes          SET currency='ZMW' WHERE currency IS NULL OR currency <> 'ZMW';
UPDATE public.credit_notes    SET currency='ZMW' WHERE currency IS NULL OR currency <> 'ZMW';
UPDATE public.purchase_orders SET currency='ZMW' WHERE currency IS NULL OR currency <> 'ZMW';
UPDATE public.receipts        SET currency='ZMW' WHERE currency IS NULL OR currency <> 'ZMW';

-- 4) FX rates table (base -> quote)
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency text NOT NULL,
  to_currency   text NOT NULL,
  rate          numeric NOT NULL CHECK (rate > 0),
  as_of_date    date NOT NULL DEFAULT CURRENT_DATE,
  source        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, from_currency, to_currency, as_of_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_rates TO authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fx rates" ON public.fx_rates FOR ALL
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER fx_rates_touch BEFORE UPDATE ON public.fx_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Helper: resolve a rate for (from -> to) as of date (falls back to 1 when equal or missing)
CREATE OR REPLACE FUNCTION public.fx_rate(_uid uuid, _from text, _to text, _as_of date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT CASE
    WHEN _from IS NULL OR _to IS NULL OR upper(_from) = upper(_to) THEN 1
    ELSE COALESCE(
      (SELECT rate FROM public.fx_rates
        WHERE user_id=_uid AND upper(from_currency)=upper(_from) AND upper(to_currency)=upper(_to) AND as_of_date <= _as_of
        ORDER BY as_of_date DESC LIMIT 1),
      1
    )
  END;
$$;