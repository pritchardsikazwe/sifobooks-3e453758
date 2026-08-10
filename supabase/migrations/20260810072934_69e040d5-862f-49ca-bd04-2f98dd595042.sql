CREATE TABLE public.management_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID,
  period TEXT NOT NULL,
  reference TEXT NOT NULL,
  prepared_by TEXT,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  comments TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_reports TO authenticated;
GRANT ALL ON public.management_reports TO service_role;

ALTER TABLE public.management_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own management reports"
ON public.management_reports FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_management_reports_updated_at
BEFORE UPDATE ON public.management_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();