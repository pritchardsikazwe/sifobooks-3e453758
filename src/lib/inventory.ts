import { supabase } from "@/integrations/supabase/client";

export type StockStatus = "in_stock" | "low" | "critical" | "out" | "overstock" | "negative";

export type InvItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string | null;
  bin: string | null;
  warehouse_id: string | null;
  warehouse_name?: string;
  item_type: string | null;
  cost_price: number;
  sell_price: number;
  quantity_on_hand: number;
  reserved_qty: number;
  on_order_qty: number;
  reorder_level: number;
  safety_stock: number;
  max_stock: number;
  is_active: boolean;
  /** Derived */
  available: number;
  stock_value: number;
  status: StockStatus;
};

export const num = (v: any) => Number(v ?? 0);

/** Central stock rules — one place so every grid agrees. */
export function deriveStatus(r: {
  quantity_on_hand: number; reserved_qty: number; reorder_level: number;
  safety_stock: number; max_stock: number;
}): StockStatus {
  const onHand = num(r.quantity_on_hand);
  if (onHand < 0) return "negative";
  if (onHand === 0) return "out";
  const available = onHand - num(r.reserved_qty);
  const reorder = num(r.reorder_level);
  const safety = num(r.safety_stock);
  const max = num(r.max_stock);
  if (safety > 0 && available <= safety) return "critical";
  if (reorder > 0 && available <= reorder) return "low";
  if (max > 0 && onHand > max) return "overstock";
  return "in_stock";
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low: "Low stock",
  critical: "Critical",
  out: "Out of stock",
  overstock: "Overstock",
  negative: "Negative",
};

export function enrich(row: any, warehouses: { id: string; name: string }[]): InvItem {
  const onHand = num(row.quantity_on_hand);
  const reserved = num(row.reserved_qty);
  return {
    ...row,
    cost_price: num(row.cost_price),
    sell_price: num(row.sell_price),
    quantity_on_hand: onHand,
    reserved_qty: reserved,
    on_order_qty: num(row.on_order_qty),
    reorder_level: num(row.reorder_level),
    safety_stock: num(row.safety_stock),
    max_stock: num(row.max_stock),
    warehouse_name: warehouses.find((w) => w.id === row.warehouse_id)?.name ?? "—",
    available: onHand - reserved,
    stock_value: onHand * num(row.cost_price),
    status: deriveStatus({
      quantity_on_hand: onHand,
      reserved_qty: reserved,
      reorder_level: num(row.reorder_level),
      safety_stock: num(row.safety_stock),
      max_stock: num(row.max_stock),
    }),
  };
}

export type InvQuery = {
  search?: string;
  warehouse?: string;
  category?: string;
  limit?: number;
};

/** Server-side filtered fetch — never pulls the whole catalogue. */
export async function fetchInventory(q: InvQuery = {}) {
  const [{ data: whs }] = await Promise.all([
    supabase.from("warehouses").select("id, name").order("name"),
  ]);
  const warehouses = (whs ?? []) as { id: string; name: string }[];

  let query = supabase.from("stock_items").select("*").limit(q.limit ?? 500);
  if (q.search?.trim()) {
    const s = q.search.trim().replace(/[,%]/g, "");
    query = query.or(
      `name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%,category.ilike.%${s}%`,
    );
  }
  if (q.warehouse && q.warehouse !== "all") query = query.eq("warehouse_id", q.warehouse);
  if (q.category && q.category !== "all") query = query.eq("category", q.category);

  const { data, error } = await query.order("name");
  if (error) throw error;
  return { items: (data ?? []).map((r) => enrich(r, warehouses)), warehouses };
}

export async function fetchItemMovements(itemId: string, limit = 50) {
  const { data } = await supabase
    .from("stock_movements")
    .select("id, movement_type, quantity, unit_cost, reference, note, created_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function fetchRecentActivity(limit = 12) {
  const { data } = await supabase
    .from("stock_movements")
    .select("id, item_id, movement_type, quantity, unit_cost, reference, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export function summarise(items: InvItem[]) {
  const by = (s: StockStatus) => items.filter((i) => i.status === s);
  return {
    totalItems: items.length,
    stockValue: items.reduce((s, i) => s + i.stock_value, 0),
    available: items.reduce((s, i) => s + i.available, 0),
    reserved: items.reduce((s, i) => s + i.reserved_qty, 0),
    onOrder: items.reduce((s, i) => s + i.on_order_qty, 0),
    low: by("low").length,
    critical: by("critical").length,
    out: by("out").length,
    overstock: by("overstock").length,
    negative: by("negative").length,
  };
}

export function warehouseValues(items: InvItem[]) {
  const map = new Map<string, { id: string | null; name: string; value: number; units: number; low: number }>();
  for (const i of items) {
    const key = i.warehouse_id ?? "none";
    const cur = map.get(key) ?? { id: i.warehouse_id, name: i.warehouse_name ?? "Unassigned", value: 0, units: 0, low: 0 };
    cur.value += i.stock_value;
    cur.units += i.quantity_on_hand;
    if (i.status === "low" || i.status === "critical" || i.status === "out") cur.low += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}
