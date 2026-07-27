
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS total_wcf numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sdl numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_overtime numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bonus numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_allowances numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_employer_cost numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employees_paid integer DEFAULT 0;
