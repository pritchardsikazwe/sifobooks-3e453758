
ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS earnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deductions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ytd_taxable numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ytd_paye numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ytd_napsa numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_worked numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;
