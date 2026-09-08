/**
 * SifoBooks POS worker permissions.
 *
 * The same matrix lives in the database (`public.pos_matrix` / `pos_can`) and
 * is enforced by RLS — this client copy only decides what to render.
 */
import { supabase } from "@/integrations/supabase/client";

export type PosRole = "cashier" | "waiter" | "supervisor" | "manager" | "kitchen";

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

/** Resolve the terminal context for the signed-in user. */
export async function loadPosContext(): Promise<PosContext | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data } = await supabase
    .from("employee_pos_permissions")
    .select("*")
    .eq("worker_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (data) {
    return {
      workerId: user.id,
      tenantId: data.user_id as string,
      role: (data.pos_role as PosRole) ?? "cashier",
      isOwner: false,
      displayName: (data.full_name as string) || user.email || "Worker",
      allow: ((data.allow as any) ?? []) as PosFeature[],
      deny: ((data.deny as any) ?? []) as PosFeature[],
      pinSet: Boolean((data as any).pin_hash),
      pinLocked: Boolean((data as any).pin_locked),
      permissionId: data.id as string,
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
  };
}

/** Nav for the POS worker environment — never the accounting sidebar. */
export const WORKER_NAV: { to: string; label: string; icon: string; feature?: PosFeature }[] = [
  { to: "/w/pos", label: "POS", icon: "ShoppingCart", feature: "pos_sales" },
  { to: "/w/tables", label: "Tables", icon: "LayoutGrid", feature: "tables" },
  { to: "/w/orders", label: "Orders", icon: "ReceiptText", feature: "pos_sales" },
  { to: "/w/kitchen", label: "Kitchen", icon: "ChefHat", feature: "kitchen_display" },
  { to: "/w/sales", label: "My sales", icon: "ReceiptText", feature: "pos_sales" },
  { to: "/w/shift", label: "My shift", icon: "Clock", feature: "pos_sales" },
  { to: "/w/cash", label: "Cash", icon: "Banknote", feature: "cash_drawer" },
  { to: "/w/stock", label: "Stock", icon: "Boxes", feature: "stock_view" },
  { to: "/w/reports", label: "Reports", icon: "BarChart3", feature: "reports" },
];
