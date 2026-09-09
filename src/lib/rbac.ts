/**
 * SifoBooks role-based access control — client side.
 *
 * The database is the source of truth (`has_perm()`, `my_access()`, RLS and
 * guard triggers). This module mirrors the permission catalogue so the UI can
 * decide what to render and which routes a staff member may open.
 */
import { supabase } from "@/integrations/supabase/client";

export type PermissionKey =
  | "accounting.view" | "accounting.manage" | "financial_reports.view" | "reports.view"
  | "pos.retail.access" | "pos.restaurant.access" | "pos.sales.create" | "pos.sales.view_own" | "pos.sales.view_all"
  | "pos.discount" | "pos.refund" | "pos.void" | "cash_shift.open" | "cash_shift.close" | "tables.manage" | "kitchen.access"
  | "products.view" | "products.manage" | "prices.manage" | "inventory.view" | "inventory.manage"
  | "hr.manage" | "users.manage" | "roles.manage" | "settings.manage";

export type Access = {
  tenant_id: string;
  is_owner: boolean;
  is_super_admin: boolean;
  staff_id?: string | null;
  full_name?: string | null;
  role_key?: string | null;
  role_name?: string | null;
  pos_channel?: "retail" | "restaurant" | null;
  branch_id?: string | null;
  branch_name?: string | null;
  permissions: PermissionKey[];
};

let cache: { userId: string; access: Access } | null = null;
let inflight: Promise<Access | null> | null = null;

export function clearAccessCache() { cache = null; inflight = null; }

/** Effective access for the signed-in user (cached per session). */
export async function loadAccess(force = false): Promise<Access | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) { cache = null; return null; }
  if (!force && cache && cache.userId === uid) return cache.access;
  if (!force && inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.rpc("my_access" as any);
    inflight = null;
    if (error || !data) {
      // Offline / transient failure: fall back to the last known access, else owner-of-self.
      if (cache && cache.userId === uid) return cache.access;
      const a: Access = { tenant_id: uid, is_owner: true, is_super_admin: false, permissions: [] };
      return a;
    }
    const a = data as unknown as Access;
    a.permissions = (a.permissions ?? []) as PermissionKey[];
    cache = { userId: uid, access: a };
    return a;
  })();
  return inflight;
}

/** Books owner id for the signed-in user (self for owners, employer for staff). */
export async function getTenantId(): Promise<string | null> {
  const a = await loadAccess();
  return a?.tenant_id ?? null;
}

export function hasPerm(a: Access | null | undefined, perm: PermissionKey): boolean {
  if (!a) return false;
  if (a.is_owner || a.is_super_admin) return true;
  return a.permissions.includes(perm);
}
export function hasAnyPerm(a: Access | null | undefined, perms: PermissionKey[]): boolean {
  return perms.some((p) => hasPerm(a, p));
}

/* ------------------------------------------------------------------ */
/* Route rules: first matching prefix wins; unmatched = staff denied.  */
/* ------------------------------------------------------------------ */
type Rule = { prefix: string; any?: PermissionKey[]; ownerOnly?: boolean; open?: boolean };

export const ROUTE_RULES: Rule[] = [
  { prefix: "/dashboard", open: true },
  { prefix: "/notifications", open: true },
  { prefix: "/learn", open: true },
  { prefix: "/super-admin", ownerOnly: true },
  // Retail POS
  { prefix: "/pos/command-center", any: ["pos.sales.view_all"] },
  { prefix: "/pos/retail-command-center", any: ["pos.sales.view_all"] },
  { prefix: "/pos-sales", any: ["pos.retail.access"] },
  { prefix: "/pos-workers", any: ["users.manage"] },
  { prefix: "/pos", any: ["pos.retail.access"] },
  { prefix: "/sifopos", any: ["pos.retail.access"] },
  { prefix: "/devices-terminals", any: ["settings.manage"] },
  { prefix: "/printing-settings", any: ["settings.manage"] },
  // Restaurant
  { prefix: "/restaurant/menu", any: ["products.manage"] },
  { prefix: "/restaurant/combos", any: ["products.manage"] },
  { prefix: "/restaurant/settings", any: ["settings.manage"] },
  { prefix: "/restaurant/loyalty", any: ["settings.manage", "pos.sales.view_all"] },
  { prefix: "/restaurant/cash", any: ["cash_shift.open"] },
  { prefix: "/restaurant/shifts", any: ["cash_shift.open"] },
  { prefix: "/restaurant/end-of-day", any: ["cash_shift.close"] },
  { prefix: "/restaurant/reports", any: ["reports.view"] },
  { prefix: "/restaurant/kitchen", any: ["kitchen.access"] },
  { prefix: "/restaurant", any: ["pos.restaurant.access"] },
  // Inventory
  { prefix: "/inventory", any: ["inventory.view"] },
  { prefix: "/stock", any: ["inventory.view"] },
  { prefix: "/warehouses", any: ["inventory.view"] },
  // Reports
  { prefix: "/reports/payroll", any: ["hr.manage"] },
  { prefix: "/reports/inventory-valuation", any: ["inventory.view", "financial_reports.view"] },
  { prefix: "/reports/sales-by-customer", any: ["reports.view", "financial_reports.view"] },
  { prefix: "/reports", any: ["financial_reports.view"] },
  // HR & payroll
  { prefix: "/payroll", any: ["hr.manage"] },
  { prefix: "/employees", any: ["hr.manage"] },
  { prefix: "/attendance", any: ["hr.manage"] },
  { prefix: "/leave", any: ["hr.manage"] },
  { prefix: "/time-entries", any: ["hr.manage"] },
  { prefix: "/timesheet", any: ["hr.manage"] },
  // Administration
  { prefix: "/roles", any: ["roles.manage", "users.manage"] },
  { prefix: "/admin", any: ["users.manage"] },
  { prefix: "/manager", any: ["pos.sales.view_all", "users.manage", "roles.manage"] },
  { prefix: "/setup", any: ["settings.manage"] },
  { prefix: "/modules", any: ["settings.manage"] },
  { prefix: "/industry", any: ["settings.manage"] },
  { prefix: "/subscription", any: ["settings.manage"] },
  { prefix: "/onboarding", any: ["settings.manage"] },
  { prefix: "/launch", any: ["settings.manage"] },
  { prefix: "/system-health", any: ["settings.manage"] },
  { prefix: "/audit-logs", any: ["settings.manage", "accounting.view"] },
  { prefix: "/approvals", any: ["accounting.view", "pos.sales.view_all"] },
];
// Everything else (sales, purchases, banking, journals, CRM, projects, school, NGO…) is accounting.
const DEFAULT_RULE: Rule = { prefix: "", any: ["accounting.view"] };

export function ruleFor(path: string): Rule {
  const p = path.replace(/\/+$/, "") || "/";
  return ROUTE_RULES.find((r) => p === r.prefix || p.startsWith(r.prefix + "/")) ?? DEFAULT_RULE;
}

export function canAccessPath(a: Access | null, path: string): boolean {
  if (!a) return false;
  if (a.is_owner || a.is_super_admin) return true;
  const r = ruleFor(path);
  if (r.open) return true;
  if (r.ownerOnly) return false;
  return hasAnyPerm(a, r.any ?? []);
}

/** Where a staff member lands after sign-in or when bounced from a forbidden page. */
export function landingFor(a: Access | null): string {
  if (!a || a.is_owner || a.is_super_admin) return "/dashboard";
  if (hasPerm(a, "pos.sales.view_all") || hasPerm(a, "users.manage")) return "/manager";
  if (hasPerm(a, "pos.retail.access")) return "/pos";
  if (hasPerm(a, "pos.restaurant.access")) return "/restaurant/pos";
  if (hasPerm(a, "accounting.view")) return "/dashboard";
  return "/dashboard";
}

/* ------------------------------------------------------------------ */
/* Staff navigation — built from permissions, never from the module map */
/* ------------------------------------------------------------------ */
export type StaffNavItem = { title: string; url: string; iconName: string; any: PermissionKey[] };
export type StaffNavGroup = { label: string; items: StaffNavItem[]; requires?: PermissionKey[] };

export const STAFF_NAV: StaffNavGroup[] = [
  { label: "Retail POS", requires: ["pos.retail.access"], items: [
    { title: "New Sale", url: "/pos", iconName: "ShoppingCart", any: ["pos.retail.access"] },
    { title: "My Sales & Receipts", url: "/pos-sales", iconName: "ReceiptText", any: ["pos.retail.access"] },
    { title: "Retail Command Center", url: "/pos/retail-command-center", iconName: "Gauge", any: ["pos.sales.view_all"] },
  ] },
  { label: "Restaurant", requires: ["pos.restaurant.access"], items: [
    { title: "Restaurant POS", url: "/restaurant/pos", iconName: "UtensilsCrossed", any: ["pos.restaurant.access"] },
    { title: "Tables", url: "/restaurant/tables", iconName: "LayoutGrid", any: ["pos.restaurant.access"] },
    { title: "Orders", url: "/restaurant/orders", iconName: "ClipboardList", any: ["pos.restaurant.access"] },
    { title: "Kitchen", url: "/restaurant/kitchen", iconName: "ChefHat", any: ["kitchen.access"] },
    { title: "Reservations", url: "/restaurant/reservations", iconName: "CalendarClock", any: ["pos.restaurant.access"] },
    { title: "My Shift / Cash", url: "/restaurant/cash", iconName: "Banknote", any: ["cash_shift.open"] },
    { title: "End of Day", url: "/restaurant/end-of-day", iconName: "Moon", any: ["cash_shift.close"] },
    { title: "Menu & Prices", url: "/restaurant/menu", iconName: "BookOpen", any: ["products.manage"] },
    { title: "Restaurant Reports", url: "/restaurant/reports", iconName: "BarChart3", any: ["reports.view"] },
  ] },
  { label: "Inventory", items: [
    { title: "Products & Stock", url: "/inventory", iconName: "Boxes", any: ["inventory.view"] },
    { title: "Control Center", url: "/inventory/control-center", iconName: "Gauge", any: ["inventory.view"] },
    { title: "Locations", url: "/inventory/locations", iconName: "Warehouse", any: ["inventory.view"] },
    { title: "Production Batches", url: "/inventory/production", iconName: "Factory", any: ["inventory.manage"] },
    { title: "Stock Transfers", url: "/inventory/transfers", iconName: "ArrowLeftRight", any: ["inventory.manage"] },
    { title: "Stock Card", url: "/inventory/stock-card", iconName: "ScrollText", any: ["inventory.view"] },
    { title: "Reconciliation", url: "/inventory/reconciliation", iconName: "Scale", any: ["inventory.view"] },
    { title: "Cashier Records", url: "/inventory/cashier-records", iconName: "NotebookPen", any: ["inventory.manage"] },
    { title: "Stock Adjustments", url: "/stock-adjustments", iconName: "SlidersHorizontal", any: ["inventory.manage"] },
    { title: "Stock Takes", url: "/stock-counts", iconName: "ClipboardCheck", any: ["inventory.manage"] },
  ] },
  { label: "Accounting", items: [
    { title: "Customers", url: "/customers", iconName: "Users", any: ["accounting.view"] },
    { title: "Sales Invoices", url: "/invoices", iconName: "FileText", any: ["accounting.view"] },
    { title: "Receive Payments", url: "/receipts", iconName: "CreditCard", any: ["accounting.view"] },
    { title: "Suppliers", url: "/suppliers", iconName: "Truck", any: ["accounting.view"] },
    { title: "Bills", url: "/bills", iconName: "FileBox", any: ["accounting.view"] },
    { title: "Expenses", url: "/expenses", iconName: "Receipt", any: ["accounting.view"] },
    { title: "Banking", url: "/banking", iconName: "Landmark", any: ["accounting.view"] },
    { title: "Reconciliation", url: "/reconciliation", iconName: "Scale", any: ["accounting.view"] },
    { title: "Journal Entries", url: "/journal-entries", iconName: "BookText", any: ["accounting.view"] },
    { title: "Chart of Accounts", url: "/chart-of-accounts", iconName: "ListTree", any: ["accounting.view"] },
  ] },
  { label: "Reports", items: [
    { title: "Reports Hub", url: "/reports", iconName: "BarChart3", any: ["financial_reports.view"] },
  ] },
  { label: "Management", items: [
    { title: "Manager Workspace", url: "/manager", iconName: "LayoutDashboard", any: ["pos.sales.view_all", "users.manage"] },
  ] },
  { label: "Administration", items: [
    { title: "Team & Roles", url: "/roles", iconName: "ShieldCheck", any: ["users.manage", "roles.manage"] },
    { title: "Settings", url: "/setup", iconName: "Settings", any: ["settings.manage"] },
  ] },
];

export function staffNav(a: Access | null): StaffNavGroup[] {
  if (!a) return [];
  return STAFF_NAV
    .filter((g) => !g.requires || hasAnyPerm(a, g.requires))
    .map((g) => ({ label: g.label, items: g.items.filter((i) => hasAnyPerm(a, i.any)) }))
    .filter((g) => g.items.length > 0);
}

/** Module-key → permissions, so the legacy module gate keeps working for staff. */
export const MODULE_PERMS: Record<string, PermissionKey[]> = {
  core_home: [],
  sales: ["accounting.view"], purchases: ["accounting.view"], finance: ["accounting.view"],
  fixed_assets: ["accounting.view"], budgets: ["accounting.view"], multi_currency: ["accounting.view"],
  inventory: ["inventory.view"], hr_payroll: ["hr.manage"], crm: ["accounting.view"], projects: ["accounting.view"],
  reports: ["financial_reports.view"], compliance: ["accounting.view"], loans: ["accounting.view"],
  donors: ["accounting.view"], school_erp: ["accounting.view"],
  retail_pos: ["pos.retail.access"], restaurant: ["pos.restaurant.access"],
  learning: [], admin: ["users.manage", "roles.manage", "settings.manage"], platform: ["settings.manage"],
};
