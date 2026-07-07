
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry text;

CREATE TABLE IF NOT EXISTS public.company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_modules TO authenticated;
GRANT ALL ON public.company_modules TO service_role;

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their company modules"
  ON public.company_modules
  FOR ALL
  USING (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_company_admin(company_id, auth.uid()));

CREATE TRIGGER update_company_modules_updated_at
  BEFORE UPDATE ON public.company_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS company_modules_company_idx ON public.company_modules(company_id);
