/**
 * Data layer for the SifoBooks POS worker environment.
 * All reads/writes are scoped to the tenant (books owner) and additionally
 * enforced by RLS + `pos_can()` in the database.
 */
import { supabase } from "@/integrations/supabase/client";
import { VAT_RATE } from "@/lib/restaurant";

export type MenuItem = {
  id: string; name: string; category: string | null; price: number; cost: number;
  station: string | null; is_86: boolean | null; tax_rate: number | null; stock_item_id: string | null;
};

export type CartLine = {
  key: string; menu_item_id: string; item_name: string; qty: number; price: number;
  unit_cost: number; station: string | null; notes: string; modifiers: string[];
};

export const money = (n: number) =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", minimumFractionDigits: 2 }).format(n || 0);

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
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0) - discount;
  const tax = +(subtotal * VAT_RATE).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax, total: +(subtotal + tax).toFixed(2) };
}

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
}) {
  const { subtotal, tax, total } = cartTotals(opts.lines, opts.discount ?? 0);
  const orderNo = `O${Date.now().toString().slice(-7)}`;
  const { data: order, error } = await supabase
    .from("restaurant_orders")
    .insert({
      user_id: opts.tenantId,
      order_no: orderNo,
      order_type: opts.orderType,
      status: "open",
      table_id: opts.tableId ?? null,
      guests: opts.guests ?? 1,
      server_name: opts.serverName ?? null,
      customer_name: opts.customerName ?? null,
      subtotal, tax, total,
      discount: opts.discount ?? 0,
      notes: opts.notes ?? null,
      business_date: new Date().toISOString().slice(0, 10),
    })
    .select("id,order_no")
    .single();
  if (error) throw error;

  const items = opts.lines.map((l) => ({
    user_id: opts.tenantId,
    order_id: order.id,
    menu_item_id: l.menu_item_id,
    item_name: l.item_name,
    qty: l.qty,
    price: l.price,
    unit_cost: l.unit_cost,
    station: l.station,
    notes: l.notes || null,
    modifiers: l.modifiers?.length ? l.modifiers : null,
    kds_status: "queued",
  }));
  const { error: e2 } = await supabase.from("restaurant_order_items").insert(items as any);
  if (e2) throw e2;

  if (opts.tableId) {
    await supabase.from("restaurant_tables")
      .update({ status: "occupied", current_order_id: order.id, occupied_since: new Date().toISOString(), server_name: opts.serverName ?? null })
      .eq("id", opts.tableId);
  }
  return order;
}

/** Settle an order — the database trigger posts the GL entry and stock cost. */
export async function payOrder(orderId: string, method: string, amountPaid: number) {
  const { error } = await supabase
    .from("restaurant_orders")
    .update({
      status: "paid",
      payment_method: method,
      amount_paid: amountPaid,
      closed_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
  await supabase.from("restaurant_tables").update({ status: "dirty", current_order_id: null }).eq("current_order_id", orderId);
}
