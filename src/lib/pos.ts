/**
 * Retail POS (SifoPOS) data layer.
 *
 * Reuses the existing catalogue (`stock_items`), customers and accounting
 * engine — POS only adds sale/payment records and calls `complete_pos_sale`,
 * which posts the GL entry and stock movements in one transaction.
 */
import { supabase } from "@/integrations/supabase/client";
import { cacheRow, cacheRows, readCached, withStore } from "@/lib/offline-db";
import { listQueue, newClientId, queueRpc } from "@/lib/offline-queue";

async function clearStore(store: "pos_transactions") {
  await withStore(store, "readwrite", (os) => os.clear());
}

export type PriceLevel = "normal" | "retail" | "wholesale" | "vip" | "customer";

export const PRICE_LEVELS: { key: PriceLevel; label: string; factor: number }[] = [
  { key: "normal", label: "Normal", factor: 1 },
  { key: "retail", label: "Retail", factor: 1 },
  { key: "wholesale", label: "Wholesale", factor: 0.85 },
  { key: "vip", label: "VIP", factor: 0.9 },
  { key: "customer", label: "Customer", factor: 0.95 },
];

export const priceFactor = (level: PriceLevel) =>
  PRICE_LEVELS.find((l) => l.key === level)?.factor ?? 1;

export type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string | null;
  price: number;
  cost: number;
  stock: number;
  reorder_level: number;
  is_active: boolean;
};

export type PosCustomer = {
  id: string;
  name: string;
  phone: string | null;
  code: string | null;
  price_level?: PriceLevel;
};

export type PosSettings = {
  show_images: boolean;
  show_stock: boolean;
  show_sku: boolean;
  products_per_row: number;
  enable_fast_sellers: boolean;
  enable_quick_qty: boolean;
  enable_quick_discounts: boolean;
  allow_price_change: boolean;
  allow_negative_stock: boolean;
  default_customer: string;
  default_price_level: PriceLevel;
  default_payment: string;
  tax_rate: number;
  tax_inclusive: boolean;
  auto_new_sale: boolean;
  auto_print_receipt: boolean;
  silent_print: boolean;
  receipt_footer: string | null;
};

export const DEFAULT_SETTINGS: PosSettings = {
  show_images: true,
  show_stock: true,
  show_sku: true,
  products_per_row: 4,
  enable_fast_sellers: true,
  enable_quick_qty: true,
  enable_quick_discounts: true,
  allow_price_change: true,
  allow_negative_stock: false,
  default_customer: "Walk-in Customer",
  default_price_level: "normal",
  default_payment: "cash",
  tax_rate: 16,
  tax_inclusive: true,
  auto_new_sale: true,
  auto_print_receipt: false,
  silent_print: false,
  receipt_footer: null,
};

export type CartLine = {
  key: string;
  item_id: string | null;
  name: string;
  sku: string | null;
  qty: number;
  price: number;
  unit_cost: number;
  /** Percentage discount applied to the line. */
  discount_pct: number;
  note?: string;
};

export type PosTotals = {
  gross: number;
  lineDiscount: number;
  saleDiscount: number;
  subtotal: number;
  tax: number;
  total: number;
  cost: number;
  items: number;
};

const n = (v: any) => Number(v ?? 0);

/* --------------------------------- catalogue ------------------------------- */

export async function loadProducts(locationId?: string | null): Promise<PosProduct[]> {
  try {
    if (locationId) {
      const { data, error } = await supabase.rpc("pos_location_stock" as any, { _location: locationId });
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        sku: r.sku ?? null,
        barcode: r.barcode ?? null,
        category: r.category ?? null,
        unit: r.unit ?? null,
        price: n(r.sell_price),
        cost: n(r.cost_price),
        stock: n(r.quantity_on_hand),
        reorder_level: n(r.reorder_level),
        is_active: r.is_active !== false,
      })) as PosProduct[];
      void cacheRows("products", rows);
      return rows;
    }

    const { data, error } = await supabase
      .from("stock_items")
      .select("id,name,sku,barcode,category,unit,sell_price,cost_price,quantity_on_hand,reorder_level,is_active")
      .order("name")
      .limit(2000);
    if (error) throw error;
    const rows = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      sku: r.sku ?? null,
      barcode: r.barcode ?? null,
      category: r.category ?? null,
      unit: r.unit ?? null,
      price: n(r.sell_price),
      cost: n(r.cost_price),
      stock: n(r.quantity_on_hand),
      reorder_level: n(r.reorder_level),
      is_active: r.is_active !== false,
    })) as PosProduct[];
    void cacheRows("products", rows);
    return rows;
  } catch {
    return await readCached<PosProduct>("products");
  }
}

export async function loadCustomers(): Promise<PosCustomer[]> {
  try {
    const { data } = await supabase
      .from("customers")
      .select("id,name,phone,customer_code")
      .order("name")
      .limit(1000);
    const rows = (data ?? []).map((c: any) => ({
      id: c.id, name: c.name, phone: c.phone ?? null, code: c.customer_code ?? null,
    })) as PosCustomer[];
    void cacheRows("customers", rows);
    return rows;
  } catch {
    return await readCached<PosCustomer>("customers");
  }
}

export async function loadFavorites(): Promise<string[]> {
  const { data } = await supabase.from("pos_favorites").select("item_id").order("sort_order");
  return (data ?? []).map((r: any) => r.item_id as string);
}

export async function toggleFavorite(itemId: string, on: boolean) {
  if (on) {
    await supabase.from("pos_favorites").insert({ item_id: itemId } as any);
  } else {
    await supabase.from("pos_favorites").delete().eq("item_id", itemId);
  }
}

/* --------------------------------- settings -------------------------------- */

export async function loadSettings(): Promise<PosSettings> {
  const { data } = await supabase.from("pos_settings").select("*").maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(data as any) } as PosSettings;
}

export async function saveSettings(patch: Partial<PosSettings>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("pos_settings").upsert({ user_id: u.user.id, ...patch } as any, { onConflict: "user_id" });
}

/* ------------------------------ registers/shifts --------------------------- */

export type PosRegister = { id: string; name: string; branch: string | null; location_id: string | null };

export async function ensureRegister(): Promise<PosRegister | null> {
  const { data } = await supabase
    .from("pos_registers")
    .select("id,name,branch,location_id")
    .eq("is_active", true)
    .order("name")
    .limit(1);
  if (data && data.length) return data[0] as PosRegister;

  const { data: location } = await supabase
    .from("inventory_locations")
    .select("id,name,code")
    .eq("is_active", true)
    .or("code.eq.CHIBOMBO,name.eq.Chibombo Store")
    .limit(1)
    .maybeSingle();

  const { data: created } = await supabase
    .from("pos_registers")
    .insert({ name: "Register 01", branch: location?.name ?? "Main", location_id: location?.id ?? null } as any)
    .select("id,name,branch,location_id")
    .maybeSingle();
  return (created as PosRegister | null) ?? null;
}

export async function currentShift(registerId?: string | null) {
  let query = supabase
    .from("pos_shifts").select("*").eq("status", "open")
    .order("opened_at", { ascending: false }).limit(1);
  if (registerId) query = query.eq("register_id", registerId);
  const { data } = await query;
  return ((data ?? [])[0] as any) ?? null;
}

export async function openShift(registerId: string | null, cashier: string, float_: number) {
  if (!registerId) throw new Error("A POS register is required before opening a shift");
  const { data, error } = await supabase
    .from("pos_shifts")
    .insert({ register_id: registerId, cashier_name: cashier, opening_float: float_ } as any)
    .select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function shiftSummary(shiftId: string) {
  const { data: sales } = await supabase
    .from("pos_sales").select("id,total,status").eq("shift_id", shiftId);
  const completed = (sales ?? []).filter((s: any) => s.status === "completed");
  const voided = (sales ?? []).filter((s: any) => s.status === "voided");
  const refunds = (sales ?? []).filter((s: any) => s.status === "refunded");
  const ids = completed.map((s: any) => s.id);
  let byMethod: Record<string, number> = {};
  if (ids.length) {
    const { data: pays } = await supabase.from("pos_payments").select("method,amount").in("sale_id", ids);
    (pays ?? []).forEach((p: any) => {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + n(p.amount);
    });
  }
  return {
    transactions: completed.length,
    salesTotal: completed.reduce((a: number, s: any) => a + n(s.total), 0),
    voids: voided.length,
    refunds: refunds.length,
    byMethod,
  };
}

export async function closeShift(shiftId: string, actualCash: number, expectedCash: number) {
  const { error } = await supabase.from("pos_shifts").update({
    status: "closed", closed_at: new Date().toISOString(),
    actual_cash: actualCash, expected_cash: expectedCash, variance: actualCash - expectedCash,
  } as any).eq("id", shiftId);
  if (error) throw new Error(error.message);
}

/* --------------------------------- cart math ------------------------------- */

export function computeTotals(lines: CartLine[], saleDiscountPct: number, s: PosSettings): PosTotals {
  let gross = 0, lineDiscount = 0, cost = 0, items = 0;
  for (const l of lines) {
    const g = l.qty * l.price;
    gross += g;
    lineDiscount += (g * (l.discount_pct || 0)) / 100;
    cost += l.qty * l.unit_cost;
    items += l.qty;
  }
  const afterLine = gross - lineDiscount;
  const saleDiscount = (afterLine * (saleDiscountPct || 0)) / 100;
  const net = Math.max(afterLine - saleDiscount, 0);
  const rate = n(s.tax_rate) / 100;
  const tax = s.tax_inclusive ? net - net / (1 + rate) : net * rate;
  const subtotal = s.tax_inclusive ? net - tax : net;
  const total = s.tax_inclusive ? net : net + tax;
  return {
    gross,
    lineDiscount,
    saleDiscount,
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(total),
    cost: round2(cost),
    items,
  };
}

export const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export function saleNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `POS-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

/* ------------------------------- sale lifecycle ---------------------------- */

export type SalePayment = { method: string; amount: number; reference?: string };

export type SaleDraft = {
  lines: CartLine[];
  totals: PosTotals;
  customer: PosCustomer | null;
  customerName: string;
  priceLevel: PriceLevel;
  saleDiscountPct: number;
  note?: string;
  shiftId?: string | null;
  registerId?: string | null;
};

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export async function completeSale(draft: SaleDraft, payments: SalePayment[], changeDue: number) {
  if (!draft.registerId) throw new Error("Select or open a POS register before completing the sale");
  if (!draft.shiftId) throw new Error("Open a cashier shift before completing the sale");
  if (!draft.lines.length) throw new Error("Add at least one item to the sale");

  const sale_no = saleNumber();
  const client_ref = newClientId("possale");
  const paid = payments.reduce((a, p) => a + n(p.amount), 0);

  const salePayload: any = {
    sale_no, client_ref,
    shift_id: draft.shiftId,
    register_id: draft.registerId,
    customer_id: draft.customer?.id ?? null,
    customer_name: draft.customerName || "Walk-in Customer",
    price_level: draft.priceLevel, status: "completed",
    subtotal: draft.totals.subtotal,
    discount: round2(draft.totals.lineDiscount + draft.totals.saleDiscount),
    tax: draft.totals.tax, total: draft.totals.total,
    paid: round2(paid), change_due: round2(changeDue),
    cost_total: draft.totals.cost, note: draft.note ?? null,
    sold_at: new Date().toISOString(),
  };
  const itemRows = draft.lines.map((l) => ({
    item_id: l.item_id, name: l.name, sku: l.sku, qty: l.qty,
    price: l.price, unit_cost: l.unit_cost,
    discount: round2((l.qty * l.price * (l.discount_pct || 0)) / 100),
    tax_rate: 0,
    line_total: round2(l.qty * l.price * (1 - (l.discount_pct || 0) / 100)),
    note: l.note ?? null,
  }));
  const payRows = payments.map((p) => ({ method: p.method, amount: round2(p.amount), reference: p.reference ?? null }));
  const args = { _sale: salePayload, _items: itemRows, _payments: payRows };

  const stash = async () => {
    await queueRpc("sync_pos_sale", args, client_ref);
    await cacheRow("pos_transactions", {
      id: client_ref, sale_no, client_ref, customer_name: salePayload.customer_name,
      total: salePayload.total, status: "completed", sold_at: salePayload.sold_at, __offline: true,
    });
    void adjustCachedStock(draft.lines);
    return { ok: true as const, offline: true, sale_no, id: null };
  };

  if (!isOnline()) return stash();
  try {
    const { data, error } = await supabase.rpc("sync_pos_sale" as any, args as any);
    if (error) {
      if (isNetworkError(error.message)) return stash();
      throw error;
    }
    return { ok: true as const, offline: false, sale_no, id: data as unknown as string };
  } catch (e: any) {
    if (e?.message && !isNetworkError(e.message)) throw e;
    return stash();
  }
}

function isNetworkError(message: string) {
  return /fetch|network|timeout|NetworkError|ECONN|502|503|504/i.test(message);
}

async function adjustCachedStock(lines: CartLine[]) {
  try {
    const products = await readCached<PosProduct>("products");
    const by = new Map(products.map((p) => [p.id, p]));
    for (const l of lines) {
      const p = l.item_id ? by.get(l.item_id) : null;
      if (p) p.stock = round2(n(p.stock) - n(l.qty));
    }
    await cacheRows("products", products);
  } catch { /* cache only */ }
}

export async function listOfflineSales() {
  const rows = await readCached<any>("pos_transactions");
  return rows.filter((r) => r.__offline);
}

export async function pruneSyncedOfflineSales() {
  try {
    const q = await listQueue();
    const pendingRefs = new Set(q.map((i) => i.clientId));
    const rows = await readCached<any>("pos_transactions");
    const keep = rows.filter((r) => !r.__offline || pendingRefs.has(r.client_ref));
    if (keep.length !== rows.length) {
      await clearStore("pos_transactions");
      if (keep.length) await cacheRows("pos_transactions", keep);
    }
  } catch { /* cache only */ }
}

export async function holdSale(draft: SaleDraft) {
  const sale_no = saleNumber();
  const { data: sale, error } = await supabase.from("pos_sales").insert({
    sale_no, client_ref: newClientId("poshold"), status: "held",
    customer_id: draft.customer?.id ?? null, customer_name: draft.customerName,
    price_level: draft.priceLevel, subtotal: draft.totals.subtotal,
    discount: round2(draft.totals.lineDiscount + draft.totals.saleDiscount), tax: draft.totals.tax,
    total: draft.totals.total, shift_id: draft.shiftId ?? null, register_id: draft.registerId ?? null,
  } as any).select("id").maybeSingle();
  if (error || !sale) throw new Error(error?.message ?? "Could not hold this sale");
  if (draft.lines.length) {
    await supabase.from("pos_sale_items").insert(draft.lines.map((l) => ({
      sale_id: (sale as any).id, item_id: l.item_id, name: l.name, sku: l.sku,
      qty: l.qty, price: l.price, unit_cost: l.unit_cost, discount: l.discount_pct,
      line_total: round2(l.qty * l.price), note: l.note ?? null,
    })) as any);
  }
  return sale_no;
}

export async function listHeldSales() {
  const { data } = await supabase
    .from("pos_sales").select("id,sale_no,customer_name,total,sold_at")
    .eq("status", "held").order("sold_at", { ascending: false }).limit(50);
  return (data ?? []) as any[];
}

export async function recallSale(saleId: string): Promise<CartLine[]> {
  const { data } = await supabase.from("pos_sale_items").select("*").eq("sale_id", saleId);
  await supabase.from("pos_sales").delete().eq("id", saleId);
  return (data ?? []).map((r: any, i: number) => ({
    key: `${r.item_id ?? "x"}-${i}-${Date.now()}`,
    item_id: r.item_id, name: r.name, sku: r.sku,
    qty: n(r.qty), price: n(r.price), unit_cost: n(r.unit_cost),
    discount_pct: n(r.discount), note: r.note ?? undefined,
  }));
}

export async function listRecentSales(limit = 30) {
  await pruneSyncedOfflineSales();
  const offline = await listOfflineSales();
  let online: any[] = [];
  if (isOnline()) {
    try {
      const { data } = await supabase
        .from("pos_sales").select("id,sale_no,customer_name,total,status,sold_at")
        .in("status", ["completed", "refunded", "voided"])
        .order("sold_at", { ascending: false }).limit(limit);
      online = (data ?? []) as any[];
      void cacheRows("pos_transactions", online.map((r) => ({ ...r, __offline: false })));
    } catch { /* fall through to cache */ }
  }
  if (!online.length) online = (await readCached<any>("pos_transactions")).filter((r) => !r.__offline);
  return [...offline, ...online]
    .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime())
    .slice(0, limit);
}

export async function voidSale(saleId: string, reason: string) {
  const { error } = await supabase.from("pos_sales").update({ status: "voided", void_reason: reason } as any).eq("id", saleId);
  if (error) throw new Error(error.message);
}

export async function refundSale(saleId: string) {
  const { data: orig } = await supabase.from("pos_sales").select("*").eq("id", saleId).maybeSingle();
  if (!orig) throw new Error("Sale not found");
  if ((orig as any).status !== "completed") throw new Error("Only a completed sale can be refunded");
  const { data: items } = await supabase.from("pos_sale_items").select("*").eq("sale_id", saleId);

  const { data: credit, error: creditError } = await supabase.from("pos_sales").insert({
    sale_no: `RF-${(orig as any).sale_no ?? ""}`,
    client_ref: newClientId("posrefund"), status: "draft", refund_of: saleId,
    customer_id: (orig as any).customer_id, customer_name: (orig as any).customer_name,
    subtotal: -n((orig as any).subtotal), discount: -n((orig as any).discount),
    tax: -n((orig as any).tax), total: -n((orig as any).total),
    shift_id: (orig as any).shift_id ?? null, register_id: (orig as any).register_id ?? null,
  } as any).select("id").maybeSingle();
  if (creditError || !credit) throw new Error(creditError?.message ?? "Refund failed");

  if (items?.length) {
    await supabase.from("pos_sale_items").insert(items.map((r: any) => ({
      sale_id: (credit as any).id, item_id: r.item_id, name: r.name, sku: r.sku,
      qty: -n(r.qty), price: n(r.price), unit_cost: n(r.unit_cost), line_total: -n(r.line_total),
    })) as any);
  }
  await supabase.from("pos_payments").insert({
    sale_id: (credit as any).id, method: "cash", amount: -n((orig as any).total), reference: "Refund",
  } as any);
  const { error: postError } = await supabase.rpc("complete_pos_sale", { _sale_id: (credit as any).id } as any);
  if (postError) throw new Error(postError.message);
  await supabase.from("pos_sales").update({ status: "refunded" } as any).eq("id", saleId);
  return (credit as any).id as string;
}

export async function todayMetrics() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("pos_sales").select("total,status,sold_at")
    .eq("status", "completed").gte("sold_at", start.toISOString());
  const rows = data ?? [];
  const sales = rows.reduce((a: number, r: any) => a + n(r.total), 0);
  return { sales, transactions: rows.length, average: rows.length ? sales / rows.length : 0 };
}
