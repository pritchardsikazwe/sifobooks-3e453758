import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadAccess, hasPerm as _hasPerm, hasAnyPerm, MODULE_PERMS, type Access, type PermissionKey } from "@/lib/rbac";

export type ModulePerm = { can_view: boolean; can_manage: boolean };

/**
 * Effective permissions for the signed-in user.
 *
 * - Owners (and super admins) get full access, optionally narrowed by the
 *   legacy per-role module matrix (`role_module_permissions`).
 * - Staff (rows in `staff_members`) get exactly the permissions of their role;
 *   module visibility is derived from those permissions.
 */
export function usePermissions() {
  const [perms, setPerms] = useState<Record<string, ModulePerm>>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setPerms({}); setRoles([]); setAccess(null); setLoading(false); return; }

    const a = await loadAccess();
    setAccess(a);
    const sa = Boolean(a?.is_super_admin);
    setIsSuperAdmin(sa);

    if (a && !a.is_owner && !sa) {
      // Staff: module matrix is irrelevant; permissions decide everything.
      setRoles([a.role_key ?? "staff"]);
      setPerms({});
      setLoading(false);
      return;
    }

    const { data: userRoles } = await supabase
      .from("user_roles").select("role").eq("user_id", u.user.id);
    const roleList = (userRoles ?? []).map((r: any) => r.role as string);
    setRoles(roleList);

    if (roleList.length === 0) { setPerms({}); setLoading(false); return; }

    const { data: rows } = await supabase
      .from("role_module_permissions")
      .select("module_key,can_view,can_manage,role")
      .in("role", roleList as any);

    const map: Record<string, ModulePerm> = {};
    (rows ?? []).forEach((r: any) => {
      const cur = map[r.module_key] ?? { can_view: false, can_manage: false };
      map[r.module_key] = {
        can_view: cur.can_view || Boolean(r.can_view),
        can_manage: cur.can_manage || Boolean(r.can_manage),
      };
    });
    setPerms(map);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isStaff = Boolean(access && !access.is_owner && !access.is_super_admin);
  const hasAnyRole = roles.length > 0;

  const has = (perm: PermissionKey) => _hasPerm(access, perm);
  const hasAny = (list: PermissionKey[]) => hasAnyPerm(access, list);

  const canView = (key: string) => {
    if (isSuperAdmin) return true;
    if (isStaff) {
      const req = MODULE_PERMS[key];
      if (!req) return false;
      return req.length === 0 || hasAnyPerm(access, req);
    }
    if (!hasAnyRole) return true; // owner default
    return Boolean(perms[key]?.can_view);
  };
  const canManage = (key: string) => {
    if (isSuperAdmin) return true;
    if (isStaff) {
      const manageMap: Record<string, PermissionKey[]> = {
        sales: ["accounting.manage"], purchases: ["accounting.manage"], finance: ["accounting.manage"],
        inventory: ["inventory.manage"], retail_pos: ["pos.sales.create"], restaurant: ["pos.sales.create"],
        admin: ["users.manage", "roles.manage"], reports: ["financial_reports.view"],
      };
      const req = manageMap[key] ?? MODULE_PERMS[key];
      if (!req) return false;
      return req.length === 0 || hasAnyPerm(access, req);
    }
    if (!hasAnyRole) return true;
    return Boolean(perms[key]?.can_manage);
  };

  return { perms, roles, isSuperAdmin, isStaff, access, loading, refresh, canView, canManage, has, hasAny };
}
