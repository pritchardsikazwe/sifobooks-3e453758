import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpFromLine, Boxes, CalendarClock, ChevronRight, FileText, PackageCheck, RefreshCw, Search, ShoppingCart, Truck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { fmtMoney } from "@/lib/format";
import { MOVEMENT_LABEL, signedQty } from "@/lib/multi-location";
import { toast } from "sonner";

type Movement = {
  id: string; item_id: string | null; location_id: string | null; movement_type: string;
  quantity: number; unit_cost: number | null; reference: string | null; note: string | null;
  transaction_date: string; created_at: string; source_type?: string | null; source_id?: string | null;
  user_id?: string | null; created_by?: string | null;
  item_name?: string; sku?: string | null; location_name?: string;
};

type Detail = { kind: string; header: any; lines: any[] } | null;

const n = (v: any) => Number(v ?? 0);
const label = (type: string) => MOVEMENT_LABEL[type] ?? type.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export function InventoryTransactionExplorer({ locationId, compact = false }: { locationId?: string; compact?: boolean }) {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Movement | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("stock_movements")
        .select("id,item_id,location_id,movement_type,quantity,unit_cost,reference,note,transaction_date,created_at,source_type,source_id,user_id,created_by,stock_items(name,sku),inventory_locations(name)")
        .order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(compact ? 40 : 500);
      if (locationId) q = q.eq("location_id", locationId);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []).map((r: any) => ({ ...r, quantity: n(r.quantity), unit_cost: r.unit_cost == null ? null : n(r.unit_cost), item_name: r.stock_items?.name ?? "Unknown item", sku: r.stock_items?.sku ?? null, location_name: r.inventory_locations?.name ?? "Unknown location" })) as Movement[]);
    } catch (e: any) { toast.error(e?.message ?? "Could not load transaction history"); }
    finally { setLoading(false); }
  }, [locationId, compact]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => `${r.item_name} ${r.sku ?? ""} ${r.reference ?? ""} ${r.movement_type} ${r.location_name ?? ""} ${r.source_type ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const opening = rows.filter(r => ["opening", "production"].includes(r.movement_type)).reduce((s, r) => s + Math.abs(signedQty(r)), 0);
  const inbound = rows.filter(r => ["in", "purchase", "transfer_in", "return", "adjust_in"].includes(r.movement_type)).reduce((s, r) => s + Math.abs(signedQty(r)), 0);
  const outbound = rows.filter(r => ["out", "sale", "transfer_out", "adjust_out"].includes(r.movement_type)).reduce((s, r) => s + Math.abs(signedQty(r)), 0);
  const exceptions = rows.filter(r => ["reversal", "adjust", "adjust_out", "adjust_in"].includes(r.movement_type)).length;

  const openMovement = async (movement: Movement) => {
    setSelected(movement); setDetail(null); setDetailLoading(true);
    try {
      const sourceType = (movement.source_type ?? "").toLowerCase();
      const sourceId = movement.source_id;
      if (sourceId && (sourceType.includes("production") || movement.movement_type === "production")) {
        const [{ data: header }, { data: lines }] = await Promise.all([
          supabase.from("production_batches").select("*").eq("id", sourceId).maybeSingle(),
          supabase.from("production_batch_lines").select("*,stock_items(name,sku,unit)").eq("batch_id", sourceId).order("created_at"),
        ]);
        setDetail({ kind: "Production Batch", header, lines: lines ?? [] });
      } else if (sourceId && (sourceType.includes("transfer") || movement.movement_type.startsWith("transfer_"))) {
        const [{ data: header }, { data: lines }] = await Promise.all([
          supabase.from("inventory_transfers").select("*").eq("id", sourceId).maybeSingle(),
          supabase.from("inventory_transfer_items").select("*,stock_items(name,sku,unit)").eq("transfer_id", sourceId).order("created_at"),
        ]);
        setDetail({ kind: "Stock Transfer", header, lines: lines ?? [] });
      } else if (sourceId && (sourceType.includes("pos") || movement.movement_type === "sale")) {
        const [{ data: header }, { data: lines }] = await Promise.all([
          supabase.from("pos_sales").select("*").eq("id", sourceId).maybeSingle(),
          supabase.from("pos_sale_items").select("*").eq("sale_id", sourceId).order("created_at"),
        ]);
        setDetail({ kind: "POS Sale", header, lines: lines ?? [] });
      } else if (sourceId && sourceType.includes("purchase")) {
        const { data: header } = await supabase.from("purchase_orders").select("*").eq("id", sourceId).maybeSingle();
        setDetail({ kind: "Purchase Source", header, lines: [] });
      } else {
        setDetail({ kind: movement.movement_type === "reversal" ? "Reversal" : "Inventory Movement", header: null, lines: [] });
      }
    } catch (e: any) {
      setDetail({ kind: "Inventory Movement", header: null, lines: [] });
      toast.error(e?.message ?? "Source document could not be loaded");
    } finally { setDetailLoading(false); }
  };

  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-base font-semibold">Transaction Trail</h2><Badge variant="outline">{rows.length}</Badge></div><p className="text-xs text-muted-foreground mt-1">Click any movement to inspect its source document, lines, user, timestamps and stock effect.</p></div>
      <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
    </div>

    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <FlowMetric icon={PackageCheck} title="Opening / Production" value={opening} />
      <FlowMetric icon={ArrowDownToLine} title="Stock In" value={inbound} />
      <FlowMetric icon={ArrowUpFromLine} title="Stock Out / Sales" value={outbound} />
      <FlowMetric icon={Activity} title="Exceptions" value={exceptions} />
    </div>

    {!compact && <Card className="overflow-hidden"><CardHeader className="pb-3"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><CardTitle className="text-sm">Complete movement history</CardTitle><div className="relative md:w-80"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search item, reference, source…" /></div></div></CardHeader><CardContent className="p-0"><MovementTable rows={filtered} onOpen={openMovement} loading={loading} /></CardContent></Card>}

    {compact && <Card><CardContent className="p-3 space-y-2">{filtered.slice(0, 8).map(r => <MovementRow key={r.id} row={r} onOpen={openMovement} />)}{!loading && !filtered.length && <div className="py-6 text-center text-sm text-muted-foreground">No inventory movements recorded.</div>}</CardContent></Card>}

    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) { setSelected(null); setDetail(null); } }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Transaction Drill-down</DialogTitle></DialogHeader>
        {selected && <TransactionDetail movement={selected} detail={detail} loading={detailLoading} />}
      </DialogContent>
    </Dialog>
  </section>;
}

function FlowMetric({ icon: Icon, title, value }: { icon: any; title: string; value: number }) { return <Card><CardContent className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{title}</div><div className="mt-1 text-lg font-semibold">{value.toLocaleString()}</div></CardContent></Card>; }

function MovementTable({ rows, onOpen, loading }: { rows: Movement[]; onOpen: (r: Movement) => void; loading: boolean }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30"><tr>{["Date","Movement","Item","Location","Reference","Qty","Value","Source"].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => onOpen(r)}><td className="px-3 py-2 whitespace-nowrap">{new Date(r.transaction_date).toLocaleDateString()}</td><td className="px-3 py-2"><Badge variant="outline">{label(r.movement_type)}</Badge></td><td className="px-3 py-2"><div className="font-medium">{r.item_name}</div><div className="text-[11px] text-muted-foreground">{r.sku ?? "No SKU"}</div></td><td className="px-3 py-2">{r.location_name}</td><td className="px-3 py-2 font-medium">{r.reference ?? "—"}</td><td className={`px-3 py-2 text-right font-semibold ${signedQty(r) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{signedQty(r) > 0 ? "+" : ""}{signedQty(r)}</td><td className="px-3 py-2 text-right">{r.unit_cost == null ? "—" : fmtMoney(Math.abs(r.quantity) * r.unit_cost)}</td><td className="px-3 py-2"><span className="text-xs text-primary inline-flex items-center gap-1">Inspect <ChevronRight className="h-3 w-3" /></span></td></tr>)}{!loading && !rows.length && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No inventory movements recorded.</td></tr>}</tbody></table></div>;
}

function MovementRow({ row, onOpen }: { row: Movement; onOpen: (r: Movement) => void }) { return <button type="button" className="w-full text-left border rounded-lg p-3 hover:bg-muted/30 transition-colors" onClick={() => onOpen(row)}><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full border flex items-center justify-center"><MovementIcon type={row.movement_type} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-medium truncate">{label(row.movement_type)}</span><span className="text-xs text-muted-foreground">{row.reference ?? "No reference"}</span></div><div className="text-xs text-muted-foreground truncate">{row.item_name} · {row.location_name} · {new Date(row.transaction_date).toLocaleDateString()}</div></div><div className={`font-semibold ${signedQty(row) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{signedQty(row) > 0 ? "+" : ""}{signedQty(row)}</div><ChevronRight className="h-4 w-4 text-muted-foreground" /></div></button>; }

function MovementIcon({ type }: { type: string }) { if (type === "sale") return <ShoppingCart className="h-4 w-4" />; if (type.includes("transfer")) return <Truck className="h-4 w-4" />; if (["opening", "production", "purchase", "in", "return"].includes(type)) return <ArrowDownToLine className="h-4 w-4" />; return <Boxes className="h-4 w-4" />; }

function TransactionDetail({ movement, detail, loading }: { movement: Movement; detail: Detail; loading: boolean }) {
  const signed = signedQty(movement);
  return <div className="space-y-5">
    <div className="rounded-xl border bg-muted/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Badge>{label(movement.movement_type)}</Badge>{movement.reference && <span className="font-semibold">{movement.reference}</span>}</div><div className="text-lg font-semibold mt-2">{movement.item_name}</div><div className="text-xs text-muted-foreground">{movement.sku ?? "No SKU"} · {movement.location_name}</div></div><div className={`text-right ${signed >= 0 ? "text-emerald-700" : "text-rose-700"}`}><div className="text-xs text-muted-foreground">Stock effect</div><div className="text-2xl font-bold">{signed > 0 ? "+" : ""}{signed}</div></div></div><div className="grid gap-3 sm:grid-cols-4 mt-4"><Meta label="Transaction date" value={new Date(movement.transaction_date).toLocaleString()} /><Meta label="Recorded at" value={new Date(movement.created_at).toLocaleString()} /><Meta label="Unit cost" value={movement.unit_cost == null ? "—" : fmtMoney(movement.unit_cost)} /><Meta label="Movement value" value={movement.unit_cost == null ? "—" : fmtMoney(Math.abs(movement.quantity) * movement.unit_cost)} /></div></div>

    <div className="flex items-center gap-2 overflow-x-auto py-2"><FlowStep icon={FileText} title="Source" value={detail?.kind ?? (movement.source_type || "Inventory") } /><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /><FlowStep icon={Boxes} title="Location" value={movement.location_name || "—"} /><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /><FlowStep icon={Activity} title="Movement" value={label(movement.movement_type)} /><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /><FlowStep icon={PackageCheck} title="Result" value={`${signed > 0 ? "+" : ""}${signed} units`} /></div>

    <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Source document</CardTitle></CardHeader><CardContent>{loading ? <div className="py-6 text-center text-sm text-muted-foreground">Loading source document…</div> : detail?.header ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-4">{Object.entries(detail.header).filter(([k]) => !["id"].includes(k) && !["created_at"].includes(k)).slice(0, 12).map(([k,v]) => <Meta key={k} label={k.replaceAll("_", " ")} value={v == null ? "—" : String(v)} />)}</div>{detail.lines.length > 0 && <div className="overflow-x-auto border rounded-lg"><table className="w-full text-sm"><thead className="bg-muted/30 border-b"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit Cost</th><th className="px-3 py-2 text-right">Value</th></tr></thead><tbody>{detail.lines.map((line:any, i:number) => <tr key={line.id ?? i} className="border-b last:border-0"><td className="px-3 py-2"><div className="font-medium">{line.name ?? line.stock_items?.name ?? line.description ?? "Item"}</div><div className="text-xs text-muted-foreground">{line.sku ?? line.stock_items?.sku ?? ""}</div></td><td className="px-3 py-2 text-right">{n(line.quantity ?? line.qty ?? line.qty_received)}</td><td className="px-3 py-2 text-right">{line.unit_cost == null ? "—" : fmtMoney(n(line.unit_cost))}</td><td className="px-3 py-2 text-right">{line.unit_cost == null ? "—" : fmtMoney(n(line.quantity ?? line.qty ?? 0) * n(line.unit_cost))}</td></tr>)}</tbody></table></div>}</div> : <div className="text-sm text-muted-foreground">No linked source document was found. The movement record itself remains available below.</div>}</CardContent></Card>

    <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4" /> Audit & trace</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Meta label="Source type" value={movement.source_type || "Direct inventory movement"} /><Meta label="Source ID" value={movement.source_id || "—"} /><Meta label="User / creator" value={movement.user_id || movement.created_by || "—"} /></div>{movement.note && <div className="mt-4 rounded-lg border p-3 text-sm"><span className="font-medium">Note:</span> {movement.note}</div>}</CardContent></Card>
  </div>;
}

function FlowStep({ icon: Icon, title, value }: { icon: any; title: string; value: string }) { return <div className="min-w-[145px] rounded-lg border bg-background p-3"><Icon className="h-4 w-4 text-primary" /><div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-2">{title}</div><div className="text-xs font-semibold mt-1 truncate" title={value}>{value}</div></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-xs font-medium mt-1 break-words">{value}</div></div>; }
