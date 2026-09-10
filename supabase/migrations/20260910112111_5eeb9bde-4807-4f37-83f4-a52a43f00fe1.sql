ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_by uuid,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payroll_statutory_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid,
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  filing_type text NOT NULL CHECK (filing_type IN ('paye','napsa','nhima','wcf','sdl')),
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  employees_count integer NOT NULL DEFAULT 0,
  employee_amount numeric NOT NULL DEFAULT 0,
  employer_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payroll_amount numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready','needs_configuration','exported','submitted','failed')),
  file_name text,
  submission_reference text,
  submitted_at timestamptz,
  acted_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_statutory_filings_unique
  ON public.payroll_statutory_filings (user_id, payroll_run_id, filing_type);
CREATE INDEX IF NOT EXISTS payroll_statutory_filings_period
  ON public.payroll_statutory_filings (user_id, period_year, period_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_statutory_filings TO authenticated;
GRANT ALL ON public.payroll_statutory_filings TO service_role;

ALTER TABLE public.payroll_statutory_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their payroll filings"
  ON public.payroll_statutory_filings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS payroll_statutory_filings_updated_at ON public.payroll_statutory_filings;
CREATE TRIGGER payroll_statutory_filings_updated_at
  BEFORE UPDATE ON public.payroll_statutory_filings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_payroll_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    IF NEW.prepared_by IS NOT NULL AND NEW.approved_by IS NOT NULL
       AND NEW.prepared_by = NEW.approved_by THEN
      RAISE EXCEPTION 'Segregation of duties: the person who prepared payroll run % cannot approve it.', NEW.run_number;
    END IF;
  END IF;
  IF NEW.status = 'posted' AND OLD.status IS DISTINCT FROM 'posted' THEN
    NEW.posted_by := COALESCE(NEW.posted_by, auth.uid());
    NEW.posted_at := COALESCE(NEW.posted_at, now());
  END IF;
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    NEW.paid_by := COALESCE(NEW.paid_by, auth.uid());
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_payroll_approval ON public.payroll_runs;
CREATE TRIGGER trg_guard_payroll_approval
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_approval();

CREATE OR REPLACE FUNCTION public.stamp_payroll_preparer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.prepared_by := COALESCE(NEW.prepared_by, auth.uid());
  NEW.prepared_at := COALESCE(NEW.prepared_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_payroll_preparer ON public.payroll_runs;
CREATE TRIGGER trg_stamp_payroll_preparer
  BEFORE INSERT ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.stamp_payroll_preparer();

REVOKE ALL ON FUNCTION public.guard_payroll_approval() FROM anon;
REVOKE ALL ON FUNCTION public.stamp_payroll_preparer() FROM anon;