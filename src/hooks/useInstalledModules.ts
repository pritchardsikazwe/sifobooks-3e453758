import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, isModuleInstalled } from "@/lib/modules";

/**
 * Returns which modules are installed for the current user's active company.
 * "Installed" = row in company_modules OR module.defaultInstalled OR core.
 */
export function useInstalledModules() {
  const [installed, setInstalled] = useState<Set<string>>(() => {
    // Optimistic default: all defaultInstalled + core
    return new Set(MODULES.filter(m => m.core || m.defaultInstalled).map(m => m.key));
  });
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: c } = await supabase
      .from("companies").select("id").eq("user_id", u.user.id).maybeSingle();
    const cid = c?.id ?? null;
    setCompanyId(cid);

    const explicit = new Set<string>();
    const suppressed = new Set<string>();
    if (cid) {
      const { data: rows } = await supabase
        .from("company_modules").select("module_key").eq("company_id", cid);
      (rows ?? []).forEach(r => {
        const k = r.module_key;
        if (k.startsWith("__off__:")) suppressed.add(k.slice("__off__:".length));
        else explicit.add(k);
      });
    }
    const merged = new Set<string>();
    MODULES.forEach(m => {
      if (m.core) { merged.add(m.key); return; }
      if (suppressed.has(m.key)) return;
      if (isModuleInstalled(m.key, explicit)) merged.add(m.key);
    });
    setInstalled(merged);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { installed, companyId, loading, refresh, isInstalled: (k: string) => installed.has(k) };
}
