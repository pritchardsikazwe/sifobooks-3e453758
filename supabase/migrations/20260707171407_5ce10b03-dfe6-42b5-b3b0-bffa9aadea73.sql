
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS reporting_class text,
  ADD COLUMN IF NOT EXISTS reporting_group text,
  ADD COLUMN IF NOT EXISTS afs_note text;

CREATE TABLE IF NOT EXISTS public.afs_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fiscal_year int NOT NULL,
  period_end date NOT NULL,
  currency text DEFAULT 'ZMW',
  payload jsonb NOT NULL,
  ai_summary text,
  ai_variance text,
  ai_cashflow text,
  ai_strategy text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.afs_reports TO authenticated;
GRANT ALL ON public.afs_reports TO service_role;

ALTER TABLE public.afs_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own afs" ON public.afs_reports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_afs_reports_updated_at BEFORE UPDATE ON public.afs_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
