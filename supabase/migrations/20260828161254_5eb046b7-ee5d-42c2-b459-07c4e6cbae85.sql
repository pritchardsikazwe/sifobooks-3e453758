CREATE TABLE IF NOT EXISTS public.print_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  device_id text NOT NULL,
  device_type text NOT NULL DEFAULT 'web',
  terminal_name text,
  branch_name text,
  company_name text,
  printer_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_devices TO authenticated;
GRANT ALL ON public.print_devices TO service_role;
ALTER TABLE public.print_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "print_devices_own" ON public.print_devices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  device_id text,
  job_type text NOT NULL,
  title text,
  reference_id text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_jobs TO authenticated;
GRANT ALL ON public.print_jobs TO service_role;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "print_jobs_own" ON public.print_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS print_jobs_user_status_idx ON public.print_jobs (user_id, status, created_at DESC);

CREATE TRIGGER print_devices_updated_at BEFORE UPDATE ON public.print_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER print_jobs_updated_at BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();