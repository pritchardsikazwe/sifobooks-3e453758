/**
 * Company lifecycle — Active → Archived → Restored, and hard delete only for
 * genuinely empty companies.
 *
 * The database is the authority: `company_data_inventory`, `archive_company`,
 * `restore_company` and `delete_company` are SECURITY DEFINER functions that
 * re-check the caller's ownership/administration of the company (or platform
 * super admin) immediately before doing anything, and write every success and
 * blocked attempt to `audit_logs`. Nothing in this module is trusted for
 * authorisation — it only shapes what the screen shows.
 */
import { supabase } from "@/integrations/supabase/client";

export type InventoryRow = { table: string; count: number; scope: "company" | "owner"; blocking: boolean };

export type CompanyInventory = {
  company_id: string;
  company_name: string;
  status: "active" | "archived";
  sole_company_of_owner: boolean;
  tables: InventoryRow[];
  blocking: { table: string; count: number }[];
  blocking_rows: number;
  deletable: boolean;
  recommendation: "delete_allowed" | "archive";
};

export type CompanyCategory =
  | "Users & access" | "Accounting" | "Sales & POS" | "Purchasing"
  | "Inventory" | "Banking & cash" | "Payroll & HR" | "Industry modules" | "Setup & other";

const CATEGORY_RULES: [RegExp, CompanyCategory][] = [
  [/^(company_members|rbac_|user_|staff_members|employee_pos_permissions|employee_pos_sessions|positions)/, "Users & access"],
  [/^(journal_|account_balances|chart_of_accounts|financial_periods|posting_batches|fixed_assets|asset_|budgets|cost_centres|management_reports|afs_reports|fx_rates|tax_settings|compliance_|zra_)/, "Accounting"],
  [/^(pos_|invoice|invoices|receipt|receipts|credit_note|customers|customer_|quotes|quote_items|restaurant_(order|payment|table|menu|modifier|recipe|shift|waitlist|loyalty|gift|cash|kitchen|delivery|end_of_day|reservation|settings|order_types))/, "Sales & POS"],
  [/^(bill|bills|purchase_order|supplier|expense|expenses|supplier_quotations)/, "Purchasing"],
  [/^(stock_|inventory_|warehouses|production_)/, "Inventory"],
  [/^(bank_|cashbook|cashbooks|petty_cash|imprest_|reconciliation_|loans|loan_)/, "Banking & cash"],
  [/^(payroll_|payslips|employees|employee_|attendance|leave_|pay_grades|napsa_|time_entries|timesheet)/, "Payroll & HR"],
  [/^(hotel_|restaurant_|school_|students|student_|fee_|donors|donor_|donation_|grant_|workshops?|workshop_|tuckshop_|teaching_|job_|service_tickets|moe_)/, "Industry modules"],
];

export function categoryFor(table: string): CompanyCategory {
  for (const [rx, cat] of CATEGORY_RULES) if (rx.test(table)) return cat;
  return "Setup & other";
}

export type CategorySummary = { category: CompanyCategory; total: number; blocking: number; rows: InventoryRow[] };

/** Group a raw inventory into the categories shown on the review screen. */
export function summariseInventory(inv: CompanyInventory): CategorySummary[] {
  const map = new Map<CompanyCategory, CategorySummary>();
  for (const row of inv.tables ?? []) {
    const category = categoryFor(row.table);
    const entry = map.get(category) ?? { category, total: 0, blocking: 0, rows: [] };
    entry.total += row.count;
    if (row.blocking) entry.blocking += row.count;
    entry.rows.push(row);
    map.set(category, entry);
  }
  return [...map.values()]
    .map((c) => ({ ...c, rows: c.rows.sort((a, b) => b.count - a.count) }))
    .sort((a, b) => b.total - a.total);
}

/** A company is empty (hard-delete eligible) only when it has no history at all. */
export function isEmptyCompany(inv: CompanyInventory): boolean {
  return (inv?.blocking_rows ?? 1) === 0;
}

export function deleteBlockedReason(inv: CompanyInventory): string | null {
  if (isEmptyCompany(inv)) return null;
  const top = (inv.blocking ?? []).slice(0, 3).map((b) => `${b.table.replace(/_/g, " ")} (${b.count})`).join(", ");
  return `This company has ${inv.blocking_rows} financial or operational record(s) — ${top}. Archive it instead.`;
}

/** UI gate for the destructive button. Server re-checks all of this. */
export function canConfirmDelete(opts: {
  inventory: CompanyInventory | null;
  typedName: string;
  acknowledged: boolean;
  authorised: boolean;
}): boolean {
  const { inventory, typedName, acknowledged, authorised } = opts;
  if (!inventory || !authorised || !acknowledged) return false;
  if (!isEmptyCompany(inventory)) return false;
  return typedName.trim() === inventory.company_name;
}

/* ------------------------------------------------------------------ */
/* Data access (all authorisation happens in the database)             */
/* ------------------------------------------------------------------ */

export type ManagedCompany = {
  id: string;
  name: string;
  trading_name: string | null;
  status: "active" | "archived";
  created_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  base_currency: string | null;
  country: string | null;
  workspace_mode: string | null;
  members: number;
  modules: string[];
  subscription: string | null;
  isOwner: boolean;
};

/** Companies the signed-in person may manage (RLS decides what is visible). */
export async function listManagedCompanies(userId: string): Promise<ManagedCompany[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("companies").select("*").eq("user_id", userId),
    supabase.from("company_members").select("company_id, role").eq("user_id", userId).in("role", ["owner", "admin"]),
  ]);

  const ids = new Set<string>([...(owned ?? []).map((c: any) => c.id)]);
  const memberIds = (memberships ?? []).map((m: any) => m.company_id).filter((id: string) => !ids.has(id));
  let extra: any[] = [];
  if (memberIds.length) {
    const { data } = await supabase.from("companies").select("*").in("id", memberIds);
    extra = data ?? [];
  }
  const companies = [...(owned ?? []), ...extra];
  if (!companies.length) return [];

  const allIds = companies.map((c) => c.id);
  const [{ data: members }, { data: modules }, { data: subs }] = await Promise.all([
    supabase.from("company_members").select("company_id").in("company_id", allIds),
    supabase.from("company_modules").select("company_id, module_key").in("company_id", allIds),
    supabase.from("company_subscriptions").select("company_id, status").in("company_id", allIds),
  ]);

  return companies
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      trading_name: c.trading_name ?? null,
      status: (c.status ?? "active") as "active" | "archived",
      created_at: c.created_at,
      archived_at: c.archived_at ?? null,
      archive_reason: c.archive_reason ?? null,
      base_currency: c.base_currency ?? null,
      country: c.country ?? null,
      workspace_mode: c.workspace_mode ?? null,
      members: (members ?? []).filter((m: any) => m.company_id === c.id).length,
      modules: (modules ?? [])
        .filter((m: any) => m.company_id === c.id && !String(m.module_key).startsWith("__off__:"))
        .map((m: any) => m.module_key),
      subscription: (subs ?? []).find((s: any) => s.company_id === c.id)?.status ?? null,
      isOwner: c.user_id === userId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCompanyInventory(companyId: string): Promise<CompanyInventory> {
  const { data, error } = await supabase.rpc("company_data_inventory" as never, { _company: companyId } as never);
  if (error) throw new Error(error.message);
  return data as unknown as CompanyInventory;
}

export async function archiveCompany(companyId: string, reason: string | null) {
  const { error } = await supabase.rpc("archive_company" as never, { _company: companyId, _reason: reason } as never);
  if (error) throw new Error(error.message);
}

export async function restoreCompany(companyId: string) {
  const { error } = await supabase.rpc("restore_company" as never, { _company: companyId } as never);
  if (error) throw new Error(error.message);
}

export async function deleteCompany(companyId: string, confirmName: string) {
  const { error } = await supabase.rpc("delete_company" as never, { _company: companyId, _confirm_name: confirmName } as never);
  if (error) throw new Error(error.message);
}
