// SifoPayroll — payroll as a standalone product option.
//
// This does NOT create a second payroll engine. It only records that a company
// bought Payroll on its own, so navigation and onboarding stay focused. Every
// existing route, module and deep link keeps working; a payroll-only tenant can
// switch on the rest of SifoBooks at any time.

import { supabase } from "@/integrations/supabase/client";
import { MODULES } from "@/lib/modules";
import { getActiveCompanyId, setWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";

/** Modules a payroll-only company keeps switched on. */
export const PAYROLL_ONLY_MODULES = ["hr_payroll"] as const;

export function isPayrollOnly(mode: string | null | undefined): boolean {
  return mode === "payroll_only";
}

/** Non-core modules that are suppressed while a company is payroll-only. */
export function modulesToSuppress(): string[] {
  return MODULES.filter(
    (m) => !m.core && !(PAYROLL_ONLY_MODULES as readonly string[]).includes(m.key),
  ).map((m) => m.key);
}

/**
 * Switch a company to the payroll-only product.
 * Uses the existing company_modules suppression mechanism — no data is deleted
 * and no chart of accounts is seeded.
 */
export async function activatePayrollOnly(opts?: { companyId?: string; userId?: string }) {
  const { data: u } = await supabase.auth.getUser();
  const userId = opts?.userId ?? u.user?.id;
  const companyId = opts?.companyId ?? (await getActiveCompanyId());
  if (!userId || !companyId) throw new Error("No active company");

  const rows = [
    ...PAYROLL_ONLY_MODULES.map((k) => ({ user_id: userId, company_id: companyId, module_key: k, config: {} })),
    ...modulesToSuppress().map((k) => ({
      user_id: userId,
      company_id: companyId,
      module_key: `__off__:${k}`,
      config: {},
    })),
  ];
  const { error } = await supabase
    .from("company_modules")
    .upsert(rows, { onConflict: "company_id,module_key" });
  if (error) throw error;

  await setWorkspaceMode("payroll_only", companyId);
  return companyId;
}

/**
 * Re-open the full SifoBooks suite for a payroll-only company by removing the
 * suppression rows. Nothing is created or seeded; existing payroll data stays.
 */
export async function upgradeFromPayrollOnly(opts?: { companyId?: string; mode?: WorkspaceMode }) {
  const companyId = opts?.companyId ?? (await getActiveCompanyId());
  if (!companyId) throw new Error("No active company");
  const keys = modulesToSuppress().map((k) => `__off__:${k}`);
  const { error } = await supabase
    .from("company_modules")
    .delete()
    .eq("company_id", companyId)
    .in("module_key", keys);
  if (error) throw error;
  await setWorkspaceMode(opts?.mode ?? "accounting", companyId);
  return companyId;
}

/**
 * Is the shared accounting engine available for this company?
 * Payroll-only tenants calculate and pay payroll, but payroll journals are only
 * posted once Accounting is switched on — we never fake a GL posting.
 */
export function accountingEnabled(mode: string | null | undefined, installed?: Set<string>): boolean {
  if (isPayrollOnly(mode)) return false;
  if (installed && !installed.has("finance") && !installed.has("accounting")) {
    // Fall back to true when the registry uses different keys for finance.
    return installed.size === 0 ? true : installed.has("core_home");
  }
  return true;
}
