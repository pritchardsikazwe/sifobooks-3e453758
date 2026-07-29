-- ============ Payroll Setup master data ============

CREATE TABLE public.payroll_income_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'ALLOWANCE',
  short_name text,
  basis text DEFAULT 'Monthly',
  taxable boolean NOT NULL DEFAULT true,
  taxable_pct numeric(6,2) DEFAULT 100,
  has_napsa boolean NOT NULL DEFAULT false,
  has_nhima boolean NOT NULL DEFAULT false,
  deductible boolean NOT NULL DEFAULT false,
  to_all boolean NOT NULL DEFAULT false,
  gross_up boolean NOT NULL DEFAULT false,
  recover_days boolean NOT NULL DEFAULT false,
  freeze_me boolean NOT NULL DEFAULT false,
  show_on text DEFAULT 'Payslip Only',
  employee_formula text,
  employer_formula text,
  account_ref text,
  employer_account_ref text,
  default_amount numeric(14,2) DEFAULT 0,
  sort_order integer DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_income_types TO authenticated;
GRANT ALL ON public.payroll_income_types TO service_role;
ALTER TABLE public.payroll_income_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payroll income types" ON public.payroll_income_types FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.payroll_deduction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'DEDUCTION',
  rate numeric(9,4) DEFAULT 0,
  employer_rate numeric(9,4) DEFAULT 0,
  basis text DEFAULT 'Gross',
  earn_inclusion text DEFAULT 'Taxable',
  earn_exclusion text,
  earnings_max numeric(14,2) DEFAULT 0,
  annual_tax_limit numeric(14,2) DEFAULT 0,
  tax_pct numeric(6,2) DEFAULT 0,
  statutory boolean NOT NULL DEFAULT false,
  before_tax boolean NOT NULL DEFAULT false,
  show_on text DEFAULT 'Payslip Only',
  employee_formula text,
  employer_formula text,
  account_ref text,
  employer_account_ref text,
  sort_order integer DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_deduction_types TO authenticated;
GRANT ALL ON public.payroll_deduction_types TO service_role;
ALTER TABLE public.payroll_deduction_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payroll deduction types" ON public.payroll_deduction_types FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  description text,
  manager_name text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.divisions TO authenticated;
GRANT ALL ON public.divisions TO service_role;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own divisions" ON public.divisions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_categories TO authenticated;
GRANT ALL ON public.job_categories TO service_role;
ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own job categories" ON public.job_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pay_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  notch text,
  min_salary numeric(14,2) DEFAULT 0,
  mid_salary numeric(14,2) DEFAULT 0,
  max_salary numeric(14,2) DEFAULT 0,
  housing_allowance numeric(14,2) DEFAULT 0,
  transport_allowance numeric(14,2) DEFAULT 0,
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pay_grades TO authenticated;
GRANT ALL ON public.pay_grades TO service_role;
ALTER TABLE public.pay_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pay grades" ON public.pay_grades FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_centre_id uuid REFERENCES public.cost_centres(id) ON DELETE SET NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_category_id uuid REFERENCES public.job_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pay_grade_id uuid REFERENCES public.pay_grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_centre_id uuid REFERENCES public.cost_centres(id) ON DELETE SET NULL;

-- ============ Employee assignments ============

CREATE TABLE public.employee_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  income_type_id uuid REFERENCES public.payroll_income_types(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  hours_days_worked numeric(9,2) DEFAULT 0,
  data1 numeric(14,2) DEFAULT 0,
  data2 numeric(14,2) DEFAULT 0,
  data3 numeric(14,2) DEFAULT 0,
  effective_from date,
  effective_to date,
  comments text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_incomes TO authenticated;
GRANT ALL ON public.employee_incomes TO service_role;
ALTER TABLE public.employee_incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own employee incomes" ON public.employee_incomes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.employee_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  deduction_type_id uuid REFERENCES public.payroll_deduction_types(id) ON DELETE SET NULL,
  this_month text DEFAULT 'Show & Deduct',
  date_taken date,
  start_date date,
  end_date date,
  instalments integer DEFAULT 0,
  outstanding_months integer DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  initial_deposit numeric(14,2) DEFAULT 0,
  monthly_amount numeric(14,2) DEFAULT 0,
  outstanding_amount numeric(14,2) DEFAULT 0,
  interest_rate numeric(9,4) DEFAULT 0,
  total_interest numeric(14,2) DEFAULT 0,
  interest_monthly numeric(14,2) DEFAULT 0,
  interest_outstanding numeric(14,2) DEFAULT 0,
  data1 numeric(14,2) DEFAULT 0,
  data2 numeric(14,2) DEFAULT 0,
  data3 numeric(14,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  comments text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_deductions TO authenticated;
GRANT ALL ON public.employee_deductions TO service_role;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own employee deductions" ON public.employee_deductions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.napsa_icare_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  employer_acc_no text,
  social_security_no text,
  id_no text,
  surname text,
  forename text,
  other_names text,
  date_of_birth date,
  year integer NOT NULL,
  month integer NOT NULL,
  gross_pay numeric(14,2) DEFAULT 0,
  employer_contribution numeric(14,2) DEFAULT 0,
  employee_contribution numeric(14,2) DEFAULT 0,
  process text DEFAULT 'TRIAL',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.napsa_icare_entries TO authenticated;
GRANT ALL ON public.napsa_icare_entries TO service_role;
ALTER TABLE public.napsa_icare_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own napsa icare" ON public.napsa_icare_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.leave_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  opening_balance numeric(9,2) DEFAULT 0,
  normal_accrual numeric(9,2) DEFAULT 2,
  total_days numeric(9,2) DEFAULT 0,
  leave_days_taken numeric(9,2) DEFAULT 0,
  closing_balance numeric(9,2) DEFAULT 0,
  leave_value numeric(14,2) DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_register TO authenticated;
GRANT ALL ON public.leave_register TO service_role;
ALTER TABLE public.leave_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own leave register" ON public.leave_register FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_pit_updated BEFORE UPDATE ON public.payroll_income_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pdt_updated BEFORE UPDATE ON public.payroll_deduction_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_div_updated BEFORE UPDATE ON public.divisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jc_updated BEFORE UPDATE ON public.job_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pg_updated BEFORE UPDATE ON public.pay_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ei_updated BEFORE UPDATE ON public.employee_incomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ed_updated BEFORE UPDATE ON public.employee_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nic_updated BEFORE UPDATE ON public.napsa_icare_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lr_updated BEFORE UPDATE ON public.leave_register FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();