/**
 * SifoBooks POS worker permissions.
 *
 * The same matrix lives in the database (`public.pos_matrix` / `pos_can`) and
 * is enforced by RLS — this client copy only decides what to render.
 */
import { supabase } from "@/integrations/supabase/client";
import { loadAccess } from "@/lib/rbac";

export type PosRole = "cashier" | "waiter" | "supervisor" | "manager" | "kitchen";
/** Which kind of till this worker is assigned to. Never inferred from a role. */
export type PosChannel = "retail" | "restaurant";

export const POS_ROLES: { key: PosRole; label: string }[] = [
  { key: "cashier", label: "Cashier" },
  { key: "waiter", label: "Waiter" },
  { key: "supervisor", label: "Supervisor" },
  { key: "manager", label: "Manager" },
  { key: "kitchen", label: "Kitchen" },
];

export type PosFeature =
  | "pos_sales" | "dine_in" | "takeaway" | "delivery" | "tables" | "kitchen_display"
  | "hold_order" | "void_item" | "discount" | "cash_drawer" | "cash_payout"
  | "stock_view" | "stock_transfer" | "reports" | "end_of_day" | "settings";

export type Level = "full" | "limited" | "none";

export const POS_FEATURES: { key: PosFeature; label: string }[] = [
  { key: "pos_sales", label: "POS sales" },
  { key: "dine_in", label: "Dine-in" },
  { key: "takeaway", label: "Takeaway" },
  { key: "delivery", label: "Delivery" },
  { key: "tables", label: "Tables" },
  { key: "kitchen_display", label: "Kitchen display" },
  { key: "hold_order", label: "Hold order" },
  { key: "void_item", label: "Void item" },
  { key: "discount", label: "Discount" },
  { key: "cash_drawer", label: "Cash drawer" },
  { key: "cash_payout", label: "Cash payout" },
  { key: "stock_view", label: "Stock viewing" },
  { key: "stock_transfer", label: "Stock transfer" },
  { key: "reports", label: "Reports" },
  { key: "end_of_day", label: "End of day" },
  { key: "settings", label: "Settings" },
];

const F: Level = "full", L: Level = "limited", N: Level = "none";

export const POS_MATRIX: Record<PosRole, Record<PosFeature, Level>> = {
  cashier:    { pos_sales: F, dine_in: N, takeaway: F, delivery: F, tables: N, kitchen_display: N, hold_order: F, void_item: L, discount: L, cash_drawer: F, cash_payout: N, stock_view: N, stock_transfer: N, reports: N, end_of_day: N, settings: N },
  waiter:     { pos_sales: F, dine_in: F, takeaway: F, delivery: N, tables: F, kitchen_display: F, hold_order: F, void_item: L, discount: N, cash_drawer: N, cash_payout: N, stock_view: L, stock_transfer: N, reports: N, end_of_day: N, settings: N },
  supervisor: { pos_sales: F, dine_in: F, takeaway: F, delivery: F, tables: F, kitchen_display: F, hold_order: F, void_item: F, discount: F, cash_drawer: F, cash_payout: F, stock_view: F, stock_transfer: F, reports: F, end_of_day: N, settings: L },
  manager:    { pos_sales: F, dine_in: F, takeaway: F, delivery: F, tables: F, kitchen_display: F, hold_order: F, void_item: F, discount: F, cash_drawer: F, cash_payout: F, stock_view: F, stock_transfer: F, reports: F, end_of_day: F, settings: F },
  kitchen:    { pos_sales: N, dine_in: N, takeaway: N, delivery: N, tables: N, kitchen_display: F, hold_order: N, void_item: N, discount: N, cash_drawer: N, cash_payout: N, stock_view: N, stock_transfer: N, reports: N, end_of_day: N, settings: N },
};

export type PosContext = {
  /** auth user of the person at the terminal */
  workerId: string;
  /** the account that owns the books (owner id, or the worker's employer) */
  tenantId: string;
  role: PosRole;
  /** true when the signed-in user owns the books (accountant/admin) */
  isOwner: boolean;
  displayName: string;
  allow: PosFeature[];
  deny: PosFeature[];
  /** true when this worker has a PIN configured (the PIN itself never leaves the server) */
  pinSet?: boolean;
  /** true while a PIN reset is in flight — the old PIN is void */
  pinLocked?: boolean;
  permissionId?: string | null;
};

export function levelOf(ctx: PosContext | null, feature: PosFeature): Level {
  if (!ctx) return "none";
  if (ctx.deny.includes(feature)) return "none";
  if (ctx.allow.includes(feature)) return "full";
  if (ctx.isOwner) return "full";
  return POS_MATRIX[ctx.role]?.[feature] ?? "none";
}

export const can = (ctx: PosContext | null, feature: PosFeature) => levelOf(ctx, feature) !== "none";
export const canFully = (ctx: PosContext | null, feature: PosFeature) => levelOf(ctx, feature) === "full";

/**
 * Resolve the terminal context for the signed-in user.
 *
 * A worker can legitimately exist in more than one company, so the till row is
 * chosen against the tenant the user is actually signed in to work for — never
 * with a bare `.maybeSingle()`, which would silently pick an arbitrary tenant.
 */
export async function loadPosContext(): Promise<PosContext | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [{ data: rows }, access] = await Promise.all([
    supabase
      .from("employee_pos_permissions")
      .select("id,user_id,worker_user_id,employee_id,company_id,full_name,pos_role,allow,deny,is_active,created_at,updated_at,email,pin_locked,pin_set_at,branch_id,location_id,register_id,drawer_name,failed_pin_attempts,pin_locked_until,last_pin_login_at,pin_disabled")
      .eq("worker_user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    loadAccess().catch(() => null),
  ]);

  const list = (rows ?? []) as any[];
  const tenant = access && !access.is_owner ? access.tenant_id : null;
  const data = (tenant ? list.find((r) => r.user_id === tenant) : null) ?? list[0] ?? null;

  if (data) {
    return {
      workerId: user.id,
      tenantId: data.user_id as string,
      role: (data.pos_role as PosRole) ?? "cashier",
      isOwner: false,
      displayName: (data.full_name as string) || user.email || "Worker",
      allow: ((data.allow as any) ?? []) as PosFeature[],
      deny: ((data.deny as any) ?? []) as PosFeature[],
      pinSet: Boolean((data as any).pin_set_at) && !(data as any).pin_disabled,
      pinLocked: Boolean((data as any).pin_locked),
      permissionId: data.id as string,
      channel: (access?.pos_channel as PosChannel | null) ?? null,
      branchId: (data.branch_id as string | null) ?? access?.branch_id ?? null,
      locationId: (data.location_id as string | null) ?? null,
      registerId: (data.register_id as string | null) ?? null,
      ambiguous: list.length > 1,
    };
  }

  // Owner / administrator working their own books.
  return {
    workerId: user.id,
    tenantId: user.id,
    role: "manager",
    isOwner: true,
    displayName: user.email ?? "Manager",
    allow: [],
    deny: [],
    channel: null,
    branchId: null,
    locationId: null,
    registerId: null,
  };
}

/**
 * Nav for the POS worker environment — never the accounting sidebar.
 * `channel` limits an entry to one kind of till: a retail cashier must not be
 * offered Tables/Orders/Kitchen just because they are a "cashier".
 */
export const WORKER_NAV: { to: string; label: string; icon: string; feature?: PosFeature; channel?: PosChannel }[] = [
  { to: "/w/pos", label: "POS", icon: "ShoppingCart", feature: "pos_sales" },
  { to: "/w/tables", label: "Tables", icon: "LayoutGrid", feature: "tables", channel: "restaurant" },
  { to: "/w/orders", label: "Orders", icon: "ReceiptText", feature: "pos_sales", channel: "restaurant" },
  { to: "/w/kitchen", label: "Kitchen", icon: "ChefHat", feature: "kitchen_display", channel: "restaurant" },
  { to: "/w/sales", label: "My sales", icon: "ReceiptText", feature: "pos_sales" },
  { to: "/w/shift", label: "My shift", icon: "Clock", feature: "pos_sales" },
  { to: "/w/cash", label: "Cash", icon: "Banknote", feature: "cash_drawer" },
  { to: "/w/returns", label: "Returns", icon: "Undo2", feature: "pos_sales", channel: "retail" },
  { to: "/w/lookup", label: "Lookup", icon: "Search", feature: "pos_sales" },
  { to: "/w/count", label: "Count", icon: "ClipboardList", feature: "pos_sales" },
  { to: "/w/stock", label: "Stock", icon: "Boxes", feature: "stock_view" },
  { to: "/w/reports", label: "Reports", icon: "BarChart3", feature: "reports" },
];

/** Nav entries this terminal may show, given its channel. */
export function workerNavFor(ctx: PosContext | null) {
  return WORKER_NAV.filter((n) => {
    if (n.feature && !can(ctx, n.feature)) return false;
    if (!n.channel) return true;
    if (!ctx || ctx.isOwner) return true;
    // No channel recorded → fall back to the till role, never to Restaurant.
    const channel = ctx.channel ?? (["waiter", "kitchen"].includes(ctx.role) ? "restaurant" : "retail");
    return channel === n.channel;
  });
}
