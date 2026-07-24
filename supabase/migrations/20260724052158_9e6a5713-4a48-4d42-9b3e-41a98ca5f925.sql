
CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, module_key)
);

GRANT SELECT ON public.role_module_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_module_permissions TO authenticated;
GRANT ALL ON public.role_module_permissions TO service_role;

ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can read role permissions"
  ON public.role_module_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage role permissions"
  ON public.role_module_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_rmp_updated
  BEFORE UPDATE ON public.role_module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults. Admins & super_admins get full access to everything.
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage)
SELECT r::app_role, m, true, true
FROM (VALUES ('admin'),('super_admin')) AS roles(r)
CROSS JOIN (VALUES
  ('core_home'),('sales'),('purchases'),('finance'),('fixed_assets'),('budgets'),
  ('multi_currency'),('inventory'),('hr_payroll'),('crm'),('projects'),
  ('reports'),('compliance'),('school_erp'),('admin')
) AS mods(m)
ON CONFLICT (role, module_key) DO NOTHING;

-- Manager: view + manage everything except admin
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage) VALUES
  ('manager','core_home',true,true),
  ('manager','sales',true,true),
  ('manager','purchases',true,true),
  ('manager','finance',true,true),
  ('manager','fixed_assets',true,true),
  ('manager','budgets',true,true),
  ('manager','multi_currency',true,true),
  ('manager','inventory',true,true),
  ('manager','hr_payroll',true,true),
  ('manager','crm',true,true),
  ('manager','projects',true,true),
  ('manager','reports',true,true),
  ('manager','compliance',true,true),
  ('manager','school_erp',true,true),
  ('manager','admin',true,false)
ON CONFLICT (role, module_key) DO NOTHING;

-- Accountant: finance-heavy
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage) VALUES
  ('accountant','core_home',true,false),
  ('accountant','sales',true,true),
  ('accountant','purchases',true,true),
  ('accountant','finance',true,true),
  ('accountant','fixed_assets',true,true),
  ('accountant','budgets',true,true),
  ('accountant','multi_currency',true,true),
  ('accountant','inventory',true,false),
  ('accountant','hr_payroll',true,false),
  ('accountant','reports',true,true),
  ('accountant','compliance',true,true),
  ('accountant','school_erp',true,false)
ON CONFLICT (role, module_key) DO NOTHING;

-- Sales
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage) VALUES
  ('sales','core_home',true,false),
  ('sales','sales',true,true),
  ('sales','crm',true,true),
  ('sales','inventory',true,false),
  ('sales','reports',true,false)
ON CONFLICT (role, module_key) DO NOTHING;

-- Purchaser
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage) VALUES
  ('purchaser','core_home',true,false),
  ('purchaser','purchases',true,true),
  ('purchaser','inventory',true,true),
  ('purchaser','reports',true,false)
ON CONFLICT (role, module_key) DO NOTHING;

-- HR
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage) VALUES
  ('hr','core_home',true,false),
  ('hr','hr_payroll',true,true),
  ('hr','reports',true,false),
  ('hr','school_erp',true,false)
ON CONFLICT (role, module_key) DO NOTHING;

-- Viewer: read-only everything
INSERT INTO public.role_module_permissions (role, module_key, can_view, can_manage)
SELECT 'viewer'::app_role, m, true, false
FROM (VALUES
  ('core_home'),('sales'),('purchases'),('finance'),('fixed_assets'),('budgets'),
  ('multi_currency'),('inventory'),('hr_payroll'),('crm'),('projects'),
  ('reports'),('compliance'),('school_erp')
) AS mods(m)
ON CONFLICT (role, module_key) DO NOTHING;

-- Helpers: does the current user have view/manage on a module through any of their roles?
CREATE OR REPLACE FUNCTION public.user_can_view_module(_user_id UUID, _module_key TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id,'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_module_permissions p ON p.role = ur.role
      WHERE ur.user_id = _user_id AND p.module_key = _module_key AND p.can_view
    )
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_module(_user_id UUID, _module_key TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id,'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_module_permissions p ON p.role = ur.role
      WHERE ur.user_id = _user_id AND p.module_key = _module_key AND p.can_manage
    )
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;
