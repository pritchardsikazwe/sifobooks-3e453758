-- ============ print_jobs upgrade ============
ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS job_key text,
  ADD COLUMN IF NOT EXISTS printer_name text,
  ADD COLUMN IF NOT EXISTS printer_id uuid,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS printed_at timestamptz,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS terminal_name text,
  ADD COLUMN IF NOT EXISTS copies integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS print_jobs_user_job_key_uidx
  ON public.print_jobs (user_id, job_key) WHERE job_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS print_jobs_status_idx ON public.print_jobs (user_id, status, created_at DESC);

-- ============ printers registry ============
CREATE TABLE IF NOT EXISTS public.print_printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  branch_id uuid,
  device_id text,
  name text NOT NULL,
  label text,
  printer_type text NOT NULL DEFAULT 'receipt',
  connection text NOT NULL DEFAULT 'agent',
  status text NOT NULL DEFAULT 'unknown',
  is_default boolean NOT NULL DEFAULT false,
  is_system_default boolean NOT NULL DEFAULT false,
  ip_address text,
  port integer,
  protocol text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_printers TO authenticated;
GRANT ALL ON public.print_printers TO service_role;
ALTER TABLE public.print_printers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own printers" ON public.print_printers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS print_printers_unique_idx
  ON public.print_printers (user_id, coalesce(device_id, ''), name);

CREATE TRIGGER print_printers_updated_at BEFORE UPDATE ON public.print_printers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ routing rules ============
CREATE TABLE IF NOT EXISTS public.print_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  branch_id uuid,
  device_id text,
  job_type text NOT NULL,
  printer_name text,
  printer_id uuid REFERENCES public.print_printers(id) ON DELETE SET NULL,
  copies integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_routing TO authenticated;
GRANT ALL ON public.print_routing TO service_role;
ALTER TABLE public.print_routing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own print routing" ON public.print_routing
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS print_routing_unique_idx
  ON public.print_routing (user_id, coalesce(device_id, ''), job_type);

CREATE TRIGGER print_routing_updated_at BEFORE UPDATE ON public.print_routing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ terminals ============
ALTER TABLE public.print_devices
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS agent_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS agent_url text,
  ADD COLUMN IF NOT EXISTS agent_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_print_receipt boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_print_kitchen boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS queue_when_offline boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS retry_failed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS open_cash_drawer boolean NOT NULL DEFAULT true;