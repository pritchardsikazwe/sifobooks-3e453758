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

const IN_TYPES = ["in", "opening", "purchase", "return", "transfer_in", "adjust_in"];

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
