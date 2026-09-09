import { supabase } from "@/integrations/supabase/client";
import { getActiveCompanyId } from "@/lib/workspace";
import type { ModuleDef } from "@/lib/modules";

export type AccountingLevel = "starter" | "standard" | "full";

export type AccountingLevelMeta = {
  id: AccountingLevel;
  label: string;
  description: string;
  bestFor: string;
};

export const ACCOUNTING_LEVELS: AccountingLevelMeta[] = [
  { id: "starter", label: "Starter Accounting", description: "Simple invoicing, expenses, customers, suppliers and basic reports.", bestFor: "Small businesses getting started" },
  { id: "standard", label: "Standard Accounting", description: "Core accounting plus inventory, banking, reconciliation and management reports.", bestFor: "Growing businesses" },
  { id: "full", label: "Full Accounting", description: "Complete SifoBooks accounting with ledgers, journals, controls, compliance and advanced reporting.", bestFor: "Accountants and established businesses" },
];

export function getAccountingLevelMeta(level: string | null | undefined): AccountingLevelMeta {
  return ACCOUNTING_LEVELS.find((x) => x.id === level) ?? ACCOUNTING_LEVELS[2];
}

export async function getAccountingLevel(): Promise<{ companyId: string | null; level: AccountingLevel }> {
  const companyId = await getActiveCompanyId();
  if (!companyId) return { companyId: null, level: "full" };
  const { data } = await supabase.from("companies").select("accounting_level").eq("id", companyId).maybeSingle();
  const level = data?.accounting_level as AccountingLevel | null | undefined;
  return { companyId, level: level === "starter" || level === "standard" || level === "full" ? level : "full" };
}

export async function setAccountingLevel(level: AccountingLevel, companyId?: string) {
  const id = companyId ?? (await getActiveCompanyId());
  if (!id) throw new Error("No active company");
  const { error } = await supabase.from("companies").update({ accounting_level: level }).eq("id", id);
  if (error) throw error;
  return id;
}

/** Whole-module gates. Industry/POS modules remain configuration-driven; these gates control accounting depth. */
export const MODULE_MIN_ACCOUNTING_LEVEL: Record<string, AccountingLevel> = {
  inventory: "standard",
  finance: "starter",
  fixed_assets: "full",
  budgets: "standard",
  multi_currency: "full",
  hr_payroll: "standard",
  crm: "full",
  projects: "full",
  compliance: "standard",
  loans: "full",
  donors: "full",
  school_erp: "full",
  restaurant: "standard",
  retail_pos: "starter",
};

/** Individual advanced routes. This keeps basic Finance/Reports available on Starter. */
export const ROUTE_MIN_ACCOUNTING_LEVEL: Record<string, AccountingLevel> = {
  "/bank-rules": "standard",
  "/reconciliation-sessions": "standard",
  "/journal-entries": "standard",
  "/posting-wizard": "standard",
  "/opening-balances": "full",
  "/period-close": "full",
  "/reports/afs": "standard",
  "/reports/vat-return": "standard",
  "/reports/income-tax": "standard",
  "/reports/turnover-tax": "standard",
  "/inventory/control-center": "standard",
  "/inventory/smart-reconciliation": "standard",
  "/inventory/production": "standard",
  "/inventory/transfers": "standard",
  "/inventory/reconciliation": "standard",
  "/inventory/end-of-day": "standard",
  "/inventory-sheets": "standard",
};

export function accountingLevelAllows(current: AccountingLevel, minimum: AccountingLevel): boolean {
  const rank: Record<AccountingLevel, number> = { starter: 1, standard: 2, full: 3 };
  return rank[current] >= rank[minimum];
}

export function moduleAllowedForAccountingLevel(module: ModuleDef, level: AccountingLevel): boolean {
  const minimum = MODULE_MIN_ACCOUNTING_LEVEL[module.key];
  return !minimum || accountingLevelAllows(level, minimum);
}

export function routeAllowedForAccountingLevel(url: string, level: AccountingLevel): boolean {
  const minimum = ROUTE_MIN_ACCOUNTING_LEVEL[url];
  return !minimum || accountingLevelAllows(level, minimum);
}
