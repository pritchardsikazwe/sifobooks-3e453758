/**
 * SifoBooks authenticated context resolution.
 *
 * ONE place decides where a signed-in person lands and which workspaces they
 * may open. The decision is always:
 *
 *   User + Company + Role/permissions + Product entitlement + Operational context
 *
 * A role NEVER selects the product. A cashier at a retail company opens the
 * Retail POS; the Restaurant shell only appears when the company is actually
 * entitled to Restaurant and the user is authorised for it. When more than one
 * valid answer exists we show a chooser — we never guess.
 *
 * Nothing here creates, seeds or mutates data. Every read goes through the
 * existing tables and RLS (companies, company_members, company_modules,
 * profiles, staff_members/my_access, employee_pos_permissions, branches,
 * inventory_locations, pos_registers, pos_shifts).
 */
import { supabase } from "@/integrations/supabase/client";
import { loadAccess, hasAnyPerm, type Access, type PermissionKey } from "@/lib/rbac";
import { MODULES, isModuleInstalled } from "@/lib/modules";

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export type ProductKey =
  | "accounting" | "retail_pos" | "restaurant" | "hotel" | "school" | "payroll" | "inventory";

export type ProductDef = {
  key: ProductKey;
  label: string;
  description: string;
  emoji: string;
  /** Module key in `company_modules` / the module registry that entitles it. */
  module: string;
  /** Any one of these permissions authorises a staff member for the product. */
  perms: PermissionKey[];
  landing: string;
};

export const PRODUCTS: ProductDef[] = [
  { key: "retail_pos", label: "Retail POS", description: "Shop till, cash-ups and stock at the point of sale.", emoji: "🛒", module: "retail_pos", perms: ["pos.retail.access"], landing: "/pos" },
  { key: "restaurant", label: "Restaurant", description: "Tables, kitchen, checks and restaurant cash-ups.", emoji: "🍽️", module: "restaurant", perms: ["pos.restaurant.access"], landing: "/restaurant" },
  { key: "hotel", label: "Hotel", description: "Front desk, reservations, housekeeping and folios.", emoji: "🏨", module: "hotel_erp", perms: ["accounting.view", "pos.retail.access", "pos.restaurant.access"], landing: "/hotel" },
  { key: "school", label: "School", description: "Learners, classes, fees and school reporting.", emoji: "🎓", module: "school_erp", perms: ["accounting.view"], landing: "/school" },
  { key: "payroll", label: "Payroll", description: "Employees, payroll runs, payslips and statutory returns.", emoji: "🧾", module: "hr_payroll", perms: ["hr.manage"], landing: "/payroll-dashboard" },
  { key: "inventory", label: "Inventory", description: "Stock, locations, transfers and counts.", emoji: "📦", module: "inventory", perms: ["inventory.view"], landing: "/inventory" },
  { key: "accounting", label: "Accounting", description: "Ledgers, sales, purchases, banking and reporting.", emoji: "📊", module: "finance", perms: ["accounting.view", "financial_reports.view"], landing: "/dashboard" },
];

export function productDef(key: ProductKey): ProductDef {
  return PRODUCTS.find((p) => p.key === key)!;
}

/* ------------------------------------------------------------------ */
/* Company entitlement (pure)                                          */
/* ------------------------------------------------------------------ */

export type Entitlement = {
  workspaceMode: string | null;
  /** Effective installed module keys for the company. */
  modules: Set<string>;
  industry: string | null;
};

/** Effective installed modules from explicit `company_modules` rows. */
export function effectiveModules(rows: { module_key: string }[]): Set<string> {
  const explicit = new Set<string>();
  const suppressed = new Set<string>();
  for (const r of rows) {
    const k = r.module_key ?? "";
    if (k.startsWith("__off__:")) suppressed.add(k.slice("__off__:".length));
    else explicit.add(k);
  }
  const out = new Set<string>();
  for (const m of MODULES) {
    if (m.core) { out.add(m.key); continue; }
    if (suppressed.has(m.key)) continue;
    if (isModuleInstalled(m.key, explicit)) out.add(m.key);
  }
  // Modules that are not in the static registry (e.g. "restaurant") are still
  // honoured when a company explicitly switched them on.
  for (const k of explicit) if (!suppressed.has(k)) out.add(k);
  return out;
}

const RESTAURANT_INDUSTRIES = /restaurant|food|catering|cafe|bar|hospitality_food/i;
const HOTEL_INDUSTRIES = /hotel|lodge|guest ?house|hospitality/i;
const SCHOOL_INDUSTRIES = /school|education/i;

/**
 * Which products the COMPANY is entitled to. Restaurant is never inferred from
 * a role and never enabled by default — it needs an explicit module, an
 * explicit restaurant workspace mode, or a restaurant industry.
 */
export function entitledProducts(e: Entitlement): ProductKey[] {
  const mode = e.workspaceMode ?? "accounting";
  if (mode === "payroll_only") return ["payroll"];
  if (mode === "hotel_only") return ["hotel"];

  const m = e.modules;
  const industry = e.industry ?? "";
  const out: ProductKey[] = [];

  if (m.has("retail_pos") || mode === "general_pos" || mode === "pos_accounting") out.push("retail_pos");
  if (m.has("restaurant") || mode === "restaurant" || RESTAURANT_INDUSTRIES.test(industry)) out.push("restaurant");
  if (m.has("hotel_erp") || HOTEL_INDUSTRIES.test(industry)) out.push("hotel");
  if (m.has("school_erp") || SCHOOL_INDUSTRIES.test(industry)) out.push("school");
  if (m.has("hr_payroll")) out.push("payroll");
  if (m.has("inventory")) out.push("inventory");
  if (m.has("finance") || m.has("sales") || mode === "accounting" || mode === "pos_accounting") out.push("accounting");

  return Array.from(new Set(out));
}

/** Narrow company entitlement down to what THIS user may actually open. */
export function authorizedProducts(entitled: ProductKey[], access: Access | null): ProductKey[] {
  if (!access) return [];
  const isOwner = access.is_owner || access.is_super_admin;
  let list = entitled.filter((k) => isOwner || hasAnyPerm(access, productDef(k).perms));
  // A staff member assigned to one POS channel never sees the other channel.
  if (!isOwner && access.pos_channel === "retail") list = list.filter((k) => k !== "restaurant");
  if (!isOwner && access.pos_channel === "restaurant") list = list.filter((k) => k !== "retail_pos");
  return list;
}

/** Landing route inside a product for this role. */
export function productLanding(product: ProductKey, access: Access | null): string {
  const isOwner = !access || access.is_owner || access.is_super_admin;
  const perms = access?.permissions ?? [];
  const can = (p: PermissionKey) => isOwner || perms.includes(p);
  switch (product) {
    case "retail_pos":
      if (!isOwner && can("pos.sales.view_all")) return "/pos/retail-command-center";
      return "/pos";
    case "restaurant":
      if (!isOwner && can("kitchen.access") && !can("pos.restaurant.access")) return "/restaurant/kitchen";
      return isOwner ? "/restaurant" : "/restaurant/pos";
    case "hotel":
      return "/hotel";
    case "school":
      return "/school";
    case "payroll":
      return "/payroll-dashboard";
    case "inventory":
      return "/inventory";
    default:
      return "/dashboard";
  }
}

export type Resolution = {
  product: ProductKey | null;
  route: string;
  /** true when the user must choose (company or product) before entering. */
  chooser: boolean;
  reason: "preferred" | "single" | "ambiguous" | "none";
};

/**
 * Priority: validated preference → single entitlement → chooser.
 * We never fall through to Restaurant.
 */
export function resolveWorkspace(opts: {
  products: ProductKey[];
  preferred?: ProductKey | null;
  access: Access | null;
  multipleCompanies?: boolean;
  companySelected?: boolean;
}): Resolution {
  const { products, preferred, access } = opts;
  if (opts.multipleCompanies && !opts.companySelected) {
    return { product: null, route: "/workspace", chooser: true, reason: "ambiguous" };
  }
  if (preferred && products.includes(preferred)) {
    return { product: preferred, route: productLanding(preferred, access), chooser: false, reason: "preferred" };
  }
  if (products.length === 1) {
    return { product: products[0], route: productLanding(products[0], access), chooser: false, reason: "single" };
  }
  if (products.length > 1) {
    return { product: null, route: "/workspace", chooser: true, reason: "ambiguous" };
  }
  return { product: null, route: "/dashboard", chooser: false, reason: "none" };
}

/* ------------------------------------------------------------------ */
/* Operational context                                                 */
/* ------------------------------------------------------------------ */

export type OperationalContext = {
  branchId: string | null;
  branchName: string | null;
  locationId: string | null;
  locationName: string | null;
  registerId: string | null;
  registerName: string | null;
  posRole: string | null;
  openShiftId: string | null;
};

export type CompanyRef = {
  id: string;
  name: string;
  tradingName: string | null;
  /** Auth user that owns this company's books (tenant id used by RLS). */
  ownerUserId: string;
  membership: "owner" | "member" | "staff";
  workspaceMode: string | null;
  industry: string | null;
};

export type AuthContext = {
  userId: string;
  email: string | null;
  access: Access | null;
  companies: CompanyRef[];
  company: CompanyRef | null;
  entitled: ProductKey[];
  products: ProductKey[];
  operational: OperationalContext;
  resolution: Resolution;
};

const PREF_KEY = "sifobooks.workspace.product";

export function readPreferredProduct(companyId: string | null): ProductKey | null {
  if (typeof localStorage === "undefined" || !companyId) return null;
  try {
    const map = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as Record<string, ProductKey>;
    return map[companyId] ?? null;
  } catch { return null; }
}

export function writePreferredProduct(companyId: string | null, product: ProductKey | null) {
  if (typeof localStorage === "undefined" || !companyId) return;
  try {
    const map = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as Record<string, ProductKey>;
    if (product) map[companyId] = product; else delete map[companyId];
    localStorage.setItem(PREF_KEY, JSON.stringify(map));
  } catch { /* preference only — never a security control */ }
}

export function clearWorkspacePreferences() {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(PREF_KEY); } catch { /* ignore */ }
}

/** Companies this user genuinely belongs to (owner, member, or staff employer). */
export async function loadMemberships(userId: string, access: Access | null): Promise<CompanyRef[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("companies").select("id,name,trading_name,user_id,workspace_mode,industry").eq("user_id", userId).order("created_at"),
    supabase.from("company_members").select("company_id").eq("user_id", userId),
  ]);

  const byId = new Map<string, CompanyRef>();
  const push = (row: any, membership: CompanyRef["membership"]) => {
    if (!row?.id || byId.has(row.id)) return;
    byId.set(row.id, {
      id: row.id,
      name: row.name ?? "Company",
      tradingName: row.trading_name ?? null,
      ownerUserId: row.user_id,
      membership,
      workspaceMode: row.workspace_mode ?? null,
      industry: row.industry ?? null,
    });
  };

  (owned ?? []).forEach((c) => push(c, "owner"));

  const memberIds = (memberships ?? []).map((m: any) => m.company_id).filter(Boolean);
  if (memberIds.length) {
    const { data } = await supabase
      .from("companies").select("id,name,trading_name,user_id,workspace_mode,industry").in("id", memberIds);
    (data ?? []).forEach((c) => push(c, "member"));
  }

  // Staff: their employer's company. RLS (`is_staff_of`) allows exactly this read.
  if (access && !access.is_owner && access.tenant_id && access.tenant_id !== userId) {
    const { data } = await supabase
      .from("companies").select("id,name,trading_name,user_id,workspace_mode,industry")
      .eq("user_id", access.tenant_id).order("created_at");
    (data ?? []).forEach((c) => push(c, "staff"));
  }

  return Array.from(byId.values());
}

async function loadEntitlement(company: CompanyRef): Promise<Entitlement> {
  const { data } = await supabase.from("company_modules").select("module_key").eq("company_id", company.id);
  return {
    workspaceMode: company.workspaceMode,
    modules: effectiveModules((data ?? []) as { module_key: string }[]),
    industry: company.industry,
  };
}

/** Branch / store / register / shift for this user at this company. */
export async function loadOperationalContext(userId: string, company: CompanyRef | null, access: Access | null): Promise<OperationalContext> {
  const empty: OperationalContext = {
    branchId: access?.branch_id ?? null, branchName: access?.branch_name ?? null,
    locationId: null, locationName: null, registerId: null, registerName: null,
    posRole: null, openShiftId: null,
  };
  if (!company) return empty;

  // Scope the POS assignment to THIS company's tenant so a worker who exists in
  // two companies can never pick up the wrong tenant's till.
  const { data: rows } = await supabase
    .from("employee_pos_permissions")
    .select("id,user_id,pos_role,branch_id,location_id,register_id,is_active,created_at")
    .eq("worker_user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const list = (rows ?? []) as any[];
  const perm = list.find((r) => r.user_id === company.ownerUserId) ?? null;
  if (!perm) return empty;

  const ctx: OperationalContext = { ...empty, posRole: perm.pos_role ?? null };
  ctx.branchId = perm.branch_id ?? ctx.branchId;
  ctx.locationId = perm.location_id ?? null;
  ctx.registerId = perm.register_id ?? null;

  const [branch, location, register, shift] = await Promise.all([
    ctx.branchId ? supabase.from("branches").select("name").eq("id", ctx.branchId).maybeSingle() : Promise.resolve({ data: null }),
    ctx.locationId ? supabase.from("inventory_locations").select("name").eq("id", ctx.locationId).maybeSingle() : Promise.resolve({ data: null }),
    ctx.registerId ? supabase.from("pos_registers").select("name").eq("id", ctx.registerId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("pos_shifts").select("id").eq("status", "open").eq("cashier_user_id", userId).order("opened_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  ctx.branchName = (branch.data as any)?.name ?? ctx.branchName;
  ctx.locationName = (location.data as any)?.name ?? null;
  ctx.registerName = (register.data as any)?.name ?? null;
  ctx.openShiftId = (shift as any)?.data?.id ?? null;
  return ctx;
}

/**
 * The single entry point used by /launch, the company switcher and the
 * workspace chooser. Returns the full validated context — never a guess.
 */
export async function resolveAuthenticatedContext(opts?: { preferProduct?: ProductKey | null; companyId?: string | null }): Promise<AuthContext | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;

  const access = await loadAccess(true);
  const companies = await loadMemberships(user.id, access);

  // Validate the stored active company against real membership.
  let companyId = opts?.companyId ?? null;
  if (!companyId) {
    const { data: p } = await supabase.from("profiles").select("active_company_id").eq("id", user.id).maybeSingle();
    companyId = (p?.active_company_id as string | null) ?? null;
  }
  let company = companies.find((c) => c.id === companyId) ?? null;
  if (!company && companies.length === 1) company = companies[0];
  // Staff always follow their employer's tenant, whatever a stale profile says.
  if (access && !access.is_owner && access.tenant_id) {
    const staffCompany = companies.find((c) => c.ownerUserId === access.tenant_id);
    if (staffCompany) company = staffCompany;
  }

  const entitlement = company
    ? await loadEntitlement(company)
    : { workspaceMode: null, modules: new Set<string>(), industry: null };
  const entitled = company ? entitledProducts(entitlement) : [];
  const products = authorizedProducts(entitled, access);

  const preferred = opts?.preferProduct ?? readPreferredProduct(company?.id ?? null);
  const resolution = resolveWorkspace({
    products,
    preferred,
    access,
    multipleCompanies: companies.length > 1,
    companySelected: Boolean(company) && (Boolean(companyId) || companies.length === 1 || company?.membership === "staff"),
  });

  const operational = await loadOperationalContext(user.id, company, access);

  return {
    userId: user.id,
    email: user.email ?? null,
    access,
    companies,
    company,
    entitled,
    products,
    operational,
    resolution,
  };
}

/** Switch the active company after re-checking membership; returns the new context. */
export async function selectCompany(companyId: string): Promise<AuthContext | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const access = await loadAccess(true);
  const companies = await loadMemberships(u.user.id, access);
  if (!companies.some((c) => c.id === companyId)) throw new Error("You do not have access to that company");
  const { error } = await supabase.from("profiles").update({ active_company_id: companyId }).eq("id", u.user.id);
  if (error) throw new Error(error.message);
  writePreferredProduct(companyId, null); // never carry a product across companies
  return resolveAuthenticatedContext({ companyId });
}
