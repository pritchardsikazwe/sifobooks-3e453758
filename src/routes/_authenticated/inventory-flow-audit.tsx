import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpFromLine, Boxes, FileText, RefreshCw, Search, ShoppingCart, Truck, Warehouse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { fmtMoney } from "@/lib/format";
import { MOVEMENT_LABEL, signedQty } from "@/lib/multi-location";
import { toast } from "sonner";

type Movement = {
  id: string; item_id: string | null; location_id: string | null; movement_type: string;
  quantity: number; unit_cost: number | null; reference: string | null; note: string | null;
  transaction_date: string; created_at: string; source_type: string | null; source_id: string | null;
  user_id: string | null; created_by: string | null; item_name: string; sku: string | null; location_name: string;
};

type SourceDetail = { kind: string; header: any; lines: any[] } | null;
const n = (v: any) => Number(v ?? 0);
const movementLabel = (t: string) => MOVEMENT_LABEL[t] ?? t.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export const Route = createFileRoute("/_authenticated/inventory-flow-audit")({
  head: () => ({ meta: [{ title: "Inventory Flow Audit — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InventoryFlowAudit,
});

function InventoryFlowAudit() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [locationId, setLocationId] = useState("");
  const [selected, setSelected] = useState<Movement | null>(null);
  const [source, setSource] = useState<SourceDetail>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: movementData, error: movementError }, { data: locationData, error: locationError }] = await Promise.all([
        supabase.from("stock_movements").select("id,item_id,location_id,movement_type,quantity,unit_cost,reference,note,transaction_date,created_at,source_type,source_id,user_id,created_by,stock_items(name,sku),inventory_locations(name)").order("transaction_date", { ascending: true }).order("created_at", { ascending: true }).limit(2000),
        supabase.from("inventory_locations").select("id,name,code,location_type,is_active").order("name"),
      ]);
      if (movementError) throw movementError;
      if (locationError) throw locationError;
      setRows((movementData ?? []).map((r: any) => ({ ...r, quantity: n(r.quantity), unit_cost: r.unit_cost == null ? null : n(r.unit_cost), item_name: r.stock_items?.name ?? "Unknown item", sku: r.stock_items?.sku ?? null, location_name: r.inventory_locations?.name ?? "Unknown location" })));
      setLocations(locationData ?? []);
    } catch (e: any) { toast.error(e?.message ?? "Could not load inventory flow audit"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => (!locationId || r.location_id === locationId) && (!q || `${r.item_name} ${r.sku ?? ""} ${r.reference ?? ""} ${r.movement_type} ${r.location_name}`.toLowerCase().includes(q)));
  }, [rows, query, locationId]);

  const stats = useMemo(() => ({
    opening: filtered.filter(r => ["opening", "production"].includes(r.movement_type)).reduce((s, r) => s + Math.abs(signedQty(r)), 0),
    inbound: filtered.filter(r => ["in", "purchase", "transfer_in", "return", "adjust_in"].includes(r.movement_type)).reduce((s, r) => s + Math.abs(signedQty(r)), 0),
    outbound: filtered.filter(r => ["out", "sale", "transfer_out", "adjust_out"].includes(r.movement_type)).reduce((s, r) => s + Math.abs(signedQty(r)), 0),
    exceptions: filtered.filter(r => ["reversal", "adjust", "adjust_in", "adjust_out"].includes(r.movement_type)).length,
  }), [filtered]);

  const openTransaction = async (movement: Movement) => {
    setSelected(movement); setSource(null); setSourceLoading(true);
    try {
      const id = movement.source_id;
      const type = (movement.source_type ?? "").toLowerCase();
      if (id && (type.includes("production") || movement.movement_type === "production")) {
        const [{ data: header }, { data: lines }] = await Promise.all([
          supabase.from("production_batches").select("*").eq("id", id).maybeSingle(),
          supabase.from("production_batch_lines").select("*,stock_items(name,sku,unit)").eq("batch_id", id).order("created_at"),
        ]); setSource({ kind: "Production Batch", header, lines: lines ?? [] });
      } else if (id && (type.includes("transfer") || movement.movement_type.startsWith("transfer_"))) {
        const [{ data: header }, { data: lines }] = await Promise.all([
          supabase.from("inventory_transfers").select("*").eq("id", id).maybeSingle(),
          supabase.from("inventory_transfer_items").select("*,stock_items(name,sku,unit)").eq("transfer_id", id).order("created_at"),
        ]); setSource({ kind: "Stock Transfer", header, lines: lines ?? [] });
      } else if (id && (type.includes("pos") || movement.movement_type === "sale")) {
        const [{ data: header }, { data: lines }] = await Promise.all([
          supabase.from("pos_sales").select("*").eq("id", id).maybeSingle(),
          supabase.from("pos_sale_items").select("*").eq("sale_id", id).order("created_at"),
        ]); setSource({ kind: "POS Sale", header, lines: lines ?? [] });
      } else if (id && type.includes("purchase")) {
        const { data: header } = await supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle();
        setSource({ kind: "Purchase Source", header, lines: [] });
      } else setSource({ kind: movement.movement_type === "reversal" ? "Reversal" : "Inventory Movement", header: null, lines: [] });
    } catch (e: any) { setSource({ kind: "Inventory Movement", header: null, lines: [] }); toast.error(e?.message ?? "Source document could not be loaded"); }
    finally { setSourceLoading(false); }
  };

  return <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
    <SifoModuleHeader title="Inventory Flow Audit" description="MKP Farms Limited 1 — follow inventory from its first entry through every transfer, sale and adjustment." icon={Activity} actions={<Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>} />

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AuditCard icon={Warehouse} title="Opening / Production" value={stats.opening} subtitle="Starting stock entering locations" />
      <AuditCard icon={ArrowDownToLine} title="Stock In" value={stats.inbound} subtitle="Purchases, receipts, transfers in" />
      <AuditCard icon={ArrowUpFromLine} title="Stock Out / Sales" value={stats.outbound} subtitle="Sales, issues, transfers out" />
      <AuditCard icon={Activity} title="Exceptions" value={stats.exceptions} subtitle="Adjustments and reversals" />
    </div>

    <Card className="overflow-hidden">
      <CardHeader><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><CardTitle className="text-base">Inventory Journey</CardTitle><p className="text-xs text-muted-foreground mt-1">Every movement is clickable. Start at the first warehouse entry and inspect the complete source transaction.</p></div><div className="flex flex-col sm:flex-row gap-2"><select value={locationId} onChange={e => setLocationId(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All locations</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select><div className="relative sm:w-72"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="Item, SKU, batch, transfer, sale…" /></div></div></div></CardHeader>
      <CardContent className="p-0"><div className="divide-y">{filtered.map((r, index) => <JourneyRow key={r.id} row={r} sequence={index + 1} history={filtered} onOpen={openTransaction} />)}{!loading && !filtered.length && <div className="py-12 text-center text-sm text-muted-foreground">No inventory movements match this filter.</div>}</div></CardContent>
    </Card>

    <Card><CardHeader><CardTitle className="text-sm">How to audit an item</CardTitle></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-7 items-center"><Step icon={Warehouse} text="First entry" /><ArrowRight className="hidden md:block h-4 w-4" /><Step icon={Truck} text="Transfer" /><ArrowRight className="hidden md:block h-4 w-4" /><Step icon={Boxes} text="Store balance" /><ArrowRight className="hidden md:block h-4 w-4" /><Step icon={ShoppingCart} text="Cashier sale" /></div></CardContent></Card>

    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) { setSelected(null); setSource(null); } }}><DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>Transaction Audit Detail</DialogTitle></DialogHeader>{selected && <TransactionDetail movement={selected} source={source} loading={sourceLoading} history={filtered} />}</DialogContent></Dialog>
  </div>;
}

function AuditCard({ icon: Icon, title, value, subtitle }: { icon: any; title: string; value: number; subtitle: string }) { return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{title}</div><div className="text-2xl font-semibold mt-2">{value.toLocaleString()}</div><div className="text-[11px] text-muted-foreground mt-1">{subtitle}</div></CardContent></Card>; }
function Step({ icon: Icon, text }: { icon: any; text: string }) { return <div className="rounded-lg border p-3 flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{text}</span></div>; }

function JourneyRow({ row, sequence, history, onOpen }: { row: Movement; sequence: number; history: Movement[]; onOpen: (r: Movement) => void }) {
  const sameItemLocation = history.filter(r => r.item_id === row.item_id && r.location_id === row.location_id && new Date(r.transaction_date).getTime() <= new Date(row.transaction_date).getTime() && new Date(r.created_at).getTime() <= new Date(row.created_at).getTime());
  const balance = sameItemLocation.reduce((sum, r) => sum + signedQty(r), 0);
  const delta = signedQty(row);
  return <button type="button" onClick={() => onOpen(row)} className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"><div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center"><div className="h-8 w-8 rounded-full border flex items-center justify-center text-[10px] font-semibold text-muted-foreground">{sequence}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{movementLabel(row.movement_type)}</Badge><span className="font-semibold truncate">{row.reference ?? "No reference"}</span><span className="text-xs text-muted-foreground">{row.location_name}</span></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{row.item_name}</span><span>{row.sku ?? "No SKU"}</span><span>{new Date(row.transaction_date).toLocaleDateString()}</span>{row.source_type && <span>Source: {row.source_type}</span>}</div></div><div className="text-right"><div className={`font-bold ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{delta > 0 ? "+" : ""}{delta}</div><div className="text-[11px] text-muted-foreground">Balance {balance}</div></div></div></button>;
}

function TransactionDetail({ movement, source, loading, history }: { movement: Movement; source: SourceDetail; loading: boolean; history: Movement[] }) {
  const delta = signedQty(movement);
  const balance = history.filter(r => r.item_id === movement.item_id && r.location_id === movement.location_id && (new Date(r.transaction_date).getTime() < new Date(movement.transaction_date).getTime() || (new Date(r.transaction_date).getTime() === new Date(movement.transaction_date).getTime() && new Date(r.created_at).getTime() <= new Date(movement.created_at).getTime()))).reduce((s, r) => s + signedQty(r), 0);
  const h = source?.header;
  return <div className="space-y-5">
    <div className="rounded-xl border bg-muted/20 p-4"><div className="flex flex-wrap justify-between gap-4"><div><div className="flex items-center gap-2"><Badge>{movementLabel(movement.movement_type)}</Badge>{movement.reference && <span className="font-semibold">{movement.reference}</span>}</div><h3 className="text-xl font-semibold mt-2">{movement.item_name}</h3><p className="text-xs text-muted-foreground">{movement.sku ?? "No SKU"} · {movement.location_name}</p></div><div className={`text-right ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}><div className="text-xs text-muted-foreground">Movement</div><div className="text-3xl font-bold">{delta > 0 ? "+" : ""}{delta}</div><div className="text-xs text-muted-foreground">Running balance: {balance}</div></div></div><div className="grid gap-3 sm:grid-cols-4 mt-4"><Meta label="Transaction date" value={new Date(movement.transaction_date).toLocaleString()} /><Meta label="Recorded at" value={new Date(movement.created_at).toLocaleString()} /><Meta label="Unit cost" value={movement.unit_cost == null ? "—" : fmtMoney(movement.unit_cost)} /><Meta label="Value" value={movement.unit_cost == null ? "—" : fmtMoney(Math.abs(movement.quantity) * movement.unit_cost)} /></div></div>
    <div className="grid gap-2 md:grid-cols-4"><FlowBox icon={FileText} title="Source" value={source?.kind ?? movement.source_type ?? "Inventory"} /><FlowBox icon={Boxes} title="Location" value={movement.location_name} /><FlowBox icon={Activity} title="Stock effect" value={`${delta > 0 ? "+" : ""}${delta} units`} /><FlowBox icon={Warehouse} title="Balance after" value={String(balance)} /></div>
    <Card><CardHeader><CardTitle className="text-sm">Source transaction</CardTitle></CardHeader><CardContent>{loading ? <div className="py-6 text-center text-sm text-muted-foreground">Loading source document…</div> : <><div className="grid gap-3 sm:grid-cols-3">{h ? Object.entries(h).filter(([k, v]) => v != null && typeof v !== "object").slice(0, 12).map(([k, v]) => <Meta key={k} label={k.replaceAll("_", " ")} value={String(v)} />) : <Meta label="Reference" value={movement.reference ?? "No source document"} />}</div>{source?.lines?.length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{["Item","SKU","Qty","Unit Cost","Value"].map(x => <th key={x} className="px-2 py-2 text-left text-xs text-muted-foreground">{x}</th>)}</tr></thead><tbody>{source.lines.map((line: any, i: number) => { const qty = n(line.quantity ?? line.qty ?? line.qty_received); const cost = n(line.unit_cost ?? line.cost_price); return <tr key={line.id ?? i} className="border-b last:border-0"><td className="px-2 py-2">{line.stock_items?.name ?? line.name ?? line.description ?? "—"}</td><td className="px-2 py-2">{line.stock_items?.sku ?? line.sku ?? "—"}</td><td className="px-2 py-2">{qty}</td><td className="px-2 py-2">{cost ? fmtMoney(cost) : "—"}</td><td className="px-2 py-2">{cost ? fmtMoney(qty * cost) : "—"}</td></tr>; })}</tbody></table></div> : <div className="mt-4 text-xs text-muted-foreground">No source lines were found for this movement. The movement itself remains available in the audit trail.</div>}</>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">Audit metadata</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Meta label="Source ID" value={movement.source_id ?? "—"} /><Meta label="Created by" value={movement.created_by ?? movement.user_id ?? "—"} /><Meta label="Note" value={movement.note ?? "—"} /></div></CardContent></Card>
  </div>;
}
function FlowBox({ icon: Icon, title, value }: { icon: any; title: string; value: string }) { return <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{title}</div><div className="font-semibold mt-1 truncate">{value}</div></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm font-medium mt-1 break-words">{value}</div></div>; }
