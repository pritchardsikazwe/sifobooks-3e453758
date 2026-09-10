CREATE OR REPLACE FUNCTION public.guard_role_permission_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rbac_roles%ROWTYPE;
  is_super boolean := public.has_role(auth.uid(), 'super_admin'::app_role);
  k text := COALESCE(NEW.permission_key, OLD.permission_key);
  rid uuid := COALESCE(NEW.role_id, OLD.role_id);
BEGIN
  SELECT * INTO r FROM public.rbac_roles WHERE id = rid;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Unknown role';
  END IF;

  -- Shared/system roles are only editable by a super admin.
  IF r.tenant_id IS NULL AND NOT is_super THEN
    RAISE EXCEPTION 'System roles can only be changed by a super administrator';
  END IF;

  IF TG_OP <> 'DELETE' THEN
    -- Only catalogued permission keys may be granted.
    IF NOT EXISTS (SELECT 1 FROM public.rbac_permissions p WHERE p.key = NEW.permission_key) THEN
      RAISE EXCEPTION 'Unknown permission key: %', NEW.permission_key;
    END IF;

    -- Administration-level keys may only be granted by the tenant owner or a super admin.
    IF k IN ('users.manage', 'roles.manage', 'settings.manage', 'hr.manage')
       AND NOT is_super
       AND r.tenant_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the company owner can grant the % permission', k;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS guard_role_permission_grant ON public.rbac_role_permissions;
CREATE TRIGGER guard_role_permission_grant
BEFORE INSERT OR UPDATE OR DELETE ON public.rbac_role_permissions
FOR EACH ROW EXECUTE FUNCTION public.guard_role_permission_grant();