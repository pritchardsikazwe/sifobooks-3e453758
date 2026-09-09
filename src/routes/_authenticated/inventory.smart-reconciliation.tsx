import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, Camera, CheckCircle2, ClipboardCheck,
  History, Minus, Package, Plus, RefreshCw, ScanLine, Search, ShieldCheck,
  Smartphone, Warehouse, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { fmtMoney } from "@/lib/format";
import { currentUserId, fetchBalances, fetchLocations, type BalanceRow, type Location } from "@/lib/multi-location";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory/smart-reconciliation")({
  head: () => ({ meta: [
    { title: "Smart Reconciliation Centre — SifoBooks" },
    { name: "description", content: "Transaction-backed physical stock counts, stock cards, variance investigation and manager approval." },
    { name: "robots", content: "noindex" },
  ]}),
  component: SmartReconciliationPage,
});

type Session = {
  id: string; count_number: string | null; count_date: string; location_id: string | null;
  session_name: string | null; workflow_status: string; status: string; counted_by: string | null;
  approved_by: string | null; approved_at: string | null; notes: string | null;
  rejection_reason: string | null; recount_of_count_id: string | null;
};

type Line = {
  id: string; item_id: string; location_id: string | null; expected_qty: number;
  counted_qty: number | null; variance: number; reason_code: string | null;
  counted_at: string | null; counted_by: string | null; edit_count: number;
  stock_items?: { name: string; sku: string | null; unit: string; cost_price: number; sell_price: number } | null;
};

type Product = { id: string; name: string; sku: string | null; unit: string; cost_price: number; sell_price: number };

const statusLabel: Record<string, string> = {
  DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", "UNDER REVIEW": "UNDER REVIEW",
  APPROVED: "APPROVED", REJECTED: "REJECTED", COMPLETED: "COMPLETED",
};

function statusClass(status: string) {
  if (status === "COMPLETED" || status === "APPROVED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
  if (status === "SUBMITTED" || status === "UNDER REVIEW") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-muted text-muted-foreground";
}

function stockState(qty: number, reorder: number) {
  if (qty <= 0) return { label: "Out of stock", className: "bg-red-100 text-red-700" };
  if (reorder > 0 && qty <= reorder) return { label: "Low stock", className: "bg-amber-100 text-amber-800" };
  return { label: "In stock", className: "bg-emerald-100 text-emerald-700" };
}

function SmartReconciliationPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [scope, setScope] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [startOpen, setStartOpen] = useState(false);
  const [start, setStart] = useState({ location_id: "", count_date: new Date().toISOString().slice(0, 10), session_name: "", notes: "" });
  const [search, setSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [countQty, setCountQty] = useState("");
  const [reason, setReason] = useState("count_variance");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [detailProduct, setDetailProduct] = useState<BalanceRow | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanStream = useRef<MediaStream | null>(null);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const locationName = useCallback((id: string | null) => locations.find((l) => l.id === id)?.name ?? "All locations", [locations]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locs, ss, ps] = await Promise.all([
        fetchLocations(true),
        supabase.from("stock_counts").select("id,count_number,count_date,location_id,session_name,workflow_status,status,counted_by,approved_by,approved_at,notes,rejection_reason,recount_of_count_id").order("count_date", { ascending: false }).limit(200),
        supabase.from("stock_items").select("id,name,sku,unit,cost_price,sell_price").order("name").limit(5000),
      ]);
      if (ss.error) throw ss.error;
      if (ps.error) throw ps.error;
      setLocations(locs);
      setSessions((ss.data ?? []) as Session[]);
      setProducts((ps.data ?? []) as Product[]);
      const stockLocation = locationFilter !== "all" ? locationFilter : undefined;
      setBalances(await fetchBalances(stockLocation));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load Smart Reconciliation");
    } finally { setLoading(false); }
  }, [locationFilter]);

  const loadLines = useCallback(async (id: string) => {
    if (!id) { setLines([]); return; }
    const { data, error } = await supabase.from("stock_count_lines")
      .select("id,item_id,location_id,expected_qty,counted_qty,variance,reason_code,counted_at,counted_by,edit_count,stock_items(name,sku,unit,cost_price,sell_price)")
      .eq("count_id", id).order("created_at");
    if (error) { toast.error(error.message); return; }
    setLines((data ?? []) as unknown as Line[]);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadLines(selectedId); }, [selectedId, loadLines]);

  const scopedLocations = useMemo(() => scope === "all" ? locations : locations.filter((l) => l.location_type === scope), [locations, scope]);
  const scopedIds = useMemo(() => new Set(scopedLocations.map((l) => l.id)), [scopedLocations]);
  const scopedSessions = useMemo(() => sessions.filter((s) => !s.location_id || scopedIds.has(s.location_id)), [sessions, scopedIds]);

  const counted = lines.filter((l) => l.counted_qty != null);
  const matched = counted.filter((l) => Number(l.counted_qty) === Number(l.expected_qty));
  const variances = counted.filter((l) => Number(l.counted_qty) !== Number(l.expected_qty));
  const shortageValue = variances.filter((l) => Number(l.counted_qty) < Number(l.expected_qty)).reduce((s, l) => s + Math.abs(Number(l.variance)) * Number(l.stock_items?.cost_price ?? 0), 0);
  const excessValue = variances.filter((l) => Number(l.counted_qty) > Number(l.expected_qty)).reduce((s, l) => s + Number(l.variance) * Number(l.stock_items?.cost_price ?? 0), 0);
  const critical = variances.filter((l) => Math.abs(Number(l.variance)) * Number(l.stock_items?.cost_price ?? 0) >= 1000).length;
  const progress = lines.length ? Math.round((counted.length / lines.length) * 100) : 0;
  const accuracy = counted.length ? (matched.length / counted.length) * 100 : 0;
  const pending = sessions.filter((s) => s.workflow_status === "SUBMITTED" || s.workflow_status === "UNDER REVIEW").length;
  const completed = sessions.filter((s) => s.workflow_status === "COMPLETED").length;
  const totalVarianceValue = variances.reduce((s, l) => s + Number(l.variance) * Number(l.stock_items?.cost_price ?? 0), 0);

  const [cashVariance, setCashVariance] = useState(0);
  useEffect(() => {
    supabase.from("pos_end_of_day").select("cash_variance,status").in("status", ["submitted", "approved", "closed", "reopened"]).then(({ data }) => {
      setCashVariance((data ?? []).reduce((s: number, r: { cash_variance?: number }) => s + Number(r.cash_variance ?? 0), 0));
    });
  }, [sessions.length]);

  const stockRows = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return balances.filter((b) => !q || b.name.toLowerCase().includes(q) || (b.sku ?? "").toLowerCase().includes(q));
  }, [balances, stockSearch]);

  const stockTotals = useMemo(() => ({
    units: balances.reduce((s, b) => s + Number(b.quantity), 0),
    cost: balances.reduce((s, b) => s + Number(b.quantity) * Number(b.cost_price), 0),
    retail: balances.reduce((s, b) => s + Number(b.quantity) * Number(b.sell_price), 0),
    low: balances.filter((b) => Number(b.quantity) <= Number(b.reorder_level) && Number(b.reorder_level) > 0).length,
  }), [balances]);

  const startSession = async () => {
    if (!start.location_id) return toast.error("Choose the location being counted");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("smart_reconciliation_start", {
        _location_id: start.location_id, _count_date: start.count_date,
        _session_name: start.session_name || `Stock count — ${start.count_date}`,
        _notes: start.notes || null,
      } as never);
      if (error) throw error;
      setStartOpen(false); setSelectedId(String(data)); setTab("count");
      toast.success("Count session started — live inventory was not changed");
      await load(); await loadLines(String(data));
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Could not start count"); }
    finally { setBusy(false); }
  };

  const saveLine = async (line: Line, qty: number) => {
    if (!selected || selected.workflow_status === "APPROVED" || selected.workflow_status === "COMPLETED") return;
    if (!Number.isFinite(qty) || qty < 0) return toast.error("Enter a valid physical quantity");
    const variance = qty - Number(line.expected_qty);
    const uid = await currentUserId();
    const countedAt = new Date().toISOString();
    const { error } = await supabase.from("stock_count_lines").update({
      counted_qty: qty, variance, reason_code: variance === 0 ? null : reason,
      counted_at: countedAt, counted_by: uid, edit_count: Number(line.edit_count ?? 0) + 1,
    } as never).eq("id", line.id);
    if (error) return toast.error(error.message);
    setLines((prev) => prev.map((l) => l.id === line.id ? { ...l, counted_qty: qty, variance, reason_code: variance === 0 ? null : reason, counted_at: countedAt, edit_count: Number(l.edit_count ?? 0) + 1 } : l));
  };

  const scanProduct = (value: string) => {
    const q = value.trim().toLowerCase();
    if (!q) return;
    const product = products.find((p) => (p.sku ?? "").toLowerCase() === q)
      ?? products.find((p) => p.name.toLowerCase() === q)
      ?? products.find((p) => (p.sku ?? "").toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    if (!product) return toast.error("Product not found. Try the SKU or product name.");
    const line = lines.find((l) => l.item_id === product.id);
    if (!line) return toast.error("This product is not part of the selected location count.");
    setActiveProduct(product); setCountQty(line.counted_qty == null ? "" : String(line.counted_qty));
    setScannerOpen(false); setScanValue("");
  };

  const saveScannedCount = async () => {
    if (!activeProduct) return;
    const line = lines.find((l) => l.item_id === activeProduct.id);
    if (!line) return;
    await saveLine(line, Number(countQty));
    setActiveProduct(null); setCountQty(""); setTab("count");
    window.setTimeout(() => document.getElementById("smart-scan-input")?.focus(), 50);
  };

  const stopCamera = useCallback(() => {
    scanStream.current?.getTracks().forEach((t) => t.stop());
    scanStream.current = null;
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      scanStream.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const Detector = (window as unknown as { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (!Detector) return toast.info("Camera barcode detection is unavailable. Use the SKU scanner field.");
      const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e"] });
      const tick = async () => {
        if (!videoRef.current || !scanStream.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue) { scanProduct(found[0].rawValue); stopCamera(); return; }
        } catch { /* transient camera decode errors are ignored */ }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Camera permission was not granted"); }
  };

  useEffect(() => stopCamera, [stopCamera]);

  const callAction = async (fn: string, args: Record<string, unknown>, success: string) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc(fn, args as never);
      if (error) throw error;
      toast.success(success); await load(); await loadLines(selectedId);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusy(false); }
  };

  const reject = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("smart_reconciliation_reject", { _count_id: selectedId, _reason: rejectReason } as never);
      if (error) throw error;
      setRejectOpen(false); setRejectReason(""); toast.success("Reconciliation rejected"); await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Rejection failed"); }
    finally { setBusy(false); }
  };

  const post = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("post_stock_count", { _count_id: selectedId } as never);
      if (error) throw error;
      toast.success(`Completed — ${Number((data as { lines_applied?: number } | null)?.lines_applied ?? 0)} approved adjustment(s) posted`);
      await load(); await loadLines(selectedId);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Could not post approved adjustments"); }
    finally { setBusy(false); }
  };

  const recount = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("smart_reconciliation_request_recount", { _count_id: selectedId } as never);
      if (error) throw error;
      setSelectedId(String(data)); setTab("count"); toast.success("Recount session created; the original count remains in history"); await load(); await loadLines(String(data));
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Could not create recount"); }
    finally { setBusy(false); }
  };

  const filteredLines = useMemo(() => lines.filter((l) => {
    const q = search.toLowerCase();
    return !q || l.stock_items?.name?.toLowerCase().includes(q) || (l.stock_items?.sku ?? "").toLowerCase().includes(q);
  }), [lines, search]);

  const lineColumns: DTColumn<Line>[] = [
    { key: "product", header: "Product", sticky: true, sortable: true, accessor: (l) => l.stock_items?.name ?? "—", cell: (l) => <div><div className="font-medium">{l.stock_items?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{l.stock_items?.sku ?? "No SKU"}</div></div> },
    { key: "unit", header: "Unit", cell: (l) => l.stock_items?.unit ?? "—" },
    { key: "expected_qty", header: "System Qty", align: "right" },
    { key: "counted_qty", header: "Physical", align: "right", cell: (l) => <span className="font-semibold">{l.counted_qty == null ? "—" : l.counted_qty}</span> },
    { key: "variance", header: "Variance", align: "right", cell: (l) => l.counted_qty == null ? "—" : <span className={Number(l.variance) === 0 ? "text-emerald-600" : Number(l.variance) < 0 ? "text-destructive" : "text-amber-700"}>{Number(l.variance) > 0 ? `+${l.variance}` : l.variance}</span> },
    { key: "cost", header: "Cost", align: "right", cell: (l) => fmtMoney(Number(l.stock_items?.cost_price ?? 0)) },
    { key: "variance_value", header: "Variance Value", align: "right", cell: (l) => l.counted_qty == null ? "—" : fmtMoney(Number(l.variance) * Number(l.stock_items?.cost_price ?? 0)) },
    { key: "reason", header: "Reason", cell: (l) => l.reason_code ?? "—" },
    { key: "action", header: "", cell: (l) => selected?.workflow_status === "DRAFT" || selected?.workflow_status === "REJECTED" ? <Button size="sm" variant="ghost" onClick={() => { setActiveProduct({ id: l.item_id, name: l.stock_items?.name ?? "", sku: l.stock_items?.sku ?? null, unit: l.stock_items?.unit ?? "", cost_price: Number(l.stock_items?.cost_price ?? 0), sell_price: Number(l.stock_items?.sell_price ?? 0) }); setCountQty(l.counted_qty == null ? "" : String(l.counted_qty)); }}>Edit</Button> : null },
  ];

  const sessionColumns: DTColumn<Session>[] = [
    { key: "count_number", header: "Session", sticky: true },
    { key: "session_name", header: "Name" },
    { key: "count_date", header: "Date", sortable: true },
    { key: "location_id", header: "Location", cell: (s) => locationName(s.location_id) },
    { key: "workflow_status", header: "Status", cell: (s) => <Badge className={statusClass(s.workflow_status)}>{statusLabel[s.workflow_status] ?? s.workflow_status}</Badge> },
    { key: "rejection_reason", header: "Review note" },
  ];

  const stockColumns: DTColumn<BalanceRow>[] = [
    { key: "name", header: "Stock Item", sticky: true, sortable: true, accessor: (r) => r.name, cell: (r) => <button className="flex min-w-[190px] items-center gap-3 text-left" onClick={() => setDetailProduct(r)}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></div><div><div className="font-semibold">{r.name}</div><div className="text-xs text-muted-foreground">{r.sku ?? "No SKU"} · {r.unit}</div></div></button> },
    { key: "quantity", header: "On Hand", align: "right", sortable: true, cell: (r) => <span className="font-bold tabular-nums">{Number(r.quantity).toLocaleString()}</span> },
    { key: "reorder_level", header: "Reorder", align: "right", cell: (r) => r.reorder_level ? Number(r.reorder_level).toLocaleString() : "—" },
    { key: "cost_price", header: "Cost", align: "right", cell: (r) => fmtMoney(r.cost_price) },
    { key: "stock_value", header: "Stock Value", align: "right", accessor: (r) => Number(r.quantity) * Number(r.cost_price), cell: (r) => <span className="font-medium">{fmtMoney(Number(r.quantity) * Number(r.cost_price))}</span> },
    { key: "status", header: "Status", cell: (r) => { const s = stockState(Number(r.quantity), Number(r.reorder_level)); return <Badge className={s.className}>{s.label}</Badge>; } },
    { key: "flags", header: "Review", cell: (r) => r.needs_cost_review || r.needs_unit_verification ? <Badge variant="outline" className="border-amber-300 text-amber-700">Review master</Badge> : <span className="text-xs text-muted-foreground">OK</span> },
  ];

  return <div className="space-y-4 pb-8">
    <SifoModuleHeader module="inventory" title="Smart Reconciliation Centre" description="Scan, compare and investigate stock while keeping live inventory unchanged until an approved adjustment is posted." icon={ClipboardCheck} actions={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <SifoKpiCard module="inventory" icon={Package} label="Products Counted" value={String(counted.length)} hint={`${progress}% of current session`} />
      <SifoKpiCard module="inventory" icon={CheckCircle2} label="Matched" value={String(matched.length)} hint={counted.length ? `${accuracy.toFixed(1)}% accuracy` : "No counts yet"} />
      <SifoKpiCard module="inventory" icon={AlertTriangle} label="Variances" value={String(variances.length)} hint="Physical vs system" />
      <SifoKpiCard module="inventory" icon={XCircle} label="Critical" value={String(critical)} hint="≥ K1,000 at cost" />
      <SifoKpiCard module="inventory" icon={ShieldCheck} label="Pending Approval" value={String(pending)} hint="Manager action" />
      <SifoKpiCard module="inventory" icon={ArrowDown} label="Stock Value Variance" value={fmtMoney(totalVarianceValue)} hint="At cost" />
      <SifoKpiCard module="inventory" icon={ClipboardCheck} label="Cash Variances" value={fmtMoney(cashVariance)} hint="EOD records" />
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card to-primary/[0.04]">
        <CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-widest text-primary">Inventory control centre</div><h2 className="mt-1 text-xl font-bold">Stock position at a glance</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Use the stock list to inspect quantities, cost value and low-stock conditions before starting a physical count.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Warehouse className="h-6 w-6" /></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border bg-background/80 p-3"><div className="text-xs text-muted-foreground">Units on hand</div><div className="mt-1 text-2xl font-bold tabular-nums">{stockTotals.units.toLocaleString()}</div></div><div className="rounded-xl border bg-background/80 p-3"><div className="text-xs text-muted-foreground">Inventory cost</div><div className="mt-1 text-2xl font-bold">{fmtMoney(stockTotals.cost)}</div></div><div className="rounded-xl border bg-background/80 p-3"><div className="text-xs text-muted-foreground">Low-stock items</div><div className="mt-1 text-2xl font-bold text-amber-700">{stockTotals.low}</div></div></div></CardContent>
      </Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Location stock</CardTitle></CardHeader><CardContent className="space-y-2">{locations.filter((l) => l.location_type !== "transit").slice(0, 5).map((l) => { const units = balances.filter((b) => b.location_id === l.id).reduce((s, b) => s + Number(b.quantity), 0); return <button key={l.id} className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition hover:bg-muted/40" onClick={() => setLocationFilter(l.id)}><span><span className="block font-medium">{l.name}</span><span className="text-xs text-muted-foreground">{l.location_type}</span></span><span className="font-bold tabular-nums">{units.toLocaleString()}</span></button>; })}</CardContent></Card>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => setStartOpen(true)}><ClipboardCheck className="mr-2 h-4 w-4" />START STOCK COUNT</Button>
      <Button variant="outline" onClick={() => { setTab("scan"); window.setTimeout(() => document.getElementById("smart-scan-input")?.focus(), 50); }}><ScanLine className="mr-2 h-4 w-4" />SCAN PRODUCT</Button>
      <Button variant="outline" onClick={() => setTab("count")} disabled={!selectedId}><History className="mr-2 h-4 w-4" />CONTINUE COUNT</Button>
      <Button variant="outline" onClick={() => setTab("variances")}><AlertTriangle className="mr-2 h-4 w-4" />VIEW VARIANCES</Button>
      <Button variant="outline" onClick={() => setTab("approval")}><ShieldCheck className="mr-2 h-4 w-4" />APPROVAL CENTRE</Button>
    </div>

    <Card><CardContent className="flex flex-wrap items-center gap-3 p-3"><div className="text-sm font-semibold">Reconciliation scope</div><Select value={scope} onValueChange={setScope}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Entire company</SelectItem><SelectItem value="branch">Branches</SelectItem><SelectItem value="warehouse">Warehouses</SelectItem><SelectItem value="outlet">Stores / POS</SelectItem><SelectItem value="store">Stock rooms</SelectItem><SelectItem value="transit">Stock in transit</SelectItem></SelectContent></Select><div className="h-5 w-px bg-border" /><Select value={locationFilter} onValueChange={setLocationFilter}><SelectTrigger className="w-[210px]"><SelectValue placeholder="All locations" /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select><span className="text-xs text-muted-foreground">{scopedLocations.length} locations · {scopedSessions.length} sessions</span></CardContent></Card>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="stock">Stock List</TabsTrigger><TabsTrigger value="count">Count</TabsTrigger><TabsTrigger value="scan">Scan</TabsTrigger><TabsTrigger value="variances">Variances</TabsTrigger><TabsTrigger value="approval">Approval</TabsTrigger></TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-base">Stock Accuracy</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between"><div className="text-4xl font-bold">{accuracy.toFixed(1)}%</div><Badge className="bg-emerald-100 text-emerald-700">{matched.length} matched</Badge></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, accuracy)}%` }} /></div><div className="mt-2 text-xs text-muted-foreground">Matched physical counts ÷ counted products</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Variance Value</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4"><div className="rounded-xl bg-red-50 p-3"><div className="text-xs text-red-700">Shortage</div><div className="mt-1 text-xl font-bold text-red-700">{fmtMoney(shortageValue)}</div></div><div className="rounded-xl bg-amber-50 p-3"><div className="text-xs text-amber-700">Excess</div><div className="mt-1 text-xl font-bold text-amber-700">{fmtMoney(excessValue)}</div></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Workflow</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg border p-2">Draft <b className="float-right">{sessions.filter((s) => s.workflow_status === "DRAFT").length}</b></div><div className="rounded-lg border p-2">Review <b className="float-right">{pending}</b></div><div className="rounded-lg border p-2">Approved <b className="float-right">{sessions.filter((s) => s.workflow_status === "APPROVED").length}</b></div><div className="rounded-lg border p-2">Completed <b className="float-right">{completed}</b></div></CardContent></Card>
        </div>
        <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Recent Variances</CardTitle><Button variant="ghost" size="sm" onClick={() => setTab("variances")}>View all</Button></CardHeader><CardContent className="p-0"><DataTable tableId="smart-recent-variances" data={variances.slice(0, 8)} columns={lineColumns.filter((c) => ["product","expected_qty","counted_qty","variance","variance_value","reason"].includes(String(c.key)))} loading={loading} searchPlaceholder="Search variance products…" empty="No recent variances." /></CardContent></Card>
        <DataTable tableId="smart-reconciliation-sessions" data={scopedSessions} columns={sessionColumns} loading={loading} onRowClick={(s) => { setSelectedId(s.id); setTab("count"); }} searchPlaceholder="Search sessions, locations or dates…" empty="No reconciliation sessions yet. Start a stock count to begin." />
      </TabsContent>

      <TabsContent value="stock" className="space-y-4">
        <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="text-xs font-semibold uppercase tracking-widest text-primary">Live stock list</div><h2 className="text-lg font-bold">Products and location balances</h2><p className="text-sm text-muted-foreground">Inventory values use cost price. Click a product for its investigation card.</p></div><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Search stock, SKU…" /></div></CardContent></Card>
        <div className="grid gap-3 sm:grid-cols-3"><SifoKpiCard module="inventory" label="Items in list" value={String(stockRows.length)} /><SifoKpiCard module="inventory" label="Cost value" value={fmtMoney(stockTotals.cost)} hint="Current location scope" /><SifoKpiCard module="inventory" label="Retail value" value={fmtMoney(stockTotals.retail)} hint="Reference only" /></div>
        <div className="grid gap-3 sm:hidden">{stockRows.map((r) => { const s = stockState(Number(r.quantity), Number(r.reorder_level)); return <button key={`${r.location_id}-${r.item_id}`} className="rounded-2xl border bg-card p-4 text-left shadow-sm" onClick={() => setDetailProduct(r)}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></div><div><div className="font-semibold">{r.name}</div><div className="text-xs text-muted-foreground">{r.sku ?? "No SKU"} · {locationName(r.location_id)}</div></div></div><Badge className={s.className}>{s.label}</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><div className="text-xs text-muted-foreground">On hand</div><div className="font-bold">{Number(r.quantity).toLocaleString()}</div></div><div><div className="text-xs text-muted-foreground">Cost</div><div className="font-medium">{fmtMoney(r.cost_price)}</div></div><div><div className="text-xs text-muted-foreground">Value</div><div className="font-medium">{fmtMoney(Number(r.quantity) * Number(r.cost_price))}</div></div></div></button>; })}</div>
        <div className="hidden sm:block"><DataTable tableId="smart-stock-list" data={stockRows} columns={stockColumns} loading={loading} searchPlaceholder={null} empty="No stock items match this scope." onRowClick={setDetailProduct} totals={(rows) => ({ quantity: rows.reduce((s, r) => s + Number(r.quantity), 0).toLocaleString(), stock_value: fmtMoney(rows.reduce((s, r) => s + Number(r.quantity) * Number(r.cost_price), 0)) })} /></div>
      </TabsContent>

      <TabsContent value="count" className="space-y-4">{!selected ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a count session from Overview, or start a new stock count.</CardContent></Card> : <><Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="text-xs uppercase tracking-widest text-muted-foreground">Active count</div><div className="font-semibold">{selected.session_name ?? selected.count_number}</div><div className="text-sm text-muted-foreground">{selected.count_date} · {locationName(selected.location_id)}</div></div><div className="flex items-center gap-2"><Badge className={statusClass(selected.workflow_status)}>{statusLabel[selected.workflow_status]}</Badge>{selected.recount_of_count_id && <Badge variant="outline">RECOUNT</Badge>}</div></CardContent></Card><div className="grid gap-3 sm:grid-cols-4"><SifoKpiCard module="inventory" label="Progress" value={`${counted.length} / ${lines.length}`} hint={`${progress}% counted`} /><SifoKpiCard module="inventory" label="Matched" value={String(matched.length)} /><SifoKpiCard module="inventory" label="Variances" value={String(variances.length)} /><SifoKpiCard module="inventory" label="Variance Value" value={fmtMoney(totalVarianceValue)} /></div><div className="flex flex-wrap gap-2"><Input className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product / SKU…" /><Button variant="outline" onClick={() => setTab("scan")}><ScanLine className="mr-2 h-4 w-4" />Fast scan</Button>{(selected.workflow_status === "DRAFT" || selected.workflow_status === "REJECTED") && <Button onClick={() => void callAction("smart_reconciliation_submit", { _count_id: selectedId }, "Count submitted for manager review")} disabled={busy || counted.length === 0}><CheckCircle2 className="mr-2 h-4 w-4" />Submit for review</Button>}{selected.workflow_status === "SUBMITTED" && <Button variant="outline" onClick={() => void callAction("smart_reconciliation_review", { _count_id: selectedId }, "Session moved to manager review")} disabled={busy}>Open review</Button>}{selected.workflow_status === "UNDER REVIEW" && <><Button variant="outline" onClick={recount} disabled={busy}>Request recount</Button><Button variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}><XCircle className="mr-2 h-4 w-4" />Reject</Button><Button onClick={() => void callAction("smart_reconciliation_approve", { _count_id: selectedId }, "Reconciliation approved — variances are ready to post")} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4" />Approve</Button></>}{selected.workflow_status === "APPROVED" && <Button onClick={post} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4" />Post approved adjustments</Button>}</div><DataTable tableId={`smart-count-${selected.id}`} data={filteredLines} columns={lineColumns} loading={loading} searchPlaceholder="Search products…" empty="No count lines." /></>}</TabsContent>

      <TabsContent value="scan" className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-5 w-5" />Fast product scanning</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"><Input id="smart-scan-input" autoFocus value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") scanProduct(scanValue); }} placeholder="Scan barcode / enter SKU / product name…" /><Button onClick={() => scanProduct(scanValue)}><Search className="mr-2 h-4 w-4" />Find</Button><Button variant="outline" onClick={() => { setScannerOpen(true); window.setTimeout(() => void startCamera(), 150); }}><Camera className="mr-2 h-4 w-4" />Camera</Button></div><div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"><Smartphone className="mr-2 inline h-4 w-4" />USB and Bluetooth scanners behave like a keyboard: scan, press Enter, count, save. The workflow returns directly to the scanner.</div></CardContent></Card>{activeProduct && <Card><CardHeader><CardTitle>{activeProduct.name}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-4"><div><div className="text-xs text-muted-foreground">SKU</div><div className="font-medium">{activeProduct.sku ?? "—"}</div></div><div><div className="text-xs text-muted-foreground">System quantity</div><div className="font-medium">{lines.find((l) => l.item_id === activeProduct.id)?.expected_qty ?? 0}</div></div><div><div className="text-xs text-muted-foreground">Cost</div><div className="font-medium">{fmtMoney(activeProduct.cost_price)}</div></div><div><div className="text-xs text-muted-foreground">Selling price</div><div className="font-medium">{fmtMoney(activeProduct.sell_price)}</div></div></div><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label>Physical quantity</Label><Input className="mt-2 h-14 text-2xl" type="number" min="0" value={countQty} onChange={(e) => setCountQty(e.target.value)} autoFocus /></div><div className="flex items-end gap-2"><Button variant="outline" size="lg" onClick={() => setCountQty(String(Math.max(0, Number(countQty || 0) - 1)))}><Minus /></Button><Button variant="outline" size="lg" onClick={() => setCountQty(String(Number(countQty || 0) + 1))}><Plus /></Button><Button size="lg" onClick={() => void saveScannedCount()} disabled={!selected || selected.workflow_status === "APPROVED" || selected.workflow_status === "COMPLETED"}>Save Count</Button></div></div></CardContent></Card>}</TabsContent>

      <TabsContent value="variances" className="space-y-4"><Card><CardHeader><CardTitle>Variance Investigation</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Shortages</div><div className="mt-1 flex items-center gap-2 text-xl font-bold text-red-700"><ArrowDown className="h-4 w-4" />{fmtMoney(shortageValue)}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Excess</div><div className="mt-1 flex items-center gap-2 text-xl font-bold text-amber-700"><ArrowUp className="h-4 w-4" />{fmtMoney(excessValue)}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Critical items</div><div className="mt-1 text-xl font-bold">{critical}</div></div></CardContent></Card><DataTable tableId="smart-variance-lines" data={variances} columns={lineColumns.filter((c) => ["product","expected_qty","counted_qty","variance","cost","variance_value","reason"].includes(String(c.key)))} loading={loading} searchPlaceholder="Search variance products…" empty="No variances in the selected count." /></TabsContent>

      <TabsContent value="approval" className="space-y-4"><Card><CardHeader><CardTitle>Manager Approval Centre</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Approval is enforced by the database. The counter cannot approve their own reconciliation. Approved variances are posted through the existing stock adjustment engine.</CardContent></Card><DataTable tableId="smart-approval-sessions" data={sessions.filter((s) => ["SUBMITTED","UNDER REVIEW"].includes(s.workflow_status))} columns={sessionColumns} loading={loading} onRowClick={(s) => { setSelectedId(s.id); setTab("count"); }} searchPlaceholder="Search pending approvals…" empty="No pending reconciliation approvals." /></TabsContent>
    </Tabs>

    <Dialog open={startOpen} onOpenChange={setStartOpen}><DialogContent><DialogHeader><DialogTitle>Start Stock Count</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Location</Label><Select value={start.location_id} onValueChange={(v) => setStart((x) => ({ ...x, location_id: v }))}><SelectTrigger className="mt-2"><SelectValue placeholder="Choose location" /></SelectTrigger><SelectContent>{locations.filter((l) => l.location_type !== "transit").map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Count date</Label><Input className="mt-2" type="date" value={start.count_date} onChange={(e) => setStart((x) => ({ ...x, count_date: e.target.value }))} /></div><div><Label>Session name</Label><Input className="mt-2" value={start.session_name} onChange={(e) => setStart((x) => ({ ...x, session_name: e.target.value }))} placeholder="e.g. Chibombo September opening count" /></div><div><Label>Notes</Label><Textarea className="mt-2" value={start.notes} onChange={(e) => setStart((x) => ({ ...x, notes: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setStartOpen(false)}>Cancel</Button><Button onClick={() => void startSession()} disabled={busy}>Start counting</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}><DialogContent><DialogHeader><DialogTitle>Reject reconciliation</DialogTitle></DialogHeader><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why the count must be corrected or recounted…" /><DialogFooter><Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => void reject()} disabled={busy || !rejectReason.trim()}>Reject</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={scannerOpen} onOpenChange={(open) => { setScannerOpen(open); if (!open) stopCamera(); }}><DialogContent><DialogHeader><DialogTitle>Camera barcode scanner</DialogTitle></DialogHeader><div className="overflow-hidden rounded-2xl bg-black"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /></div><div className="text-sm text-muted-foreground">Point the camera at the barcode. If camera detection is unavailable, close this window and use the SKU scanner field.</div></DialogContent></Dialog>

    <Dialog open={Boolean(detailProduct)} onOpenChange={(open) => { if (!open) setDetailProduct(null); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Product Variance Investigation</DialogTitle></DialogHeader>{detailProduct && <div className="space-y-5"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Package className="h-7 w-7" /></div><div><div className="text-lg font-bold">{detailProduct.name}</div><div className="text-sm text-muted-foreground">{detailProduct.sku ?? "No SKU"} · {detailProduct.unit} · {locationName(detailProduct.location_id)}</div></div><Badge className="ml-auto bg-emerald-100 text-emerald-700">{stockState(Number(detailProduct.quantity), Number(detailProduct.reorder_level)).label}</Badge></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">System Qty</div><div className="mt-1 text-xl font-bold">{Number(detailProduct.quantity).toLocaleString()}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Reorder</div><div className="mt-1 text-xl font-bold">{Number(detailProduct.reorder_level).toLocaleString()}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Cost</div><div className="mt-1 text-xl font-bold">{fmtMoney(detailProduct.cost_price)}</div></div><div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">Stock Value</div><div className="mt-1 text-xl font-bold">{fmtMoney(Number(detailProduct.quantity) * Number(detailProduct.cost_price))}</div></div></div><div className="rounded-xl border bg-muted/20 p-4"><div className="font-semibold">Investigation checklist</div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>✓ Check posted sales</div><div>✓ Check transfer history</div><div>✓ Check returns and adjustments</div><div>✓ Compare physical count</div></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setDetailProduct(null); setTab("stock"); }}>Close</Button><Button onClick={() => { setDetailProduct(null); setTab("count"); }}>Open count</Button></div></div>}</DialogContent></Dialog>
  </div>;
}
