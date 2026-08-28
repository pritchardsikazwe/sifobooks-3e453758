import { supabase } from "@/integrations/supabase/client";
import { deriveStatus, num, STATUS_LABEL, type StockStatus } from "@/lib/inventory";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ReportKey =
  | "summary" | "movement" | "valuation" | "bin_card" | "stock_take" | "aging"
  | "reorder" | "low_stock" | "out_of_stock" | "slow_moving" | "dead_stock"
  | "overstock" | "expiry" | "batch" | "serial" | "variance" | "warehouse" | "ledger";

export const REPORTS: { key: ReportKey; label: string; group: string }[] = [
  { key: "summary", label: "Inventory Summary", group: "Core" },
  { key: "movement", label: "Stock Movement", group: "Core" },
  { key: "valuation", label: "Stock Valuation", group: "Core" },
  { key: "bin_card", label: "Bin Card", group: "Core" },
  { key: "stock_take", label: "Stock Take", group: "Core" },
  { key: "ledger", label: "Inventory Ledger", group: "Core" },
  { key: "aging", label: "Stock Aging", group: "Analysis" },
  { key: "slow_moving", label: "Slow Moving Stock", group: "Analysis" },
  { key: "dead_stock", label: "Dead Stock", group: "Analysis" },
  { key: "warehouse", label: "Warehouse Stock", group: "Analysis" },
  { key: "variance", label: "Stock Variance", group: "Analysis" },
  { key: "reorder", label: "Reorder Report", group: "Exceptions" },
  { key: "low_stock", label: "Low Stock", group: "Exceptions" },
  { key: "out_of_stock", label: "Out of Stock", group: "Exceptions" },
  { key: "overstock", label: "Overstock", group: "Exceptions" },
  { key: "expiry", label: "Expiry Report", group: "Traceability" },
  { key: "batch", label: "Batch Report", group: "Traceability" },
  { key: "serial", label: "Serial Number Report", group: "Traceability" },
];

export type Filters = {
  warehouse: string;   // "all" | uuid
  category: string;    // "all" | value
  item: string;        // "all" | uuid
  status: string;      // "all" | StockStatus
  from: string;        // yyyy-mm-dd
  to: string;          // yyyy-mm-dd
};

export type Warehouse = { id: string; name: string };

export type MovementRow = {
  id: string;
  created_at: string;
  reference: string | null;
  note: string | null;
  movement_type: string;
  txn: string;              // human transaction type
  item_id: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  bin: string | null;
  qty_in: number;
  qty_out: number;
  signed: number;
  unit_cost: number;
  value: number;
  balance: number;          // running balance per item
  bucket: Bucket;
};

export type Bucket =
  | "purchased" | "received" | "production_in" | "transfer_in" | "sales_return"
  | "sales" | "production_out" | "transfer_out" | "purchase_return"
  | "damaged" | "adjustment" | "opening" | "count";

export type SummaryRow = {
  id: string;
  sl: number;
  item_code: string;
  barcode: string | null;
  item_name: string;
  item_type: string | null;
  category: string | null;
  warehouse: string;
  warehouse_id: string | null;
  bin: string | null;
  unit: string | null;
  opening: number;
  purchased: number;
  received: number;
  production_in: number;
  transfer_in: number;
  sales: number;
  sales_return: number;
  production_out: number;
  transfer_out: number;
  purchase_return: number;
  damaged: number;
  adjustment: number;
  total_in: number;
  total_out: number;
  closing: number;
  reserved: number;
  available: number;
  on_order: number;
  avg_cost: number;
  stock_value: number;
  reorder_level: number;
  safety_stock: number;
  max_stock: number;
  supplier: string | null;
  last_movement: string | null;
  days_idle: number | null;
  status: StockStatus;
  status_label: string;
};

/* ------------------------------------------------------------------ */
/* Movement classification                                             */
/* ------------------------------------------------------------------ */

const REF_RULES: { re: RegExp; inB: Bucket; outB: Bucket; label: string }[] = [
  { re: /(^|\b)(inv|sale|pos|sal)/i, inB: "sales_return", outB: "sales", label: "Sale" },
  { re: /(^|\b)(bill|po|grn|purch|rcv)/i, inB: "purchased", outB: "purchase_return", label: "Purchase" },
  { re: /(^|\b)(trf|transfer)/i, inB: "transfer_in", outB: "transfer_out", label: "Transfer" },
  { re: /(dmg|damag|write.?off|scrap)/i, inB: "adjustment", outB: "damaged", label: "Damage" },
  { re: /(prod|manuf|assembl)/i, inB: "production_in", outB: "production_out", label: "Production" },
  { re: /(cnt|count|stock.?take)/i, inB: "count", outB: "count", label: "Stock Count" },
  { re: /(open|opening)/i, inB: "opening", outB: "opening", label: "Opening Balance" },
];

export function classify(m: { movement_type: string; reference: string | null; note: string | null; quantity: number }) {
  const hay = `${m.reference ?? ""} ${m.note ?? ""}`;
  const isIn = m.movement_type === "in" || (m.movement_type === "adjust" && num(m.quantity) >= 0);
  for (const r of REF_RULES) {
    if (r.re.test(hay)) {
      const bucket = isIn ? r.inB : r.outB;
      return { bucket, label: `${r.label} ${isIn ? "In" : "Out"}`.replace(/(Sale|Purchase) (In|Out)/, (_x, a, b) =>
        a === "Sale" ? (b === "In" ? "Sales Return" : "Sale") : (b === "In" ? "Purchase" : "Purchase Return")) };
    }
  }
  if (m.movement_type === "adjust") return { bucket: "adjustment" as Bucket, label: isIn ? "Adjustment In" : "Adjustment Out" };
  return isIn
    ? { bucket: "received" as Bucket, label: "Receipt" }
    : { bucket: "sales" as Bucket, label: "Issue" };
}

const OUT_BUCKETS: Bucket[] = ["sales", "production_out", "transfer_out", "purchase_return", "damaged"];

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

export type BaseData = {
  items: any[];
  warehouses: Warehouse[];
  movements: any[];       // raw, created_at >= from
  batches: any[];
  serials: any[];
  countLines: any[];
  counts: any[];
};

export async function loadBase(f: Filters): Promise<BaseData> {
  const fromIso = new Date(`${f.from}T00:00:00`).toISOString();

  let itemQ = supabase.from("stock_items").select("*").order("name");
  if (f.warehouse !== "all") itemQ = itemQ.eq("warehouse_id", f.warehouse);
  if (f.category !== "all") itemQ = itemQ.eq("category", f.category);
  if (f.item !== "all") itemQ = itemQ.eq("id", f.item);

  const [{ data: items }, { data: whs }, { data: movs }, { data: batches }, { data: serials }, { data: lines }, { data: counts }] =
    await Promise.all([
      itemQ,
      supabase.from("warehouses").select("id, name").order("name"),
      supabase.from("stock_movements").select("*").gte("created_at", fromIso).order("created_at"),
      supabase.from("stock_batches").select("*").order("expiry_date"),
      supabase.from("stock_serials").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase.from("stock_count_lines").select("*"),
      supabase.from("stock_counts").select("*"),
    ]);

  return {
    items: items ?? [],
    warehouses: (whs ?? []) as Warehouse[],
    movements: movs ?? [],
    batches: batches ?? [],
    serials: serials ?? [],
    countLines: lines ?? [],
    counts: counts ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

const signed = (m: any) => (m.movement_type === "out" ? -num(m.quantity) : num(m.quantity));

export function buildSummary(base: BaseData, f: Filters): SummaryRow[] {
  const toEnd = new Date(`${f.to}T23:59:59`).getTime();
  const fromStart = new Date(`${f.from}T00:00:00`).getTime();
  const whName = (id: string | null) => base.warehouses.find((w) => w.id === id)?.name ?? "Unassigned";

  const byItem = new Map<string, any[]>();
  for (const m of base.movements) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push(m);
    byItem.set(m.item_id, arr);
  }

  return base.items.map((it, idx) => {
    const movs = byItem.get(it.id) ?? [];
    // Opening = current on hand minus everything that happened since period start
    const afterStart = movs.filter((m) => new Date(m.created_at).getTime() >= fromStart);
    const onHand = num(it.quantity_on_hand);
    const opening = onHand - afterStart.reduce((s, m) => s + signed(m), 0);

    const period = movs.filter((m) => {
      const t = new Date(m.created_at).getTime();
      return t >= fromStart && t <= toEnd;
    });

    const b: Record<Bucket, number> = {
      purchased: 0, received: 0, production_in: 0, transfer_in: 0, sales_return: 0,
      sales: 0, production_out: 0, transfer_out: 0, purchase_return: 0,
      damaged: 0, adjustment: 0, opening: 0, count: 0,
    };
    let adjNet = 0;
    for (const m of period) {
      const { bucket } = classify(m);
      const q = num(m.quantity);
      if (bucket === "adjustment" || bucket === "count") adjNet += signed(m);
      else b[bucket] += Math.abs(q);
    }
    b.adjustment = adjNet;

    const totalIn = b.purchased + b.received + b.production_in + b.transfer_in + b.sales_return + Math.max(0, b.adjustment);
    const totalOut = b.sales + b.production_out + b.transfer_out + b.purchase_return + b.damaged + Math.max(0, -b.adjustment);
    const closing = opening + totalIn - totalOut;

    const reserved = num(it.reserved_qty);
    const avgCost = num(it.cost_price);
    const last = movs.length ? movs[movs.length - 1].created_at : null;

    const status = deriveStatus({
      quantity_on_hand: closing,
      reserved_qty: reserved,
      reorder_level: num(it.reorder_level),
      safety_stock: num(it.safety_stock),
      max_stock: num(it.max_stock),
    });

    return {
      id: it.id,
      sl: idx + 1,
      item_code: it.sku ?? "—",
      barcode: it.barcode ?? null,
      item_name: it.name,
      item_type: it.item_type ?? null,
      category: it.category ?? null,
      warehouse: whName(it.warehouse_id),
      warehouse_id: it.warehouse_id ?? null,
      bin: it.bin ?? null,
      unit: it.unit ?? null,
      opening,
      purchased: b.purchased,
      received: b.received,
      production_in: b.production_in,
      transfer_in: b.transfer_in,
      sales: b.sales,
      sales_return: b.sales_return,
      production_out: b.production_out,
      transfer_out: b.transfer_out,
      purchase_return: b.purchase_return,
      damaged: b.damaged,
      adjustment: b.adjustment,
      total_in: totalIn,
      total_out: totalOut,
      closing,
      reserved,
      available: closing - reserved,
      on_order: num(it.on_order_qty),
      avg_cost: avgCost,
      stock_value: closing * avgCost,
      reorder_level: num(it.reorder_level),
      safety_stock: num(it.safety_stock),
      max_stock: num(it.max_stock),
      supplier: null,
      last_movement: last,
      days_idle: last ? Math.floor((Date.now() - new Date(last).getTime()) / 864e5) : null,
      status,
      status_label: STATUS_LABEL[status],
    } satisfies SummaryRow;
  });
}

export function buildMovements(base: BaseData, f: Filters): MovementRow[] {
  const fromStart = new Date(`${f.from}T00:00:00`).getTime();
  const toEnd = new Date(`${f.to}T23:59:59`).getTime();
  const itemMap = new Map(base.items.map((i) => [i.id, i]));
  const whName = (id: string | null) => base.warehouses.find((w) => w.id === id)?.name ?? "Unassigned";

  const running = new Map<string, number>();
  // seed running balances with opening qty per item
  for (const s of buildSummary(base, f)) running.set(s.id, s.opening);

  const rows: MovementRow[] = [];
  for (const m of base.movements) {
    const it = itemMap.get(m.item_id);
    if (!it) continue; // respects warehouse / category / item filters
    const t = new Date(m.created_at).getTime();
    if (t < fromStart || t > toEnd) continue;
    const { bucket, label } = classify(m);
    const sgn = signed(m);
    const bal = (running.get(m.item_id) ?? 0) + sgn;
    running.set(m.item_id, bal);
    const cost = num(m.unit_cost) || num(it.cost_price);
    rows.push({
      id: m.id,
      created_at: m.created_at,
      reference: m.reference ?? null,
      note: m.note ?? null,
      movement_type: m.movement_type,
      txn: label,
      item_id: m.item_id,
      item_code: it.sku ?? "—",
      item_name: it.name,
      warehouse: whName(it.warehouse_id),
      bin: it.bin ?? null,
      qty_in: sgn > 0 ? sgn : 0,
      qty_out: sgn < 0 ? -sgn : 0,
      signed: sgn,
      unit_cost: cost,
      value: Math.abs(sgn) * cost,
      balance: bal,
      bucket,
    });
  }
  return rows.reverse();
}

export function agingBucket(days: number | null) {
  if (days === null) return "No movement";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 180) return "91-180";
  if (days <= 365) return "181-365";
  return "365+";
}

export function expiryStatus(expiry: string | null) {
  if (!expiry) return { label: "SAFE", days: null as number | null };
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 864e5);
  if (days < 0) return { label: "EXPIRED", days };
  if (days <= 7) return { label: "7 DAYS", days };
  if (days <= 30) return { label: "30 DAYS", days };
  if (days <= 60) return { label: "60 DAYS", days };
  if (days <= 90) return { label: "90 DAYS", days };
  return { label: "SAFE", days };
}

export { OUT_BUCKETS };
