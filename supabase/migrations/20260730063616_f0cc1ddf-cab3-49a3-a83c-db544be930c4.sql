
-- ============ LOANS ============
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  loan_number text NOT NULL,
  loan_type text NOT NULL DEFAULT 'staff',            -- staff | payable | receivable
  counterparty text,                                   -- lender / borrower name
  employee_id uuid,
  customer_id uuid,
  supplier_id uuid,
  principal numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,            -- annual %
  interest_method text NOT NULL DEFAULT 'straight_line', -- straight_line | reducing | none
  term_months integer NOT NULL DEFAULT 12,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  first_due_date date,
  instalment_amount numeric DEFAULT 0,
  total_interest numeric DEFAULT 0,
  total_repayable numeric DEFAULT 0,
  amount_repaid numeric NOT NULL DEFAULT 0,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  deduct_from_payroll boolean NOT NULL DEFAULT false,
  control_account_code text,
  interest_account_code text,
  status text NOT NULL DEFAULT 'active',               -- draft | active | settled | written_off | defaulted
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.loan_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  period_no integer NOT NULL,
  due_date date NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  principal_due numeric NOT NULL DEFAULT 0,
  interest_due numeric NOT NULL DEFAULT 0,
  total_due numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'due',                  -- due | paid | partial | overdue
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  principal_portion numeric NOT NULL DEFAULT 0,
  interest_portion numeric NOT NULL DEFAULT 0,
  method text DEFAULT 'bank',                          -- bank | cash | payroll | mobile
  reference text,
  payroll_run_id uuid,
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ DONORS ============
CREATE TABLE public.donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  donor_code text,
  name text NOT NULL,
  donor_type text NOT NULL DEFAULT 'institution',      -- institution | individual | government | corporate | foundation
  contact_person text,
  email text,
  phone text,
  country text DEFAULT 'Zambia',
  address text,
  focus_area text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.donor_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  donor_id uuid REFERENCES public.donors(id) ON DELETE SET NULL,
  pledge_ref text,
  pledge_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  amount numeric NOT NULL DEFAULT 0,
  received_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  purpose text,
  fund_name text,
  is_restricted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pledged',              -- pledged | partial | received | cancelled
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.donation_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  donor_id uuid REFERENCES public.donors(id) ON DELETE SET NULL,
  pledge_id uuid REFERENCES public.donor_pledges(id) ON DELETE SET NULL,
  receipt_no text,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  method text DEFAULT 'bank',
  reference text,
  fund_name text,
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grant_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grant_id uuid REFERENCES public.school_grants(id) ON DELETE CASCADE,
  donor_id uuid REFERENCES public.donors(id) ON DELETE SET NULL,
  title text NOT NULL,
  milestone_type text NOT NULL DEFAULT 'report',       -- report | disbursement | deliverable | audit
  due_date date,
  completed_date date,
  amount numeric DEFAULT 0,
  owner text,
  status text NOT NULL DEFAULT 'pending',              -- pending | in_progress | submitted | overdue | done
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ SCHOOL ============
CREATE TABLE public.school_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  name text NOT NULL,
  grade_level text,
  stream text,
  academic_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
  class_teacher text,
  capacity integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  student_no text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text,
  date_of_birth date,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  enrolment_date date DEFAULT CURRENT_DATE,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  guardian_relationship text,
  address text,
  boarding text DEFAULT 'day',                          -- day | boarding
  sponsorship text,                                     -- self | bursary | ovc | donor
  status text NOT NULL DEFAULT 'active',                -- active | transferred | graduated | withdrawn
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  fee_name text NOT NULL,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  academic_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
  term text NOT NULL DEFAULT 'Term 1',
  amount numeric NOT NULL DEFAULT 0,
  fee_type text DEFAULT 'tuition',                      -- tuition | boarding | pta | exam | uniform | other
  is_mandatory boolean NOT NULL DEFAULT true,
  income_account_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  academic_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
  term text NOT NULL DEFAULT 'Term 1',
  description text,
  amount_due numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid',                -- unpaid | partial | paid | waived
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  student_fee_id uuid REFERENCES public.student_fees(id) ON DELETE SET NULL,
  receipt_no text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  method text DEFAULT 'cash',
  reference text,
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  voucher_no text,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  txn_type text NOT NULL DEFAULT 'payment',             -- float | payment | reimbursement
  payee text,
  description text,
  charge_code text,
  amount numeric NOT NULL DEFAULT 0,
  balance_after numeric,
  approved_by text,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ MoE coding on budgets & grants ============
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS programme_code text,
  ADD COLUMN IF NOT EXISTS programme_name text,
  ADD COLUMN IF NOT EXISTS sub_programme_code text,
  ADD COLUMN IF NOT EXISTS sub_programme_name text,
  ADD COLUMN IF NOT EXISTS charge_code text,
  ADD COLUMN IF NOT EXISTS quarter text,
  ADD COLUMN IF NOT EXISTS allocation_percentage numeric,
  ADD COLUMN IF NOT EXISTS funding_source text;

ALTER TABLE public.school_grants
  ADD COLUMN IF NOT EXISTS programme_code text,
  ADD COLUMN IF NOT EXISTS sub_programme_code text,
  ADD COLUMN IF NOT EXISTS charge_code text,
  ADD COLUMN IF NOT EXISTS donor_id uuid,
  ADD COLUMN IF NOT EXISTS allocation_percentage numeric;

-- ============ GRANTS / RLS / POLICIES ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'loans','loan_schedule','loan_repayments',
    'donors','donor_pledges','donation_receipts','grant_milestones',
    'school_classes','students','fee_structures','student_fees','fee_payments','petty_cash'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "Users manage own %1$s" ON public.%1$I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)$p$, t);
    EXECUTE format('CREATE TRIGGER set_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

CREATE INDEX idx_loan_schedule_loan ON public.loan_schedule(loan_id);
CREATE INDEX idx_loan_repayments_loan ON public.loan_repayments(loan_id);
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_student_fees_student ON public.student_fees(student_id);
CREATE INDEX idx_fee_payments_student ON public.fee_payments(student_id);
