
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  expense_number text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text,
  supplier_id uuid,
  payment_method text NOT NULL DEFAULT 'cash',
  bank_account_id uuid,
  expense_account_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'posted',
  journal_entry_id uuid,
  reversed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_own" ON public.expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Column on journal_entries to track reversal linkage
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS reversal_of uuid,
  ADD COLUMN IF NOT EXISTS reversed_by uuid;
