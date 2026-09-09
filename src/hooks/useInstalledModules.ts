import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, isModuleInstalled } from "@/lib/modules";
import { moduleAllowedForAccountingLevel, type AccountingLevel } from "@/lib/accounting-config";

/**
 * Returns which modules are visible for the current user's active company.
 * Accounting level is a presentation/configuration gate only: modules and data
 * remain installed and existing routes are never deleted.
 */
export function useInstalledModules() {
  const [installed, setInstalled] = useState<Set<string>>(() => {
    return new Set(MODULES.filter(m => m.core || m.defaultInstalled).map(m => m.key));
  });
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }

    const { data: p } = await supabase
      .from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
    let cid: string | null = (p?.active_company_id as string | null) ?? null;
    if (!cid) {
      const { data: cs } = await supabase
        .from("companies").select("id").eq("user_id", u.user.id).order("created_at").limit(1);
      cid = cs?.[0]?.id ?? null;
    }
    setCompanyId(cid);

    const explicit = new Set<string>();
    const suppressed = new Set<string>();
    let accountingLevel: AccountingLevel = "full";

    if (cid) {
      const { data: company } = await supabase
        .from("companies").select("accounting_level").eq("id", cid).maybeSingle();
      const value = company?.accounting_level as string | null | undefined;
      if (value === "starter" || value === "standard" || value === "full") accountingLevel = value;

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
      if (!moduleAllowedForAccountingLevel(m, accountingLevel)) return;
      if (isModuleInstalled(m.key, explicit)) merged.add(m.key);
    });
    setInstalled(merged);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { installed, companyId, loading, refresh, isInstalled: (k: string) => installed.has(k) };
}
