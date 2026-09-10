CREATE TABLE public.document_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  legal_name text,
  trading_name text,
  tagline text,
  address text,
  city text,
  country text,
  phone text,
  email text,
  website text,
  tpin text,
  vat_number text,
  registration_number text,
  currency text NOT NULL DEFAULT 'ZMW',
  locale text NOT NULL DEFAULT 'en-ZM',
  logo_url text,
  secondary_logo_url text,
  signature_url text,
  stamp_url text,
  theme text NOT NULL DEFAULT 'corporate',
  primary_color text NOT NULL DEFAULT '#0f4c3a',
  secondary_color text NOT NULL DEFAULT '#0f172a',
  accent_color text NOT NULL DEFAULT '#c9a84c',
  font_family text NOT NULL DEFAULT 'helvetica',
  header_note text,
  footer_note text,
  payment_instructions text,
  default_notes text,
  terms_library jsonb NOT NULL DEFAULT '[]'::jsonb,
  signatory_name text,
  signatory_title text,
  bank_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_prefixes jsonb NOT NULL DEFAULT '{}'::jsonb,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  show_provider_credit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX document_branding_company_uidx ON public.document_branding (company_id) WHERE company_id IS NOT NULL;
CREATE UNIQUE INDEX document_branding_user_uidx ON public.document_branding (user_id) WHERE company_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_branding TO authenticated;
GRANT ALL ON public.document_branding TO service_role;

ALTER TABLE public.document_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branding readable inside the tenant"
ON public.document_branding FOR SELECT TO authenticated
USING (user_id = public.current_tenant() OR public.is_staff_of(user_id));

CREATE POLICY "branding managed by authorised staff"
ON public.document_branding FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_tenant() AND public.has_perm('settings.manage', user_id));

CREATE POLICY "branding updated by authorised staff"
ON public.document_branding FOR UPDATE TO authenticated
USING (user_id = public.current_tenant() AND public.has_perm('settings.manage', user_id))
WITH CHECK (user_id = public.current_tenant() AND public.has_perm('settings.manage', user_id));

CREATE POLICY "branding removed by authorised staff"
ON public.document_branding FOR DELETE TO authenticated
USING (user_id = public.current_tenant() AND public.has_perm('settings.manage', user_id));

CREATE TRIGGER update_document_branding_updated_at
BEFORE UPDATE ON public.document_branding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();