import { supabase } from "@/integrations/supabase/client";

export const VAT_RATE = 0.16;

export type OrderTypeKey =
  | "DINE IN" | "TAKEAWAY" | "DELIVERY" | "PICKUP"
  | "COUNTER" | "DRIVE-THRU" | "BAR" | "ROOM SERVICE";

export const ORDER_TYPES: { key: OrderTypeKey; label: string; requiresTable?: boolean; requiresCustomer?: boolean; requiresAddress?: boolean }[] = [
  { key: "DINE IN", label: "Dine-in", requiresTable: true },
  { key: "TAKEAWAY", label: "Takeaway", requiresCustomer: true },
  { key: "DELIVERY", label: "Delivery", requiresCustomer: true, requiresAddress: true },
  { key: "PICKUP", label: "Pickup", requiresCustomer: true },
  { key: "COUNTER", label: "Counter" },
  { key: "DRIVE-THRU", label: "Drive-thru" },
  { key: "BAR", label: "Bar" },
  { key: "ROOM SERVICE", label: "Room service" },
];

export const TABLE_STATUSES = [
  "available", "occupied", "reserved", "dirty", "cleaning", "payment pending", "out of service",
] as const;

export const RESERVATION_STATUSES = [
  "pending", "confirmed", "arrived", "seated", "completed", "cancelled", "no show",
] as const;

export const PAYMENT_METHODS = ["cash", "card", "momo", "bank", "gift card", "loyalty"] as const;

export const KDS_FLOW = ["queued", "cooking", "ready", "served"] as const;

export async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const statusTone = (s: string): "success" | "warning" | "danger" | "info" | "muted" => {
  const v = (s || "").toLowerCase();
  if (["paid", "available", "ready", "completed", "confirmed", "closed", "active"].includes(v)) return "success";
  if (["held", "reserved", "cooking", "preparing", "pending", "partial", "waiting", "dirty", "cleaning"].includes(v)) return "warning";
  if (["void", "cancelled", "no show", "out of service", "overdue"].includes(v)) return "danger";
  if (["open", "occupied", "queued", "new", "seated", "arrived"].includes(v)) return "info";
  return "muted";
};

export const toneClass: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  info: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  muted: "bg-muted text-muted-foreground border-border",
};

/** Price for a menu item under a given order type, falling back to the base price. */
export function priceFor(item: { price: number; prices?: Record<string, number> | null }, orderType: string) {
  const map = (item.prices ?? {}) as Record<string, number>;
  const v = map?.[orderType];
  return Number(v ?? item.price ?? 0);
}

/** Record tenders against an order so the accounting trigger can split them by method. */
export async function recordPayments(
  orderId: string,
  tenders: { method: string; amount: number; tendered?: number; change?: number; reference?: string }[],
) {
  const u = await uid();
  if (!u || !tenders.length) return;
  await supabase.from("restaurant_payments").insert(
    tenders.map((t) => ({
      user_id: u,
      order_id: orderId,
      method: t.method,
      amount: t.amount,
      tendered: t.tendered ?? t.amount,
      change_given: t.change ?? 0,
      reference: t.reference ?? null,
    })) as never,
  );
}

export type EodTotals = {
  orders: number; gross: number; discounts: number; tax: number;
  service: number; gratuity: number; delivery: number; net: number;
  byMethod: Record<string, number>; byType: Record<string, number>;
};

export function summarise(orders: any[]): EodTotals {
  const live = orders.filter((o) => o.status !== "void");
  const t: EodTotals = {
    orders: live.length, gross: 0, discounts: 0, tax: 0, service: 0,
    gratuity: 0, delivery: 0, net: 0, byMethod: {}, byType: {},
  };
  for (const o of live) {
    t.gross += Number(o.subtotal || 0);
    t.discounts += Number(o.discount || 0);
    t.tax += Number(o.tax || 0);
    t.service += Number(o.service_charge || 0);
    t.gratuity += Number(o.gratuity || 0);
    t.delivery += Number(o.delivery_fee || 0);
    t.net += Number(o.total || 0);
    const m = (o.payment_method || "unsettled").toLowerCase();
    t.byMethod[m] = (t.byMethod[m] ?? 0) + Number(o.total || 0);
    t.byType[o.order_type] = (t.byType[o.order_type] ?? 0) + Number(o.total || 0);
  }
  return t;
}
