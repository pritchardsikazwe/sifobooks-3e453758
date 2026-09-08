import { supabase } from "@/integrations/supabase/client";

/** Inventory locations, per-location balances, transfers and stock cards. */

export type Location = {
  id: string;
  name: string;
  code: string | null;
  location_type: string;
  address: string | null;
  notes: string | null;
  is_default: boolean;
  is_active: boolean;
};

export const LOCATION_TYPES = [
  "warehouse",
  "outlet",
  "branch",
  "store",
  "kitchen",
  "bar",
  "factory",
  "production",
  "damaged",
  "returns",
  "transit",
] as const;

export type TransferStatus =
  | "draft" | "submitted" | "approved" | "dispatched" | "in_transit" | "received" | "completed" | "cancelled";

export type Transfer = {
  id: string;
  transfer_number: string | null;
  reference: string | null;
  transfer_date: string;
  status: string;
  purpose: string | null;
  notes: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  total_value: number;
};

export type TransferLine = {
  id: string;
  transfer_id: string;
  item_id: string | null;
  description: string | null;
  quantity: number;
  qty_received: number;
  unit_cost: number;
  batch_no: string | null;
  expiry_date: string | null;
  notes: string | null;
};

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchLocations(includeInactive = false) {
  let q = supabase.from("inventory_locations").select("*").order("location_type").order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Location[];
}

export type BalanceRow = {
  item_id: string;
  location_id: string;
  quantity: number;
  name: string;
  sku: string | null;
  unit: string;
  cost_price: number;
  reorder_level: number;
};

/** Per-location quantities joined to the product master. */
export async function fetchBalances(locationId?: string) {
  let q = supabase
    .from("stock_balances")
    .select("item_id, location_id, quantity, stock_items(name, sku, unit, cost_price, reorder_level)");
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    item_id: r.item_id,
    location_id: r.location_id,
    quantity: Number(r.quantity ?? 0),
    name: r.stock_items?.name ?? "—",
    sku: r.stock_items?.sku ?? null,
    unit: r.stock_items?.unit ?? "each",
    cost_price: Number(r.stock_items?.cost_price ?? 0),
    reorder_level: Number(r.stock_items?.reorder_level ?? 0),
  })) as BalanceRow[];
}

export async function fetchTransfers() {
  const { data, error } = await supabase
    .from("inventory_transfers")
    .select("*")
    .order("transfer_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Transfer[];
}

export async function fetchTransferLines(transferId: string) {
  const { data, error } = await supabase
    .from("inventory_transfer_items")
    .select("*")
    .eq("transfer_id", transferId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as TransferLine[];
}

export async function setTransferStatus(id: string, status: TransferStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "approved") patch.approved_at = new Date().toISOString();
  const { error } = await supabase.from("inventory_transfers").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function dispatchTransfer(id: string, allowNegative = false) {
  const { data, error } = await supabase.rpc("dispatch_stock_transfer", {
    _transfer_id: id,
    _allow_negative: allowNegative,
  } as never);
  if (error) throw error;
  return data;
}

export async function receiveTransfer(id: string) {
  const { data, error } = await supabase.rpc("receive_stock_transfer", { _transfer_id: id } as never);
  if (error) throw error;
  return data;
}

export type CardMovement = {
  id: string;
  transaction_date: string;
  created_at: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  reference: string | null;
  note: string | null;
  location_id: string | null;
};

const IN_TYPES = ["in", "opening", "purchase", "return", "transfer_in", "adjust_in", "production"];

export function signedQty(m: { movement_type: string; quantity: number }) {
  if (IN_TYPES.includes(m.movement_type)) return Number(m.quantity);
  if (m.movement_type === "adjust") return Number(m.quantity);
  return -Number(m.quantity);
}

/** Stock card: every movement for one product, optionally at one location, with a running balance. */
export async function fetchStockCard(itemId: string, locationId?: string) {
  let q = supabase
    .from("stock_movements")
    .select("id, transaction_date, created_at, movement_type, quantity, unit_cost, reference, note, location_id")
    .eq("item_id", itemId)
    .order("transaction_date")
    .order("created_at")
    .limit(500);
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) throw error;
  let running = 0;
  return (data ?? []).map((m: any) => {
    const delta = signedQty(m);
    running = m.movement_type === "adjust" ? Number(m.quantity) : running + delta;
    return { ...(m as CardMovement), delta, balance: running };
  });
}

export const MOVEMENT_LABEL: Record<string, string> = {
  opening: "Opening stock",
  production: "Production",
  in: "Stock in",
  out: "Stock out",
  purchase: "Purchase received",
  sale: "Sale",
  return: "Customer return",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  adjust: "Adjustment (set)",
  adjust_in: "Adjustment increase",
  adjust_out: "Adjustment decrease",
  reversal: "Reversal",
};

export const ADJUSTMENT_REASONS = [
  { value: "damage", label: "Damaged" },
  { value: "loss", label: "Loss" },
  { value: "theft", label: "Theft" },
  { value: "expiry", label: "Expired" },
  { value: "count_variance", label: "Count variance" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

/* ---------------- production batches ---------------- */

export type ProductionBatch = {
  id: string; batch_no: string; batch_date: string; location_id: string | null;
  status: string; notes: string | null; posted_at: string | null;
};

export type ProductionLine = {
  id: string; batch_id: string; item_id: string; quantity: number; unit_cost: number | null; note: string | null;
};

export async function fetchProductionBatches() {
  const { data, error } = await supabase
    .from("production_batches").select("*").order("batch_date", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as ProductionBatch[];
}

export async function fetchProductionLines(batchId: string) {
  const { data, error } = await supabase
    .from("production_batch_lines").select("*").eq("batch_id", batchId).order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as ProductionLine[];
}

/** Creates a production batch and puts the produced quantities into the chosen location. */
export async function createProductionBatch(input: {
  batch_no: string; batch_date: string; location_id: string; notes?: string;
  lines: { item_id: string; quantity: number; unit_cost?: number | null }[];
}) {
  const uid = await currentUserId();
  const { data, error } = await supabase.from("production_batches").insert({
    user_id: uid, batch_no: input.batch_no, batch_date: input.batch_date,
    location_id: input.location_id, notes: input.notes ?? null, status: "posted",
    posted_at: new Date().toISOString(), created_by: uid,
  } as never).select().single();
  if (error) throw error;
  const batch = data as any;
  const lines = input.lines.filter((l) => l.item_id && l.quantity > 0);
  if (lines.length) {
    const { error: le } = await supabase.from("production_batch_lines").insert(
      lines.map((l) => ({ user_id: uid, batch_id: batch.id, item_id: l.item_id, quantity: l.quantity, unit_cost: l.unit_cost ?? null })) as never,
    );
    if (le) throw le;
    const { error: me } = await supabase.from("stock_movements").insert(
      lines.map((l) => ({
        user_id: uid, item_id: l.item_id, movement_type: "production", quantity: l.quantity,
        unit_cost: l.unit_cost ?? null, reference: input.batch_no, note: "Production into location",
        location_id: input.location_id, transaction_date: input.batch_date,
        source_type: "production_batch", source_id: batch.id, created_by: uid,
      })) as never,
    );
    if (me) throw me;
  }
  return batch.id as string;
}

/* ---------------- cashier control records ---------------- */

export type CashierRecord = {
  id: string; location_id: string | null; cashier_name: string | null;
  period_start: string | null; period_end: string | null; item_id: string | null;
  delivered_qty: number; sold_qty: number; remaining_qty: number;
  selling_price: number | null; sales_value: number | null;
  physical_count: number | null; variance: number; status: string;
  notes: string | null; source_image_url: string | null;
};

export async function fetchCashierRecords() {
  const { data, error } = await supabase
    .from("cashier_records").select("*").order("period_end", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as CashierRecord[];
}

export async function saveCashierRecord(row: Partial<CashierRecord> & { id?: string }) {
  const uid = await currentUserId();
  if (row.id) {
    const { error } = await supabase.from("cashier_records").update(row as never).eq("id", row.id);
    if (error) throw error;
    return row.id;
  }
  const { data, error } = await supabase.from("cashier_records")
    .insert({ ...row, user_id: uid, created_by: uid } as never).select().single();
  if (error) throw error;
  return (data as any).id as string;
}

/* ---------------- price history ---------------- */

export type PriceHistoryRow = {
  id: string; item_id: string; location_id: string | null; price_type: string;
  price: number; quantity: number | null; effective_date: string; cashier_name: string | null; note: string | null;
};

export async function fetchPriceHistory(itemId?: string) {
  let q = supabase.from("product_price_history").select("*").order("effective_date", { ascending: false }).limit(500);
  if (itemId) q = q.eq("item_id", itemId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PriceHistoryRow[];
}

export async function addPriceHistory(row: {
  item_id: string; price: number; effective_date: string; quantity?: number | null;
  location_id?: string | null; cashier_name?: string | null; note?: string | null; price_type?: string;
}) {
  const uid = await currentUserId();
  const { error } = await supabase.from("product_price_history")
    .insert({ ...row, price_type: row.price_type ?? "selling", user_id: uid, created_by: uid } as never);
  if (error) throw error;
}

/* ---------------- reconciliation ---------------- */

export type ReconRow = {
  item_id: string; item_name: string; sku: string | null; unit: string;
  opening: number; produced: number; transfers_in: number; other_in: number;
  sales: number; returns: number; transfers_out: number; adjustments: number;
  expected_closing: number;
};

export async function fetchReconciliation(locationId: string | null, from: string, to: string) {
  const uid = await currentUserId();
  const { data, error } = await supabase.rpc("stock_reconciliation", {
    _uid: uid, _location: locationId, _from: from, _to: to,
  } as never);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    opening: Number(r.opening ?? 0), produced: Number(r.produced ?? 0),
    transfers_in: Number(r.transfers_in ?? 0), other_in: Number(r.other_in ?? 0),
    sales: Number(r.sales ?? 0), returns: Number(r.returns ?? 0),
    transfers_out: Number(r.transfers_out ?? 0), adjustments: Number(r.adjustments ?? 0),
    expected_closing: Number(r.expected_closing ?? 0),
  })) as ReconRow[];
}

