import { supabase } from "@/integrations/supabase/client";

/** Add-on modules shown on Subscription & Billing. `moduleKey` is the existing company_modules key. */
export type CatalogModule = {
  moduleKey: string | null; // null = not yet available
  extraKeys?: string[]; // companion company_modules keys enabled together with moduleKey
  label: string;
  emoji: string;
  includes: string[];
};

export const MODULE_CATALOG: CatalogModule[] = [
  { moduleKey: "hotel_erp", label: "Hotel Management", emoji: "🏨", includes: ["Rooms", "Reservations", "Guests", "Front Desk", "Check-in / Check-out", "Hotel billing", "Hotel reports"] },
  { moduleKey: "restaurant", label: "Restaurant", emoji: "🍽️", includes: ["Restaurant POS", "Tables", "Kitchen", "Menu", "Recipes"] },
  { moduleKey: "school_erp", label: "School Management", emoji: "🏫", includes: ["Students", "Classes", "Fees", "Attendance", "School reports"] },
  { moduleKey: "loans", extraKeys: ["borrowers", "repayments", "portfolio"], label: "Microfinance", emoji: "💰", includes: ["Borrowers", "Loans", "Repayments", "Portfolio reports"] },
  { moduleKey: "property_management", label: "Property Management", emoji: "🏢", includes: ["Properties", "Units", "Tenants", "Leases", "Rent billing"] },
  { moduleKey: "hr_payroll", label: "Payroll", emoji: "👥", includes: ["Employees", "Pay runs", "Payslips", "PAYE, NAPSA, NHIMA"] },
  { moduleKey: "retail_pos", label: "Retail POS", emoji: "🛒", includes: ["Shop till", "Cashier shifts", "Sales history", "Returns"] },
];

/** Reads which catalogue modules are switched on for a company (explicit row, not suppressed). */
export async function loadEnabledCatalogModules(companyId: string): Promise<Set<string>> {
  const { data } = await supabase.from("company_modules").select("module_key").eq("company_id", companyId);
  const keys = new Set<string>((data ?? []).map((r: any) => r.module_key));
  const on = new Set<string>();
  for (const m of MODULE_CATALOG) {
    if (m.moduleKey && keys.has(m.moduleKey) && !keys.has(`__off__:${m.moduleKey}`)) on.add(m.moduleKey);
  }
  return on;
}

/** Switches a module on using the same company_modules rows as Industry & Business. */
export async function addCatalogModule(params: { userId: string; companyId: string; moduleKey: string; extraKeys?: string[] }) {
  const keys = [params.moduleKey, ...(params.extraKeys ?? [])];
  const { error: delErr } = await supabase.from("company_modules").delete()
    .eq("company_id", params.companyId).in("module_key", keys.map((k) => `__off__:${k}`));
  if (delErr) throw delErr;
  const { error } = await supabase.from("company_modules").upsert(
    keys.map((k) => ({
      user_id: params.userId, company_id: params.companyId, module_key: k,
      config: { source: "subscription_add_module" },
    })),
    { onConflict: "company_id,module_key" },
  );
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sifobooks:modules-changed"));
}
