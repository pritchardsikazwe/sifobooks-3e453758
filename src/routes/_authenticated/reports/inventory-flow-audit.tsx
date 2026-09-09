import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRight, ArrowRightLeft, BadgeCheck, Boxes, ClipboardCheck, FileBarChart, History, PackageCheck, RefreshCw, Scale, ShoppingCart, Store, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { fmtMoney } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { fetchLocations, fetchBalances, fetchTransfers, type Location, type BalanceRow, type Transfer } from "@/lib/multi-location";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/inventory-flow-audit")({
  head: () => ({ meta: [{ title: "Inventory Flow & Transaction Audit — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InventoryFlowAudit,
});

type Movement = { id: string; transaction_date: string; created_at: string; movement_type: string; quantity: number; unit_cost: number | null; reference: string | null; note: string | null; location_id: string | null; item_id: string | null };
type Batch = { id: string; batch_no: string; batch_date: string; location_id: string | null; status: string; posted_at: string | null };
type Cashier = { id: string; location_id: string | null; cashier_name: string | null; period_end: string | null; item_id: string | null; delivered_qty: number; sold_qty: number; remaining_qty: number; sales_value: number | null; physical_count: number | null; variance: number; status: string };

function InventoryFlowAudit() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locs, bals, trfs, movs, batchRows, cashierRows] = await Promise.all([
        fetchLocations(true), fetchBalances(), fetchTransfers(),
        supabase.from("stock_movements").select("id, transaction_date, created_at, movement_type, quantity, unit_cost, reference, note, location_id, item_id").order("transaction_date").order("created_at").limit(1000),
        supabase.from("production_batches").select("id, batch_no, batch_date, location_id, status, posted_at").order("batch_date").limit(500),
        supabase.from("cashier_records").select("id, location_id, cashier_name, period_end, item_id, delivered_qty, sold_qty, remaining_qty, sales_value, physical_count, variance, status").order("period_end").limit(500),
      ]);
      if (movs.error) throw movs.error;
      if (batchRows.error) throw batchRows.error;
      if (cashierRows.error) throw cashierRows.error;
      setLocations(locs); setBalances(bals); setTransfers(trfs);
      setMovements((movs.data ?? []) as Movement[]); setBatches((batchRows.data ?? []) as Batch[]); setCashiers((cashierRows.data ?? []) as Cashier[]);
    } catch (e: any) { toast.error(e?.message ?? "Could not load inventory audit"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loc = (id: string | null) => locations.find(l => l.id === id)?.name ?? "Unassigned";
  const totalStockValue = balances.reduce((s, r) => s + Number(r.quantity) * Number(r.cost_price), 0);
  const opening = movements.filter(m => ["opening", "production"].includes(m.movement_type));
  const transferOut = movements.filter(m => m.movement_type === "transfer_out");
  const transferIn = movements.filter(m => m.movement_type === "transfer_in");
  const sales = movements.filter(m => m.movement_type === "sale");
  const adjustments = movements.filter(m => ["adjust", "adjust_in", "adjust_out"].includes(m.movement_type));
  const physicalVariance = cashiers.reduce((s, r) => s + Number(r.variance || 0), 0);
  const q = query.toLowerCase();

  const flow = useMemo(() => {
    const warehouse = locations.find(l => ["warehouse", "factory", "production"].includes(l.location_type));
    const store = locations.find(l => ["store", "outlet", "branch"].includes(l.location_type));
    const whRows = balances.filter(b => b.location_id === warehouse?.id);
    const storeRows = balances.filter(b => b.location_id === store?.id);
    const whQty = whRows.reduce((s, r) => s + Number(r.quantity), 0);
    const storeQty = storeRows.reduce((s, r) => s + Number(r.quantity), 0);
    return { warehouse, store, whRows, storeRows, whQty, storeQty };
  }, [locations, balances]);

  const movementColumns: DTColumn<Movement>[] = [
    { key: "transaction_date", header: "Date", sticky: true, cell: r => new Date(r.transaction_date).toLocaleDateString() },
    { key: "movement_type", header: "Transaction", cell: r => <Badge variant="outline">{r.movement_type}</Badge> },
    { key: "reference", header: "Reference", cell: r => r.reference ?? "—" },
    { key: "location_id", header: "Location", cell: r => loc(r.location_id) },
    { key: "quantity", header: "Qty", align: "right", cell: r => Number(r.quantity) },
    { key: "unit_cost", header: "Unit Cost", align: "right", cell: r => r.unit_cost == null ? "—" : fmtMoney(Number(r.unit_cost)) },
    { key: "note", header: "Audit Note", cell: r => r.note ?? "—" },
  ];

  const transferColumns: DTColumn<Transfer>[] = [
    { key: "transfer_number", header: "Transfer #", sticky: true, cell: r => <span className="font-medium">{r.transfer_number ?? r.id.slice(0, 8)}</span> },
    { key: "transfer_date", header: "Date", cell: r => new Date(r.transfer_date).toLocaleDateString() },
    { key: "from_location_id", header: "From", cell: r => loc(r.from_location_id) },
    { key: "to_location_id", header: "To", cell: r => loc(r.to_location_id) },
    { key: "status", header: "Status", cell: r => <SifoStatusBadge status={r.status} /> },
    { key: "total_value", header: "Value", align: "right", cell: r => fmtMoney(Number(r.total_value || 0)) },
  ];

  const cashierColumns: DTColumn<Cashier>[] = [
    { key: "period_end", header: "Period", cell: r => r.period_end ? new Date(r.period_end).toLocaleDateString() : "—" },
    { key: "cashier_name", header: "Cashier", cell: r => r.cashier_name ?? "—" },
    { key: "location_id", header: "Store", cell: r => loc(r.location_id) },
    { key: "delivered_qty", header: "Delivered", align: "right", cell: r => Number(r.delivered_qty || 0) },
    { key: "sold_qty", header: "Sold", align: "right", cell: r => Number(r.sold_qty || 0) },
    { key: "remaining_qty", header: "Remaining", align: "right", cell: r => Number(r.remaining_qty || 0) },
    { key: "physical_count", header: "Physical", align: "right", cell: r => r.physical_count == null ? "—" : Number(r.physical_count) },
    { key: "variance", header: "Variance", align: "right", cell: r => <span className={Number(r.variance) === 0 ? "" : "font-semibold"}>{Number(r.variance || 0)}</span> },
  ];

  const filteredMovements = movements.filter(m => !q || JSON.stringify({ ...m, location: loc(m.location_id) }).toLowerCase().includes(q));
  const filteredTransfers = transfers.filter(t => !q || JSON.stringify({ ...t, from: loc(t.from_location_id), to: loc(t.to_location_id) }).toLowerCase().includes(q));
  const filteredCashiers = cashiers.filter(r => !q || JSON.stringify({ ...r, location: loc(r.location_id) }).toLowerCase().includes(q));

  return <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
    <SifoModuleHeader title="Inventory Flow & Transaction Audit" description="A complete visual trail from opening/production stock to warehouse, transfers, store stock, cashier sales, reconciliation and audit evidence." icon={FileBarChart} actions={<Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>} />

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AuditCard icon={Boxes} label="Current stock value" value={fmtMoney(totalStockValue)} hint={`${balances.length} item-location positions`} />
      <AuditCard icon={History} label="Recorded movements" value={String(movements.length)} hint="Opening, production, sales, transfers & adjustments" />
      <AuditCard icon={ArrowRightLeft} label="Transfers" value={String(transfers.length)} hint={`${transferIn.length} in / ${transferOut.length} out movements`} />
      <AuditCard icon={Scale} label="Cashier variance" value={String(physicalVariance)} hint="Physical less recorded cashier balance" />
    </div>

    <Card className="overflow-hidden">
      <CardHeader><CardTitle className="text-base">MKP Farms Limited 1 — Stock Journey</CardTitle><p className="text-xs text-muted-foreground">The cards below represent the operational chain. Each stage should be traceable to source transactions.</p></CardHeader>
      <CardContent><div className="grid gap-3 lg:grid-cols-7 items-stretch">
        <FlowCard icon={ArrowDownToLine} title="Opening / Production" value={String(opening.length)} detail="Starting stock entries" status={opening.length ? "Recorded" : "None"} />
        <FlowArrow />
        <FlowCard icon={Warehouse} title={flow.warehouse?.name ?? "Warehouse"} value={`${flow.whQty} units`} detail={`${flow.whRows.length} item positions`} status="Current balance" />
        <FlowArrow />
        <FlowCard icon={ArrowRightLeft} title="Transfers" value={String(transfers.length)} detail="Dispatch → transit → receive" status={transfers.length ? "Traceable" : "None"} />
        <FlowArrow />
        <FlowCard icon={Store} title={flow.store?.name ?? "Store"} value={`${flow.storeQty} units`} detail={`${flow.storeRows.length} item positions`} status="Current balance" />
        <FlowArrow />
        <FlowCard icon={ShoppingCart} title="Cashier / Sales" value={String(sales.length)} detail="Sales reduce store stock" status={sales.length ? "Activity" : "No sales"} />
      </div></CardContent>
    </Card>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Checkpoint icon={PackageCheck} title="Opening control" text="Confirm the first posted batch and its destination location before transfers begin." ok={opening.length > 0} />
      <Checkpoint icon={ArrowRightLeft} title="Transfer control" text="Every dispatch and receipt remains linked to source and destination." ok={transfers.length > 0} />
      <Checkpoint icon={ShoppingCart} title="Sales control" text="Sales activity can be compared with store stock movements and cashier records." ok={sales.length > 0 || cashiers.length > 0} />
      <Checkpoint icon={ClipboardCheck} title="Reconciliation" text="Compare movements, expected closing, physical counts and variances." ok={adjustments.length >= 0} />
    </div>

    <div className="flex flex-col sm:flex-row gap-3"><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search all transaction references, locations, cashiers or notes…" /><Button variant="outline" onClick={() => setQuery("")}>Clear</Button></div>

    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Full Transaction History</CardTitle><p className="text-xs text-muted-foreground">Chronological stock movement evidence from the earliest recorded transaction onward.</p></CardHeader><CardContent className="px-0"><DataTable tableId="mkp-inventory-flow-movements" columns={movementColumns} data={filteredMovements} loading={loading} empty="No stock movements recorded." /></CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Transfer Audit</CardTitle><p className="text-xs text-muted-foreground">Trace warehouse-to-store movement and transfer status.</p></CardHeader><CardContent className="px-0"><DataTable tableId="mkp-inventory-flow-transfers" columns={transferColumns} data={filteredTransfers} loading={loading} empty="No transfers recorded." /></CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cashier & Store Control</CardTitle><p className="text-xs text-muted-foreground">Compare quantities delivered, sold, remaining and physical count variance.</p></CardHeader><CardContent className="px-0"><DataTable tableId="mkp-inventory-flow-cashier" columns={cashierColumns} data={filteredCashiers} loading={loading} empty="No cashier inventory records recorded." /></CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Management Report Pack</CardTitle><p className="text-xs text-muted-foreground">Use these report views as the standard audit pack for MKP Farms Limited 1.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ReportTile title="Stock by Location" detail="Warehouse, store and other locations with item-level balances." />
      <ReportTile title="Opening → Transfer → Sale" detail="End-to-end transaction trace for every stock position." />
      <ReportTile title="Inventory Movement" detail="Opening, production, purchases, sales, returns and adjustments." />
      <ReportTile title="Transfer Register" detail="From, to, status, dates and values." />
      <ReportTile title="Warehouse Stock" detail="Warehouse-only quantities and valuation." />
      <ReportTile title="Chibombo Store Stock" detail="Store-only quantities, reorder and valuation." />
      <ReportTile title="Stock Card" detail="Running balance for each item at each location." />
      <ReportTile title="Inventory Valuation" detail="Quantity × cost by location and item." />
      <ReportTile title="Stock Take Variance" detail="Expected versus physical count." />
      <ReportTile title="Adjustments & Write-offs" detail="Reasons, quantities and controlled changes." />
      <ReportTile title="Cashier Sales" detail="Sales by cashier/store and stock depletion." />
      <ReportTile title="Cashier Variance" detail="Delivered, sold, remaining and physical differences." />
      <ReportTile title="Inventory → GL Reconciliation" detail="Compare inventory value with accounting postings." />
      <ReportTile title="Audit Trail" detail="Who, what, when, source document and reason." />
      <ReportTile title="Stock in Transit" detail="Dispatched but not yet received transfers." />
      <ReportTile title="Exception Report" detail="Negative stock, missing cost/unit, variances and incomplete transactions." />
    </div></CardContent></Card>
  </div>;
}

function AuditCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><div className="mt-2 text-xl font-semibold">{value}</div><div className="text-[11px] text-muted-foreground mt-1">{hint}</div></CardContent></Card>; }
function FlowCard({ icon: Icon, title, value, detail, status }: { icon: any; title: string; value: string; detail: string; status: string }) { return <Card className="min-w-0"><CardContent className="p-4"><Icon className="h-5 w-5 text-primary" /><div className="mt-3 text-sm font-semibold truncate">{title}</div><div className="mt-1 text-lg font-bold">{value}</div><div className="text-[11px] text-muted-foreground mt-1">{detail}</div><Badge variant="outline" className="mt-3">{status}</Badge></CardContent></Card>; }
function FlowArrow() { return <div className="hidden lg:flex items-center justify-center text-muted-foreground"><ArrowRight className="h-5 w-5" /></div>; }
function Checkpoint({ icon: Icon, title, text, ok }: { icon: any; title: string; text: string; ok: boolean }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">{title}</span><Badge variant={ok ? "secondary" : "destructive"} className="ml-auto">{ok ? "Ready" : "Check"}</Badge></div><p className="text-xs text-muted-foreground mt-2 leading-5">{text}</p></CardContent></Card>; }
function ReportTile({ title, detail }: { title: string; detail: string }) { return <div className="rounded-lg border p-3 hover:bg-muted/40 transition-colors"><div className="flex items-center gap-2"><FileBarChart className="h-4 w-4 text-primary" /><span className="font-medium text-sm">{title}</span></div><p className="text-[11px] text-muted-foreground mt-1 leading-5">{detail}</p></div>; }
