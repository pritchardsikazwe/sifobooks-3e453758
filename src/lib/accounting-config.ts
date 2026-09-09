import { supabase } from "@/integrations/supabase/client";
import { getActiveCompanyId } from "@/lib/workspace";

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

/**
 * Returns the minimum accounting level needed for a capability.
 * This is intentionally configuration-only: routes/data are never deleted.
 */
export function accountingLevelAllows(current: AccountingLevel, minimum: AccountingLevel): boolean {
  const rank: Record<AccountingLevel, number> = { starter: 1, standard: 2, full: 3 };
  return rank[current] >= rank[minimum];
}
