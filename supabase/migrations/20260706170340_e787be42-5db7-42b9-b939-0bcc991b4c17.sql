
CREATE TABLE IF NOT EXISTS public.expense_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('supplier','keyword')),
  match_value text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_category_rules TO authenticated;
GRANT ALL ON public.expense_category_rules TO service_role;

ALTER TABLE public.expense_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own expense rules"
  ON public.expense_category_rules FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_expense_category_rules_updated_at
  BEFORE UPDATE ON public.expense_category_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_expense_rules_user ON public.expense_category_rules(user_id, is_active, priority);
