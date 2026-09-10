CREATE TABLE public.payroll_statutory_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  effective_from date NOT NULL,
  paye_bands jsonb NOT NULL DEFAULT '[]'::jsonb,
  napsa_rate numeric NOT NULL DEFAULT 0.05,
  napsa_employer_rate numeric NOT NULL DEFAULT 0.05,
  napsa_cap numeric NOT NULL DEFAULT 0,
  nhima_rate numeric NOT NULL DEFAULT 0.01,
  nhima_employer_rate numeric NOT NULL DEFAULT 0.01,
  wcf_rate numeric NOT NULL DEFAULT 0.015,
  sdl_rate numeric NOT NULL DEFAULT 0.005,
  housing_exempt_pct numeric NOT NULL DEFAULT 0.30,
  source_note text,
  verified_by text,
  verified_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, effective_from)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_statutory_rules TO authenticated;
GRANT ALL ON public.payroll_statutory_rules TO service_role;
ALTER TABLE public.payroll_statutory_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants manage their statutory rules"
  ON public.payroll_statutory_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.payroll_payment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  bank_account_id uuid,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  pay_date date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  employees_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','cancelled')),
  reference text,
  bank_transaction_id uuid,
  notes text,
  created_by uuid,
  paid_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_payment_batches_run_idx ON public.payroll_payment_batches(user_id, payroll_run_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_payment_batches TO authenticated;
GRANT ALL ON public.payroll_payment_batches TO service_role;
ALTER TABLE public.payroll_payment_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants manage their payroll payment batches"
  ON public.payroll_payment_batches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER payroll_statutory_rules_updated_at
  BEFORE UPDATE ON public.payroll_statutory_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER payroll_payment_batches_updated_at
  BEFORE UPDATE ON public.payroll_payment_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();