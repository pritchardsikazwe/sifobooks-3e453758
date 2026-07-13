
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS num_children integer,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS job_description text,
  ADD COLUMN IF NOT EXISTS leave_days_entitlement numeric(6,2) DEFAULT 24;

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS housing_allowance numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_allowance numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utility_allowance numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leave_pay numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leave_days_taken numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_differential numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absentism numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_reporting numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_recovery numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advances numeric(14,2) DEFAULT 0;
