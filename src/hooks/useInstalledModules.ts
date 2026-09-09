import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, isModuleInstalled } from "@/lib/modules";
import { getModeMeta, type WorkspaceMode } from "@/lib/workspace";
import { allowedModulesForWorkspace } from "@/lib/workspace-module-policy";

/**
 * Returns modules available to the current user's active company.
 *
 * The workspace mode provides the default product surface. company_modules
 * can explicitly add optional modules, while __off__:module_key suppresses a
 * module. Workspace policy is applied after those rules so a business does
 * not accidentally expose unrelated modules simply because they are marked
 * defaultInstalled in the global registry.
 */
export function useInstalledModules() {
  const [installed, setInstalled] = useState<Set<string>>(() =>
    new Set(MODULES.filter(m => m.core || m.defaultInstalled).map(m => m.key))
  );
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("accounting");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setCompanyId(null);
        setWorkspaceMode("accounting");
        setInstalled(new Set());
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("active_company_id")
        .eq("id", u.user.id)
        .maybeSingle();

      let cid: string | null = (p?.active_company_id as string | null) ?? null;
      if (!cid) {
        const { data: cs } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", u.user.id)
          .order("created_at")
          .limit(1);
        cid = cs?.[0]?.id ?? null;
      }
      setCompanyId(cid);

      let mode: WorkspaceMode = "accounting";
      if (cid) {
        const { data: company } = await supabase
          .from("companies")
          .select("workspace_mode")
          .eq("id", cid)
          .maybeSingle();
        mode = getModeMeta(company?.workspace_mode as string | null | undefined).id;
      }
      setWorkspaceMode(mode);

      const explicit = new Set<string>();
      const suppressed = new Set<string>();
      if (cid) {
        const { data: rows } = await supabase
          .from("company_modules")
          .select("module_key")
          .eq("company_id", cid);
        (rows ?? []).forEach(r => {
          const k = r.module_key;
          if (k.startsWith("__off__:")) suppressed.add(k.slice("__off__:".length));
          else explicit.add(k);
        });
      }

      const allowed = allowedModulesForWorkspace(mode);
      const merged = new Set<string>();
      MODULES.forEach(m => {
        // Workspace policy defines the product surface. Core still remains
        // available only when the workspace policy includes it.
        if (!allowed.has(m.key)) return;
        if (suppressed.has(m.key)) return;
        if (isModuleInstalled(m.key, explicit)) merged.add(m.key);
      });

      setInstalled(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    installed,
    companyId,
    workspaceMode,
    loading,
    refresh,
    isInstalled: (k: string) => installed.has(k),
  };
}
