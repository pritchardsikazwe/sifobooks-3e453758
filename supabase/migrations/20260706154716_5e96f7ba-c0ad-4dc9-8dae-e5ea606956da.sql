
-- ============ Feature flags ============
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admins manage flags" ON public.feature_flags;
CREATE POLICY "super admins manage flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "authenticated read flags" ON public.feature_flags;
CREATE POLICY "authenticated read flags" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_feature_flags_updated ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed core toggles
INSERT INTO public.feature_flags (key, label, description, category, enabled) VALUES
  ('invoices',       'Invoices',        'Create, post and void invoices',           'sales',    true),
  ('quotes',         'Quotes',          'Create, post and convert quotes',          'sales',    true),
  ('credit_notes',   'Credit Notes',    'Issue credit notes against invoices',      'sales',    true),
  ('inventory',      'Inventory',       'Stock items and movements',                'inventory',true),
  ('purchases',      'Purchases',       'Bills, purchase orders, suppliers',        'purchases',true),
  ('payroll',        'Payroll',         'Payroll runs and payslips',                'hr',       true),
  ('hr',             'HR & Employees',  'Employees, leave, attendance',             'hr',       true),
  ('subscriptions',  'Subscriptions',   'Company subscription plans',               'billing',  true),
  ('compliance',     'Compliance',      'ZRA / NAPSA / NHIMA obligations',          'compliance',true),
  ('audit_logs',     'Audit Logs',      'System-wide activity trail',               'security', true),
  ('signups',        'New Sign-ups',    'Allow new users to register',              'system',   true),
  ('maintenance',    'Maintenance Mode','Block non-admin access to the system',     'system',   false)
ON CONFLICT (key) DO NOTHING;

-- ============ Auto-grant super_admin to designated email ============
CREATE OR REPLACE FUNCTION public.grant_super_admin_for_designated_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'pritchardsikazwe@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_super ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_super
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_for_designated_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_super ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_super
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_super_admin_for_designated_email();

-- Grant now if the user already exists and is confirmed
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users
WHERE lower(email) = 'pritchardsikazwe@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
