/**
 * Cashier workspace data layer.
 *
 * Nothing here is a new POS, inventory or accounting engine — every read goes
 * against the existing `pos_sales` / `pos_shifts` / `stock_balances` tables and
 * every write goes through the existing RPCs. RLS still decides what a cashier
 * may see.
 */
import { supabase } from "@/integrations/supabase/client";
import { loadAccess } from "@/lib/rbac";

const n = (v: unknown) => Number(v ?? 0) || 0;

export const kw = (v: number) =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", minimumFractionDigits: 2 }).format(v || 0);

export type CashierAssignment = {
  permissionId: string | null;
  tenantId: string;
  cashierUserId: string;
  displayName: string;
  posRole: string;
  branchId: string | null;
  branchName: string | null;
  locationId: string | null;
  locationName: string | null;
  registerId: string | null;
  stationName: string | null;
  drawerName: string | null;
  isOwner: boolean;
};

/** Resolve who the cashier is and which branch / store / station / drawer they work. */
export async function loadAssignment(): Promise<CashierAssignment | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  // A worker may hold till rows in several companies; pick the one for the
  // tenant they are signed in to work for instead of an arbitrary single row.
  const [{ data: perms }, access] = await Promise.all([
    supabase
      .from("employee_pos_permissions")
      .select("id,user_id,worker_user_id,employee_id,company_id,full_name,pos_role,allow,deny,is_active,created_at,updated_at,email,pin_locked,pin_set_at,branch_id,location_id,register_id,drawer_name,failed_pin_attempts,pin_locked_until,last_pin_login_at,pin_disabled")
      .eq("worker_user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    loadAccess().catch(() => null),
  ]);

  const rows = (perms ?? []) as Record<string, any>[];
  const tenant = access && !access.is_owner ? access.tenant_id : null;
  const p = (tenant ? rows.find((r) => r.user_id === tenant) : null) ?? rows[0] ?? null;
  const tenantId = (p?.user_id as string) ?? user.id;

  let branchName: string | null = null;
  if (p?.branch_id) {
    const { data: b } = await supabase.from("branches").select("name").eq("id", p.branch_id).maybeSingle();
    branchName = (b?.name as string) ?? null;
  }
  let locationName: string | null = null;
  if (p?.location_id) {
    const { data: l } = await supabase.from("inventory_locations").select("name").eq("id", p.location_id).maybeSingle();
    locationName = (l?.name as string) ?? null;
  }
  let stationName: string | null = null;
  if (p?.register_id) {
    const { data: r } = await supabase.from("pos_registers").select("name").eq("id", p.register_id).maybeSingle();
    stationName = (r?.name as string) ?? null;
  }

  return {
    permissionId: (p?.id as string) ?? null,
    tenantId,
    cashierUserId: user.id,
    displayName: (p?.full_name as string) || user.email || "Cashier",
    posRole: (p?.pos_role as string) ?? (p ? "cashier" : "manager"),
    branchId: (p?.branch_id as string) ?? null,
    branchName,
    locationId: (p?.location_id as string) ?? null,
    locationName,
    registerId: (p?.register_id as string) ?? null,
    stationName,
    drawerName: (p?.drawer_name as string) ?? null,
    isOwner: !p,
  };
}

/* ------------------------------- shifts ---------------------------------- */

export async function currentShiftFor(cashierUserId: string) {
  const { data } = await supabase
    .from("pos_shifts")
    .select("*")
    .eq("status", "open")
    .or(`cashier_user_id.eq.${cashierUserId},created_by.eq.${cashierUserId}`)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, any>) ?? null;
}

export async function startShift(a: CashierAssignment, openingCash: number) {
  const { data, error } = await supabase
    .from("pos_shifts")
    .insert({
      user_id: a.tenantId,
      register_id: a.registerId,
      branch_id: a.branchId,
      location_id: a.locationId,
      station: a.stationName,
      drawer_name: a.drawerName,
      cashier_name: a.displayName,
      cashier_user_id: a.cashierUserId,
      opening_float: openingCash,
      status: "open",
      review_status: "open",
    } as never)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  await logActivity(a.tenantId, "shift.started", (data as any)?.id, { opening_cash: openingCash });
  return data as Record<string, any>;
}

export type ShiftTotals = {
  transactions: number;
  salesTotal: number;
  itemsSold: number;
  refunds: number;
  discounts: number;
  byMethod: Record<string, number>;
};

export async function shiftTotals(shiftId: string): Promise<ShiftTotals> {
  const { data: sales } = await supabase
    .from("pos_sales")
    .select("id,total,status,discount")
    .eq("shift_id", shiftId);
  const rows = (sales ?? []) as any[];
  const done = rows.filter((r) => r.status === "completed");
  const ids = rows.map((r) => r.id);

  const byMethod: Record<string, number> = {};
  let itemsSold = 0;
  if (ids.length) {
    const { data: pays } = await supabase.from("pos_payments").select("method,amount").in("sale_id", ids);
    (pays ?? []).forEach((p: any) => {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + n(p.amount);
    });
    const { data: items } = await supabase.from("pos_sale_items").select("qty,sale_id").in("sale_id", done.map((d) => d.id));
    itemsSold = (items ?? []).reduce((s: number, i: any) => s + n(i.qty), 0);
  }

  return {
    transactions: done.length,
    salesTotal: done.reduce((s, r) => s + n(r.total), 0),
    itemsSold,
    refunds: rows.filter((r) => r.status === "refunded").reduce((s, r) => s + n(r.total), 0),
    discounts: done.reduce((s, r) => s + n(r.discount), 0),
    byMethod,
  };
}

export function expectedCash(shift: Record<string, any> | null, totals: ShiftTotals) {
  return (
    n(shift?.opening_float) +
    n(totals.byMethod["cash"]) +
    n(shift?.cash_in) -
    n(totals.refunds) -
    n(shift?.cash_out)
  );
}

export async function submitShift(shiftId: string, actualCash: number, totals: ShiftTotals) {
  const other = Object.entries(totals.byMethod)
    .filter(([m]) => !["cash", "card", "momo", "mobile_money"].includes(m))
    .reduce((s, [, v]) => s + n(v), 0);
  const { data, error } = await supabase.rpc("submit_cashier_shift" as never, {
    _shift_id: shiftId,
    _actual_cash: actualCash,
    _breakdown: {
      cash_sales: n(totals.byMethod["cash"]),
      card_sales: n(totals.byMethod["card"]),
      momo_sales: n(totals.byMethod["momo"]) + n(totals.byMethod["mobile_money"]),
      other_sales: other,
      refunds_total: totals.refunds,
    },
  } as never);
  if (error) throw new Error(error.message);
  const res = data as unknown as { ok: boolean; error?: string };
  if (!res?.ok) throw new Error(res?.error ?? "Could not submit the shift");
  return res;
}

export async function reviewShift(shiftId: string, decision: "approved" | "rejected" | "recount", comment: string) {
  const { data, error } = await supabase.rpc("review_cashier_shift" as never, {
    _shift_id: shiftId,
    _decision: decision,
    _comment: comment || null,
  } as never);
  if (error) throw new Error(error.message);
  const res = data as unknown as { ok: boolean; error?: string };
  if (!res?.ok) throw new Error(res?.error ?? "Could not record that decision");
  return res;
}

export async function logActivity(tenantId: string, action: string, entity?: string | null, details?: Record<string, unknown>) {
  await supabase.rpc("log_cashier_activity" as never, {
    _tenant: tenantId,
    _action: action,
    _entity: entity ?? null,
    _details: (details ?? {}) as never,
  } as never);
}

/* ------------------------------ my sales ---------------------------------- */

export type Period = "today" | "yesterday" | "week" | "month" | "custom";

export function periodRange(period: Period, from?: string, to?: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (period === "week") {
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "custom" && from && to) {
    return { from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59`).toISOString() };
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export async function mySales(cashierUserId: string, period: Period, from?: string, to?: string) {
  const r = periodRange(period, from, to);
  const { data } = await supabase
    .from("pos_sales")
    .select("id,sale_no,customer_name,total,discount,tax,status,sold_at")
    .eq("created_by", cashierUserId)
    .gte("sold_at", r.from)
    .lte("sold_at", r.to)
    .order("sold_at", { ascending: false });
  const sales = (data ?? []) as any[];
  const ids = sales.map((s) => s.id);

  const lines: Record<string, { qty: number; value: number }> = {};
  const perSale: Record<string, { qty: number; count: number }> = {};
  const methods: Record<string, string> = {};
  if (ids.length) {
    const { data: items } = await supabase.from("pos_sale_items").select("sale_id,item_name,qty,line_total").in("sale_id", ids);
    (items ?? []).forEach((i: any) => {
      const k = i.item_name ?? "Item";
      lines[k] = { qty: n(lines[k]?.qty) + n(i.qty), value: n(lines[k]?.value) + n(i.line_total) };
      perSale[i.sale_id] = { qty: n(perSale[i.sale_id]?.qty) + n(i.qty), count: n(perSale[i.sale_id]?.count) + 1 };
    });
    const { data: pays } = await supabase.from("pos_payments").select("sale_id,method").in("sale_id", ids);
    (pays ?? []).forEach((p: any) => {
      methods[p.sale_id] = methods[p.sale_id] ? `${methods[p.sale_id]}, ${p.method}` : p.method;
    });
  }

  return {
    sales: sales.map((s) => ({
      ...s,
      items: perSale[s.id]?.count ?? 0,
      qty: perSale[s.id]?.qty ?? 0,
      method: methods[s.id] ?? "—",
    })),
    byProduct: Object.entries(lines)
      .map(([name, v]) => ({ name, qty: v.qty, value: v.value }))
      .sort((a, b) => b.value - a.value),
    totals: {
      gross: sales.filter((s) => s.status === "completed").reduce((a, s) => a + n(s.total), 0),
      count: sales.filter((s) => s.status === "completed").length,
      discounts: sales.reduce((a, s) => a + n(s.discount), 0),
      refunds: sales.filter((s) => s.status === "refunded").reduce((a, s) => a + n(s.total), 0),
    },
  };
}

/** Stock available at the cashier's own store — quantities only, no costs. */
export async function storeStock(tenantId: string, locationId: string | null, search: string) {
  if (!locationId) return [] as { name: string; sku: string | null; qty: number; price: number }[];
  const { data } = await supabase
    .from("stock_balances")
    .select("qty, item_id, stock_items(name, sku, sell_price)")
    .eq("user_id", tenantId)
    .eq("location_id", locationId);
  const rows = (data ?? []) as any[];
  return rows
    .map((r) => ({
      name: r.stock_items?.name ?? "Item",
      sku: r.stock_items?.sku ?? null,
      qty: n(r.qty),
      price: n(r.stock_items?.sell_price),
    }))
    .filter((r) => !search || `${r.name} ${r.sku ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Month-by-month history for one cashier, combining POS shifts and historical records. */
export async function monthlyHistory(tenantId: string, cashierUserId: string) {
  const { data: shifts } = await supabase
    .from("pos_shifts")
    .select("*")
    .eq("user_id", tenantId)
    .or(`cashier_user_id.eq.${cashierUserId},created_by.eq.${cashierUserId}`)
    .order("opened_at", { ascending: false });

  const months: Record<string, {
    month: string; shifts: number; sales: number; cashExpected: number; cashActual: number;
    variance: number; approved: number; pending: number;
  }> = {};

  for (const s of (shifts ?? []) as any[]) {
    const key = String(s.opened_at ?? s.created_at ?? "").slice(0, 7);
    if (!key) continue;
    months[key] ??= { month: key, shifts: 0, sales: 0, cashExpected: 0, cashActual: 0, variance: 0, approved: 0, pending: 0 };
    const m = months[key];
    m.shifts += 1;
    m.sales += n(s.cash_sales) + n(s.card_sales) + n(s.momo_sales) + n(s.other_sales);
    m.cashExpected += n(s.expected_cash);
    m.cashActual += n(s.actual_cash);
    m.variance += n(s.variance);
    if (s.review_status === "approved") m.approved += 1;
    if (s.review_status === "pending_review") m.pending += 1;
  }

  return Object.values(months).sort((a, b) => b.month.localeCompare(a.month));
}

/* ------------------------- store (Chibombo) wiring ------------------------ */

export type StoreLocation = { id: string; name: string; code: string | null };

/**
 * The store this cashier sells from. Uses the assigned location when there is
 * one, otherwise falls back to the Chibombo outlet, then to any outlet/store.
 */
export async function resolveStoreLocation(a: CashierAssignment | null): Promise<StoreLocation | null> {
  if (!a) return null;
  const { data } = await supabase
    .from("inventory_locations")
    .select("id,name,code,location_type,is_active")
    .eq("user_id", a.tenantId);
  const rows = ((data ?? []) as any[]).filter((r) => r.is_active !== false);
  if (!rows.length) return a.locationId ? { id: a.locationId, name: a.locationName ?? "Store", code: null } : null;

  const pick =
    rows.find((r) => r.id === a.locationId) ??
    rows.find((r) => /chibombo/i.test(`${r.name} ${r.code ?? ""}`)) ??
    rows.find((r) => ["outlet", "store", "pos", "shop"].includes(String(r.location_type ?? "").toLowerCase())) ??
    rows[0];

  return pick ? { id: pick.id, name: pick.name, code: pick.code ?? null } : null;
}

/* --------------------------------- returns -------------------------------- */

export async function recentSalesForReturn(cashierUserId: string, limit = 40) {
  const { data } = await supabase
    .from("pos_sales")
    .select("id,sale_no,customer_name,total,status,sold_at")
    .eq("created_by", cashierUserId)
    .in("status", ["completed", "refunded"])
    .order("sold_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Record<string, any>[];
}

export async function saleLines(saleId: string) {
  const { data } = await supabase
    .from("pos_sale_items")
    .select("id,name,sku,qty,price,line_total")
    .eq("sale_id", saleId);
  return (data ?? []) as Record<string, any>[];
}

/* ------------------------------- stock count ------------------------------ */

export type CountLine = { itemId: string; name: string; sku: string | null; expected: number; counted: string };

/** Items held at this store, as the starting sheet for a cashier stock count. */
export async function countSheet(tenantId: string, locationId: string): Promise<CountLine[]> {
  const { data } = await supabase
    .from("stock_balances")
    .select("qty,item_id,stock_items(name,sku)")
    .eq("user_id", tenantId)
    .eq("location_id", locationId);
  return ((data ?? []) as any[])
    .map((r) => ({
      itemId: r.item_id as string,
      name: (r.stock_items?.name as string) ?? "Item",
      sku: (r.stock_items?.sku as string) ?? null,
      expected: n(r.qty),
      counted: "",
    }))
    .sort((x, y) => x.name.localeCompare(y.name));
}

/** Saves the count as "counted" — a manager still approves and posts it. */
export async function submitStockCount(a: CashierAssignment, locationId: string, lines: CountLine[], notes: string) {
  const counted = lines.filter((l) => l.counted !== "");
  if (!counted.length) throw new Error("Enter at least one counted quantity");

  const { data: numberData } = await supabase.rpc("next_doc_number" as never, {
    _uid: a.tenantId,
    _prefix: "CNT",
  } as never);

  const { data: count, error } = await supabase
    .from("stock_counts")
    .insert({
      user_id: a.tenantId,
      count_number: (numberData as unknown as string) ?? `CNT-${Date.now().toString().slice(-6)}`,
      count_date: new Date().toISOString().slice(0, 10),
      location_id: locationId,
      counted_by: a.cashierUserId,
      status: "counted",
      notes: notes || null,
    } as never)
    .select("id,count_number")
    .single();
  if (error) throw new Error(error.message);

  const { error: le } = await supabase.from("stock_count_lines").insert(
    counted.map((l) => ({
      user_id: a.tenantId,
      count_id: (count as any).id,
      item_id: l.itemId,
      location_id: locationId,
      expected_qty: l.expected,
      counted_qty: Number(l.counted || 0),
    })) as never,
  );
  if (le) throw new Error(le.message);

  await logActivity(a.tenantId, "stock_count.submitted", (count as any).id, { location_id: locationId, lines: counted.length });
  return count as Record<string, any>;
}
