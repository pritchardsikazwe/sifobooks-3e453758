-- Restrict rbac_role_permissions writes to owners and super admins only.
-- Staff can still read the catalogue and manage role/user assignments via rbac_roles and staff_members.

DROP POLICY IF EXISTS "role perms manage" ON public.rbac_role_permissions;

CREATE POLICY "role perms insert owner or super admin"
  ON public.rbac_role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = rbac_role_permissions.role_id
        AND r.tenant_id IS NOT NULL
        AND (r.tenant_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "role perms update owner or super admin"
  ON public.rbac_role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = rbac_role_permissions.role_id
        AND r.tenant_id IS NOT NULL
        AND (r.tenant_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = rbac_role_permissions.role_id
        AND r.tenant_id IS NOT NULL
        AND (r.tenant_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "role perms delete owner or super admin"
  ON public.rbac_role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = rbac_role_permissions.role_id
        AND r.tenant_id IS NOT NULL
        AND (r.tenant_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  );