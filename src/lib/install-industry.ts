import { supabase } from "@/integrations/supabase/client";
import { getIndustry, type Industry } from "@/lib/industries";

export type InstallResult = {
  industry: string;
  modules_installed: number;
  coa_added: number;
};

/**
 * Idempotent installer.
 *  - Sets companies.industry
 *  - Inserts missing chart-of-accounts rows (by account_code) for the user
 *  - Inserts company_modules rows for each selected module
 */
export async function installIndustry(params: {
  userId: string;
  companyId: string;
  industryId: string;
  moduleKeys: string[];
}): Promise<InstallResult> {
  const industry: Industry | undefined = getIndustry(params.industryId);
  if (!industry) throw new Error(`Unknown industry: ${params.industryId}`);

  // 1. Stamp company.industry
  {
    const { error } = await supabase
      .from("companies")
      .update({ industry: industry.id })
      .eq("id", params.companyId);
    if (error) throw error;
  }

  // 2. Seed CoA (idempotent by account_code per user)
  let coaAdded = 0;
  if (industry.coa.length > 0) {
    const { data: existing } = await supabase
      .from("chart_of_accounts")
      .select("account_code")
      .eq("user_id", params.userId);
    const have = new Set((existing ?? []).map(r => r.account_code));
    const toInsert = industry.coa
      .filter(a => !have.has(a.account_code))
      .map(a => ({
        user_id: params.userId,
        account_code: a.account_code,
        account_name: a.account_name,
        account_type: a.account_type,
        is_active: true,
      }));
    if (toInsert.length > 0) {
      const { error } = await supabase.from("chart_of_accounts").insert(toInsert);
      if (error) throw error;
      coaAdded = toInsert.length;
    }
  }

  // 3. Install modules (upsert on (company_id, module_key))
  let modulesInstalled = 0;
  if (params.moduleKeys.length > 0) {
    const rows = params.moduleKeys.map(k => ({
      user_id: params.userId,
      company_id: params.companyId,
      module_key: k,
      config: {},
    }));
    const { error, count } = await supabase
      .from("company_modules")
      .upsert(rows, { onConflict: "company_id,module_key", count: "exact" });
    if (error) throw error;
    modulesInstalled = count ?? rows.length;
  }

  return {
    industry: industry.id,
    modules_installed: modulesInstalled,
    coa_added: coaAdded,
  };
}

export async function uninstallModule(companyId: string, moduleKey: string) {
  const { error } = await supabase
    .from("company_modules")
    .delete()
    .eq("company_id", companyId)
    .eq("module_key", moduleKey);
  if (error) throw error;
}

export async function listInstalledModules(companyId: string): Promise<string[]> {
  const { data } = await supabase
    .from("company_modules")
    .select("module_key")
    .eq("company_id", companyId);
  return (data ?? []).map(r => r.module_key);
}
