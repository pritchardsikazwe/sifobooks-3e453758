import type { WorkspaceMode } from "@/lib/workspace";

/**
 * Workspace-level module policy.
 *
 * This controls the default experience only. It does not remove database
 * capabilities or change the accounting engine. Explicit company module rows
 * can add optional modules, while this policy prevents a workspace from
 * exposing unrelated modules by default.
 */
const COMMON = new Set([
  "core_home",
  "sales",
  "purchases",
  "inventory",
  "reports",
  "compliance",
  "learning",
  "admin",
]);

const FULL_ACCOUNTING = new Set([
  ...COMMON,
  "finance",
  "fixed_assets",
  "budgets",
  "multi_currency",
  "hr_payroll",
]);

const RETAIL = new Set([...COMMON, "retail_pos"]);
const RETAIL_BASIC = new Set([...RETAIL]);
const RETAIL_FULL = new Set([...FULL_ACCOUNTING, "retail_pos"]);
const RESTAURANT = new Set([...COMMON, "restaurant"]);
const HOTEL = new Set([...FULL_ACCOUNTING, "restaurant"]);
const NGO = new Set([...FULL_ACCOUNTING, "donors"]);
const ACCOUNTING = new Set([...FULL_ACCOUNTING]);

const POLICY: Record<WorkspaceMode, Set<string>> = {
  general_pos: RETAIL,
  retail_basic_accounting: RETAIL_BASIC,
  retail_full_accounting: RETAIL_FULL,
  restaurant: RESTAURANT,
  hotel: HOTEL,
  ngo_donor: NGO,
  accounting: ACCOUNTING,
  pos_accounting: RETAIL_FULL,
};

export function allowedModulesForWorkspace(mode: WorkspaceMode): Set<string> {
  return POLICY[mode] ?? ACCOUNTING;
}

export function isModuleAllowedForWorkspace(mode: WorkspaceMode, moduleKey: string): boolean {
  return allowedModulesForWorkspace(mode).has(moduleKey);
}
