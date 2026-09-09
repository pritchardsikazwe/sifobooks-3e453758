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
  {
    id: "starter",
    label: "Starter Accounting",
    description: "Simple invoicing, expenses, customers, suppliers and basic reports.",
    bestFor: "Small businesses getting started",
  },
  {
    id: "standard",
    label: "Standard Accounting",
    description: "Core accounting plus inventory, banking, reconciliation and management reports.",
    bestFor: "Growing businesses",
  },
  {
    id: "full",
    label: "Full Accounting",
    description: "Complete SifoBooks accounting with ledgers, journals, controls, compliance and advanced reporting.",
    bestFor: "Accountants and established businesses",
  },
];

export function getAccountingLevelMeta(level: string | null | undefined): AccountingLevelMeta {
  return ACCOUNTING_LEVELS.find((x) => x.id === level) ?? ACCOUNTING_LEVELS[2];
}

export async function getAccountingLevel(): Promise<{ companyId: string | null; level: AccountingLevel }> {
  const companyId = await getActiveCompanyId();
  if (!companyId) return { companyId: null, level: "full" };

  const { data } = await supabase
    .from("companies")
    .select("accounting_level")
    .eq("id", companyId)
    .maybeSingle();

  const level = data?.accounting_level as AccountingLevel | null | undefined;
  return {
    companyId,
    level: level === "starter" || level === "standard" || level === "full" ? level : "full",
  };
}

export async function setAccountingLevel(level: AccountingLevel, companyId?: string) {
  const id = companyId ?? (await getActiveCompanyId());
  if (!id) throw new Error("No active company");

  const { error } = await supabase
    .from("companies")
    .update({ accounting_level: level })
    .eq("id", id);
  if (error) throw error;
  return id;
}

/** Minimum accounting level required for each optional module. */
export const MODULE_MIN_ACCOUNTING_LEVEL: Record<string, AccountingLevel> = {
  // Starter intentionally exposes the simple day-to-day business workflow.
  inventory: "standard",
  finance: "standard",
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
  // Retail POS is useful at every level when selected as the workspace.
  retail_pos: "starter",
};

export function accountingLevelAllows(current: AccountingLevel, minimum: AccountingLevel): boolean {
  const rank: Record<AccountingLevel, number> = { starter: 1, standard: 2, full: 3 };
  return rank[current] >= rank[minimum];
}

export function moduleAllowedForAccountingLevel(module: ModuleDef, level: AccountingLevel): boolean {
  const minimum = MODULE_MIN_ACCOUNTING_LEVEL[module.key];
  return !minimum || accountingLevelAllows(level, minimum);
}
