import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModulePerm = { can_view: boolean; can_manage: boolean };

/**
 * Loads the current user's per-module permissions by unioning all their
 * role_module_permissions rows. If the user has no roles assigned, defaults
 * to full access (single-tenant/owner flow).
 */
export function usePermissions() {
  const [perms, setPerms] = useState<Record<string, ModulePerm>>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setPerms({}); setRoles([]); setLoading(false); return; }

    const { data: userRoles } = await supabase
      .from("user_roles").select("role").eq("user_id", u.user.id);
    const roleList = (userRoles ?? []).map((r: any) => r.role as string);
    setRoles(roleList);
    const sa = roleList.includes("super_admin");
    setIsSuperAdmin(sa);

    // No assigned roles → treat as owner with full access.
    if (roleList.length === 0) {
      setPerms({});
      setLoading(false);
      return;
    }

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

  const hasAnyRole = roles.length > 0;
  const canView = (key: string) => {
    if (isSuperAdmin) return true;
    if (!hasAnyRole) return true; // owner default
    return Boolean(perms[key]?.can_view);
  };
  const canManage = (key: string) => {
    if (isSuperAdmin) return true;
    if (!hasAnyRole) return true;
    return Boolean(perms[key]?.can_manage);
  };

  return { perms, roles, isSuperAdmin, loading, refresh, canView, canManage };
}
