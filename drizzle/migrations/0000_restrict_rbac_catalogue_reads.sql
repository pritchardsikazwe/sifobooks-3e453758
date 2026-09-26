DROP POLICY IF EXISTS "perm catalogue readable" ON public.rbac_permissions;
CREATE POLICY "perm catalogue readable by company users" ON public.rbac_permissions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.company_members m WHERE m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid())
);
DROP POLICY IF EXISTS "auth users can read role permissions" ON public.role_module_permissions;
CREATE POLICY "company users can read role permissions" ON public.role_module_permissions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.company_members m WHERE m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid())
);