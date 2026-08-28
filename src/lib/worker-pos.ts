/**
 * Data layer for the SifoBooks POS worker environment.
 * All reads/writes are scoped to the tenant (books owner) and additionally
 * enforced by RLS + `pos_can()` in the database.
 *
 * Every write goes through `normalizeOrderItem()` so the database never
 * receives a null in a NOT NULL column (modifiers, station, qty, price…).
 */
import { supabase } from "@/integrations/supabase/client";
import { VAT_RATE } from "@/lib/restaurant";

export type MenuItem = {
  id: string; name: string; category: string | null; price: number; cost: number;
  station: string | null; is_86: boolean | null; tax_rate: number | null; stock_item_id: string | null;
};

export type CartModifier = { id?: string; name: string; price: number };

export type CartLine = {
  key: string; menu_item_id: string; item_name: string; qty: number; price: number;
  unit_cost: number; station: string | null; notes: string; modifiers: (string | CartModifier)[];
};

export const money = (n: number) =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", minimumFractionDigits: 2 }).format(n || 0);

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Normalised row that is always safe to insert into `restaurant_order_items`. */
export type NormalizedOrderItem = {
  menu_item_id: string | null;
  item_name: string;
  qty: number;
  price: number;
  unit_cost: number;
  discount: number;
  station: string;
  notes: string;
  modifiers: CartModifier[];
  line_total: number;
  tax: number;
};

/**
 * Single source of truth for order-item shape.
 * Guarantees: modifiers is always an array (never null), qty >= 1,
 * numeric price/cost/discount/tax, non-empty item name and station.
 */
export function normalizeOrderItem(item: Partial<CartLine> & Record<string, any>): NormalizedOrderItem {
  const rawMods = Array.isArray(item.modifiers) ? item.modifiers : [];
  const modifiers: CartModifier[] = rawMods
    .filter((m) => m != null)
    .map((m) =>
      typeof m === "string"
        ? { name: m, price: 0 }
        : { id: m.id, name: String(m.name ?? ""), price: num(m.price) },
    )
    .filter((m) => m.name.length > 0);

  const qty = Math.max(1, num(item.qty, 1));
  const price = num(item.price);
  const modTotal = modifiers.reduce((s, m) => s + num(m.price), 0);
  const discount = num(item.discount);
  const lineTotal = +((price + modTotal) * qty - discount).toFixed(2);

  return {
    menu_item_id: item.menu_item_id ?? null,
    item_name: String(item.item_name ?? item.name ?? "Item").trim() || "Item",
    qty,
    price: +(price + modTotal).toFixed(2),
    unit_cost: num(item.unit_cost),
    discount,
    station: (item.station && String(item.station).trim()) || "Kitchen",
    notes: typeof item.notes === "string" ? item.notes : (item.note ?? ""),
    modifiers,
    line_total: lineTotal,
    tax: num(item.tax),
  };
}

export async function fetchMenu(tenantId: string): Promise<MenuItem[]> {
  const { data } = await supabase
    .from("restaurant_menu_items")
    .select("id,name,category,price,cost,station,is_86,tax_rate,stock_item_id")
    .eq("user_id", tenantId)
    .eq("active", true)
    .order("category")
    .order("name");
  return (data ?? []) as MenuItem[];
}

export async function fetchTables(tenantId: string) {
  const { data } = await supabase
    .from("restaurant_tables")
    .select("id,name,seats,area,status,server_name,current_order_id,occupied_since")
    .eq("user_id", tenantId)
    .order("name");
  return data ?? [];
}

export function cartTotals(lines: CartLine[], discount = 0) {
  const gross = lines.reduce((s, l) => {
    const n = normalizeOrderItem(l);
    return s + n.line_total;
  }, 0);
  const subtotal = Math.max(0, gross - (Number(discount) || 0));
  const tax = +(subtotal * VAT_RATE).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax, total: +(subtotal + tax).toFixed(2) };
}

/** Turn a raw Postgres/network failure into something a cashier can act on. */
export function posErrorMessage(e: any): string {
  const raw = String(e?.message ?? e ?? "");
  if (!navigator.onLine) return "You are offline — the order was not sent. It will retry when the connection returns.";
  if (/not-null|violates|constraint|column/i.test(raw)) return "Unable to send order. Your order was not submitted. Please retry.";
  if (/permission|policy|denied/i.test(raw)) return "Your role is not allowed to do that.";
  if (/fetch|network|timeout/i.test(raw)) return "Network problem — the order was not submitted. Please retry.";
  return raw || "Something went wrong. Please retry.";
}

export type OrderStatus =
  | "draft" | "sent_to_kitchen" | "in_preparation" | "ready" | "served" | "payment" | "paid" | "void" | "refunded";

export async function createOrder(opts: {
  tenantId: string;
  orderType: string;
  lines: CartLine[];
  tableId?: string | null;
  guests?: number;
  serverName?: string;
  customerName?: string;
  discount?: number;
  notes?: string;
  /** Skip the kitchen (fast-food/counter): order goes straight to payment. */
  skipKitchen?: boolean;
}) {
  const normalized = opts.lines.map(normalizeOrderItem);
  if (!normalized.length) throw new Error("Add at least one item to the check.");

  const { subtotal, tax, total } = cartTotals(opts.lines, opts.discount ?? 0);
  const orderNo = `O${Date.now().toString().slice(-7)}`;
  const { data: order, error } = await supabase
    .from("restaurant_orders")
    .insert({
      user_id: opts.tenantId,
      order_no: orderNo,
      order_type: opts.orderType || "counter",
      status: opts.skipKitchen ? "open" : "open",
      kds_stage: opts.skipKitchen ? null : undefined,
      table_id: opts.tableId ?? null,
      guests: Math.max(1, Number(opts.guests) || 1),
      server_name: opts.serverName ?? null,
      customer_name: opts.customerName ?? null,
      subtotal, tax, total,
      discount: Number(opts.discount) || 0,
      notes: opts.notes || null,
      business_date: new Date().toISOString().slice(0, 10),
    } as any)
    .select("id,order_no,total")
    .single();
  if (error) throw error;

  const items = normalized.map((n) => ({
    user_id: opts.tenantId,
    order_id: order.id,
    menu_item_id: n.menu_item_id,
    item_name: n.item_name,
    qty: n.qty,
    price: n.price,
    unit_cost: n.unit_cost,
    discount: n.discount,
    station: n.station,
    notes: n.notes || null,
    // NEVER null — the column is jsonb NOT NULL.
    modifiers: n.modifiers,
    kds_status: opts.skipKitchen ? "served" : "queued",
  }));
  const { error: e2 } = await supabase.from("restaurant_order_items").insert(items as any);
  if (e2) {
    // Roll the header back so a failed check can be retried without duplicates.
    await supabase.from("restaurant_orders").delete().eq("id", order.id);
    throw e2;
  }

  if (opts.tableId) {
    await supabase.from("restaurant_tables")
      .update({
        status: "occupied",
        current_order_id: order.id,
        occupied_since: new Date().toISOString(),
        server_name: opts.serverName ?? null,
      })
      .eq("id", opts.tableId);
  }
  return order;
}

export type PaymentDetails = {
  method: "cash" | "card" | "momo";
  amount: number;
  tendered?: number;
  reference?: string | null;
  provider?: string | null;
  phone?: string | null;
};

/**
 * Settle an order. The database trigger `post_restaurant_order` posts the GL
 * entry (DR cash/card/momo clearing, CR sales, CR VAT) and the stock cost —
 * the POS never duplicates accounting logic.
 */
export async function payOrder(orderId: string, details: PaymentDetails) {
  const amount = +Number(details.amount || 0).toFixed(2);
  const tendered = +Number(details.tendered ?? amount).toFixed(2);
  const change = +Math.max(0, tendered - amount).toFixed(2);

  const { error } = await supabase
    .from("restaurant_orders")
    .update({
      status: "paid",
      payment_method: details.method,
      amount_paid: tendered,
      change_due: change,
      closed_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;

  const reference = [details.provider, details.phone, details.reference].filter(Boolean).join(" • ") || null;
  const { error: pe } = await supabase.from("restaurant_payments").insert({
    order_id: orderId,
    method: details.method,
    amount,
    tendered,
    change_given: change,
    reference,
  } as any);
  if (pe) console.error("Payment record failed", pe);

  await supabase.from("restaurant_tables")
    .update({ status: "dirty", current_order_id: null })
    .eq("current_order_id", orderId);

  return { amount, tendered, change };
}
