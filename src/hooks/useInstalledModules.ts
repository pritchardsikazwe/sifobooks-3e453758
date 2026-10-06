import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES } from "@/lib/modules";
import { SIFOBOOKS_EDITION } from "@/lib/edition";
import { resolveActiveCompanyId } from "@/lib/active-company";
import { MODULE_GATE_KEY, isModuleGatingBuildEnabled, resolveInstalledModules } from "@/lib/module-gating";

export function useInstalledModules() {
  const gatingBuildEnabled = isModuleGatingBuildEnabled();
  const [installed, setInstalled] = useState<Set<string>>(() =>
    gatingBuildEnabled ? new Set(MODULES.filter(m => m.core).map(m => m.key)) : new Set(MODULES.filter(m => m.core || m.defaultInstalled).map(m => m.key))
  );
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gatingActive, setGatingActive] = useState(false);
  const [gatingFailClosed, setGatingFailClosed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }

    const cid = await resolveActiveCompanyId(u.user.id);
    setCompanyId(cid);
    const explicit = new Set<string>();
    const suppressed = new Set<string>();
    let gateOn = false;
    let moduleQueryFailed = false;

    if (cid) {
      const { data: rows, error } = await supabase.from("company_modules").select("module_key").eq("company_id", cid);
      if (error) moduleQueryFailed = true;
      else (rows ?? []).forEach(r => {
        const k = r.module_key;
        if (k === MODULE_GATE_KEY) gateOn = true;
        else if (k.startsWith("__off__:")) suppressed.add(k.slice("__off__:".length));
        else explicit.add(k);
      });
    }

    const active = gatingBuildEnabled && gateOn;
    const failClosed = gatingBuildEnabled && moduleQueryFailed;
    setGatingActive(active);
    setGatingFailClosed(failClosed);
    setInstalled(resolveInstalledModules({ explicit, suppressed, gatingActive: active, failClosed, edition: SIFOBOOKS_EDITION }));
    setLoading(false);
  }, [gatingBuildEnabled]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => { void refresh(); };
    window.addEventListener("sifobooks:modules-changed", handler);
    return () => window.removeEventListener("sifobooks:modules-changed", handler);
  }, [refresh]);

  return { installed, companyId, loading, gatingActive, gatingFailClosed, refresh, isInstalled: (k: string) => installed.has(k) };
}
