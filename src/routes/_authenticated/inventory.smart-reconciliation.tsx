import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Camera, CheckCircle2, ClipboardCheck, History, Minus, Plus,
  RefreshCw, ScanLine, Search, ShieldCheck, Smartphone, XCircle,
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
import { currentUserId, fetchLocations, type Location } from "@/lib/multi-location";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory/smart-reconciliation")({
  head: () => ({ meta: [
    { title: "Smart Reconciliation Centre — SifoBooks" },
    { name: "description", content: "Transaction-backed physical stock counts, variance investigation and manager approval." },
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
  if (status === "COMPLETED" || status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (status === "REJECTED") return "bg-red-100 text-red-800";
  if (status === "SUBMITTED" || status === "UNDER REVIEW") return "bg-amber-100 text-amber-900";
  return "bg-muted text-muted-foreground";
}

function SmartReconciliationPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [scope, setScope] = useState("all");
  const [startOpen, setStartOpen] = useState(false);
  const [start, setStart] = useState({ location_id: "", count_date: new Date().toISOString().slice(0, 10), session_name: "", notes: "" });
  const [search, setSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [countQty, setCountQty] = useState("");
  const [reason, setReason] = useState("count_variance");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
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
    } catch (e: any) {
      toast.error(e.message ?? "Could not load Smart Reconciliation");
    } finally { setLoading(false); }
  }, []);

  const loadLines = useCallback(async (id: string) => {
    if (!id) { setLines([]); return; }
    const { data, error } = await supabase.from("stock_count_lines")
      .select("id,item_id,location_id,expected_qty,counted_qty,variance,reason_code,counted_at,counted_by,edit_count,stock_items(name,sku,unit,cost_price,sell_price)")
      .eq("count_id", id).order("created_at");
    if (error) return toast.error(error.message);
    setLines((data ?? []) as unknown as Line[]);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadLines(selectedId); }, [selectedId, loadLines]);

  const scopedLocations = useMemo(() => {
    if (scope === "all") return locations;
    return locations.filter((l) => l.location_type === scope);
  }, [locations, scope]);
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
      setCashVariance((data ?? []).reduce((s: number, r: any) => s + Number(r.cash_variance ?? 0), 0));
    });
  }, [sessions.length]);

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
      setStartOpen(false); setSelectedId(String(data));
      setTab("count");
      toast.success("Count session started — live inventory was not changed");
      await load(); await loadLines(String(data));
    } catch (e: any) { toast.error(e.message ?? "Could not start count"); }
    finally { setBusy(false); }
  };

  const saveLine = async (line: Line, qty: number) => {
    if (!selected || selected.workflow_status === "APPROVED" || selected.workflow_status === "COMPLETED") return;
    if (!Number.isFinite(qty) || qty < 0) return toast.error("Enter a valid physical quantity");
    const variance = qty - Number(line.expected_qty);
    const uid = await currentUserId();
    const { error } = await supabase.from("stock_count_lines").update({
      counted_qty: qty, variance, reason_code: variance === 0 ? null : reason,
      counted_at: new Date().toISOString(), counted_by: uid, edit_count: Number(line.edit_count ?? 0) + 1,
    } as never).eq("id", line.id);
    if (error) return toast.error(error.message);
    setLines((prev) => prev.map((l) => l.id === line.id ? { ...l, counted_qty: qty, variance, reason_code: variance === 0 ? null : reason, counted_at: new Date().toISOString(), edit_count: Number(l.edit_count ?? 0) + 1 } : l));
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
    setActiveProduct(product);
    setCountQty(line.counted_qty == null ? "" : String(line.counted_qty));
    setScannerOpen(false);
    setScanValue("");
  };

  const saveScannedCount = async () => {
    if (!activeProduct) return;
    const line = lines.find((l) => l.item_id === activeProduct.id);
    if (!line) return;
    await saveLine(line, Number(countQty));
    setActiveProduct(null);
    setCountQty("");
    setTab("count");
    window.setTimeout(() => document.getElementById("smart-scan-input")?.focus(), 50);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      scanStream.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (!BarcodeDetectorCtor) return toast.info("Camera barcode detection is not available in this browser. Use the scanner/SKU field.");
      const detector = new BarcodeDetectorCtor({ formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e"] });
      const tick = async () => {
        if (!videoRef.current || !scanStream.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue) { scanProduct(found[0].rawValue); stopCamera(); return; }
        } catch { /* camera can report transient decode errors */ }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    } catch (e: any) { toast.error(e.message ?? "Camera permission was not granted"); }
  };

  const stopCamera = () => {
    scanStream.current?.getTracks().forEach((t) => t.stop());
    scanStream.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const submit = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("smart_reconciliation_submit", { _count_id: selectedId } as never);
      if (error) throw error;
      toast.success("Count submitted for manager review"); await load();
    } catch (e: any) { toast.error(e.message ?? "Could not submit count"); }
    finally { setBusy(false); }
  };

  const review = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("smart_reconciliation_review", { _count_id: selectedId } as never);
      if (error) throw error;
      toast.success("Session moved to manager review"); await load();
    } catch (e: any) { toast.error(e.message ?? "Could not open review"); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("smart_reconciliation_approve", { _count_id: selectedId } as never);
      if (error) throw error;
      toast.success("Reconciliation approved — variances are ready to post"); await load();
    } catch (e: any) { toast.error(e.message ?? "Approval failed"); }
    finally { setBusy(false); }
  };

  const reject = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("smart_reconciliation_reject", { _count_id: selectedId, _reason: rejectReason } as never);
      if (error) throw error;
      setRejectOpen(false); setRejectReason(""); toast.success("Reconciliation rejected"); await load();
    } catch (e: any) { toast.error(e.message ?? "Rejection failed"); }
    finally { setBusy(false); }
  };

  const post = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("post_stock_count", { _count_id: selectedId } as never);
      if (error) throw error;
      toast.success(`Completed — ${Number((data as any)?.lines_applied ?? 0)} approved adjustment(s) posted`);
      await load(); await loadLines(selectedId);
    } catch (e: any) { toast.error(e.message ?? "Could not post approved adjustments"); }
    finally { setBusy(false); }
  };

  const recount = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("smart_reconciliation_request_recount", { _count_id: selectedId } as never);
      if (error) throw error;
      setSelectedId(String(data)); setTab("count"); toast.success("Recount session created; the original count remains in history"); await load(); await loadLines(String(data));
    } catch (e: any) { toast.error(e.message ?? "Could not create recount"); }
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

  return <div className="space-y-4 pb-8">
    <SifoModuleHeader module="inventory" title="Smart Reconciliation Centre" description="Count physical stock against transaction-derived expected stock without changing live inventory until a manager approves the variance." icon={ClipboardCheck} actions={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <SifoKpiCard label="Products Counted" value={String(counted.length)} hint={`${progress}% of current session`} />
      <SifoKpiCard label="Matched" value={String(matched.length)} />
      <SifoKpiCard label="Variances" value={String(variances.length)} />
      <SifoKpiCard label="Critical Variances" value={String(critical)} />
      <SifoKpiCard label="Pending Approval" value={String(pending)} />
      <SifoKpiCard label="Stock Value Variance" value={fmtMoney(totalVarianceValue)} />
      <SifoKpiCard label="Cash Variances" value={fmtMoney(cashVariance)} />
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => setStartOpen(true)}><ClipboardCheck className="mr-2 h-4 w-4" />START STOCK COUNT</Button>
      <Button variant="outline" onClick={() => { setTab("scan"); window.setTimeout(() => document.getElementById("smart-scan-input")?.focus(), 50); }}><ScanLine className="mr-2 h-4 w-4" />SCAN PRODUCT</Button>
      <Button variant="outline" onClick={() => setTab("count")} disabled={!selectedId}><History className="mr-2 h-4 w-4" />CONTINUE COUNT</Button>
      <Button variant="outline" onClick={() => { setTab("variances"); }}><AlertTriangle className="mr-2 h-4 w-4" />VIEW VARIANCES</Button>
      <Button variant="outline" onClick={() => setTab("approval")}><ShieldCheck className="mr-2 h-4 w-4" />APPROVAL CENTRE</Button>
    </div>

    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <div className="text-sm font-medium">Reconciliation scope</div>
      <Select value={scope} onValueChange={setScope}><SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="all">Entire company</SelectItem><SelectItem value="branch">Branches</SelectItem><SelectItem value="warehouse">Warehouses</SelectItem><SelectItem value="outlet">Stores / POS locations</SelectItem><SelectItem value="store">Stock rooms / stores</SelectItem><SelectItem value="transit">Stock in transit</SelectItem>
      </SelectContent></Select>
      <div className="text-xs text-muted-foreground">{scopedLocations.length} location(s) in scope · {scopedSessions.length} count session(s)</div>
    </div>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="count">Count</TabsTrigger><TabsTrigger value="scan">Scan</TabsTrigger><TabsTrigger value="variances">Variances</TabsTrigger><TabsTrigger value="approval">Approval</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-base">Stock Accuracy</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{accuracy.toFixed(1)}%</div><div className="mt-2 text-sm text-muted-foreground">Matched physical counts ÷ counted products</div><div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, accuracy)}%` }} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Variance Value</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4"><div><div className="text-xs text-muted-foreground">Shortage</div><div className="text-xl font-bold text-destructive">{fmtMoney(shortageValue)}</div></div><div><div className="text-xs text-muted-foreground">Excess</div><div className="text-xl font-bold text-amber-700">{fmtMoney(excessValue)}</div></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Workflow</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-sm"><div>Draft <b>{sessions.filter((s) => s.workflow_status === "DRAFT").length}</b></div><div>Review <b>{pending}</b></div><div>Approved <b>{sessions.filter((s) => s.workflow_status === "APPROVED").length}</b></div><div>Completed <b>{completed}</b></div></CardContent></Card>
        </div>
        <DataTable tableId="smart-reconciliation-sessions" data={scopedSessions} columns={sessionColumns} loading={loading} onRowClick={(s) => { setSelectedId(s.id); setTab("count"); }} searchPlaceholder="Search sessions, locations or dates…" empty="No reconciliation sessions yet. Start a stock count to begin." />
      </TabsContent>

      <TabsContent value="count" className="space-y-4">
        {!selected ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a count session from Overview, or start a new stock count.</CardContent></Card> : <>
          <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="font-semibold">{selected.session_name ?? selected.count_number}</div><div className="text-sm text-muted-foreground">{selected.count_date} · {locationName(selected.location_id)}</div></div><div className="flex items-center gap-2"><Badge className={statusClass(selected.workflow_status)}>{statusLabel[selected.workflow_status]}</Badge>{selected.recount_of_count_id && <Badge variant="outline">RECOUNT</Badge>}</div></CardContent></Card>
          <div className="grid gap-3 sm:grid-cols-4"><SifoKpiCard label="Progress" value={`${counted.length} / ${lines.length}`} hint={`${progress}% counted`} /><SifoKpiCard label="Matched" value={String(matched.length)} /><SifoKpiCard label="Variances" value={String(variances.length)} /><SifoKpiCard label="Variance Value" value={fmtMoney(totalVarianceValue)} /></div>
          <div className="flex flex-wrap gap-2"><Input className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product / SKU…" /><Button variant="outline" onClick={() => setTab("scan")}><ScanLine className="mr-2 h-4 w-4" />Fast scan</Button>{(selected.workflow_status === "DRAFT" || selected.workflow_status === "REJECTED") && <Button onClick={submit} disabled={busy || counted.length === 0}><CheckCircle2 className="mr-2 h-4 w-4" />Submit for review</Button>}{selected.workflow_status === "SUBMITTED" && <Button variant="outline" onClick={review} disabled={busy}>Open review</Button>}{selected.workflow_status === "UNDER REVIEW" && <><Button variant="outline" onClick={recount} disabled={busy}>Request recount</Button><Button variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}><XCircle className="mr-2 h-4 w-4" />Reject</Button><Button onClick={approve} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4" />Approve</Button></>}{selected.workflow_status === "APPROVED" && <Button onClick={post} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4" />Post approved adjustments</Button>}</div>
          <DataTable tableId={`smart-count-${selected.id}`} data={filteredLines} columns={lineColumns} loading={loading} searchPlaceholder="Search products…" empty="No count lines." />
        </>}
      </TabsContent>

      <TabsContent value="scan" className="space-y-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-5 w-5" />Fast product scanning</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"><Input id="smart-scan-input" autoFocus value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") scanProduct(scanValue); }} placeholder="Scan barcode / enter SKU / product name…" /><Button onClick={() => scanProduct(scanValue)}><Search className="mr-2 h-4 w-4" />Find</Button><Button variant="outline" onClick={() => { setScannerOpen(true); window.setTimeout(startCamera, 150); }}><Camera className="mr-2 h-4 w-4" />Camera</Button></div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground"><Smartphone className="mr-2 inline h-4 w-4" />USB and Bluetooth scanners behave like a keyboard: scan, press Enter, count, save. The workflow returns directly to the scanner.</div>
        </CardContent></Card>
        {activeProduct && <Card><CardHeader><CardTitle>{activeProduct.name}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-4"><div><div className="text-xs text-muted-foreground">SKU</div><div className="font-medium">{activeProduct.sku ?? "—"}</div></div><div><div className="text-xs text-muted-foreground">System quantity</div><div className="font-medium">{lines.find((l) => l.item_id === activeProduct.id)?.expected_qty ?? 0}</div></div><div><div className="text-xs text-muted-foreground">Cost</div><div className="font-medium">{fmtMoney(activeProduct.cost_price)}</div></div><div><div className="text-xs text-muted-foreground">Selling price</div><div className="font-medium">{fmtMoney(activeProduct.sell_price)}</div></div></div><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label>Physical quantity</Label><Input className="mt-2 h-14 text-2xl" type="number" min="0" value={countQty} onChange={(e) => setCountQty(e.target.value)} autoFocus /></div><div className="flex items-end gap-2"><Button variant="outline" size="lg" onClick={() => setCountQty(String(Math.max(0, Number(countQty || 0) - 1)))}><Minus /></Button><Button variant="outline" size="lg" onClick={() => setCountQty(String(Number(countQty || 0) + 1))}><Plus /></Button><Button size="lg" onClick={saveScannedCount} disabled={!selected || selected.workflow_status === "APPROVED" || selected.workflow_status === "COMPLETED"}>Save Count</Button></div></div></CardContent></Card>}
      </TabsContent>

      <TabsContent value="variances" className="space-y-4">
        <Card><CardHeader><CardTitle>Variance investigation</CardTitle></CardHeader><CardContent><div className="text-sm text-muted-foreground">Expected stock is the existing location balance maintained from stock movements. The count itself never changes live inventory.</div></CardContent></Card>
        <DataTable tableId="smart-variance-lines" data={variances} columns={lineColumns.filter((c) => ["product","expected_qty","counted_qty","variance","cost","variance_value","reason"].includes(String(c.key)))} loading={loading} searchPlaceholder="Search variance products…" empty="No variances in the selected count." />
      </TabsContent>

      <TabsContent value="approval" className="space-y-4">
        <Card><CardHeader><CardTitle>Manager Approval Centre</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Approval is enforced by the database. The counter cannot approve their own reconciliation. Approved variances are posted through the existing stock adjustment engine.</CardContent></Card>
        <DataTable tableId="smart-approval-sessions" data={sessions.filter((s) => ["SUBMITTED","UNDER REVIEW"].includes(s.workflow_status))} columns={sessionColumns} loading={loading} onRowClick={(s) => { setSelectedId(s.id); setTab("count"); }} searchPlaceholder="Search pending approvals…" empty="No pending reconciliation approvals." />
      </TabsContent>
    </Tabs>

    <Dialog open={startOpen} onOpenChange={setStartOpen}><DialogContent><DialogHeader><DialogTitle>Start Stock Count</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Location</Label><Select value={start.location_id} onValueChange={(v) => setStart((x) => ({ ...x, location_id: v }))}><SelectTrigger className="mt-2"><SelectValue placeholder="Choose location" /></SelectTrigger><SelectContent>{locations.filter((l) => l.location_type !== "transit").map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Count date</Label><Input className="mt-2" type="date" value={start.count_date} onChange={(e) => setStart((x) => ({ ...x, count_date: e.target.value }))} /></div><div><Label>Session name</Label><Input className="mt-2" value={start.session_name} onChange={(e) => setStart((x) => ({ ...x, session_name: e.target.value }))} placeholder="e.g. Chibombo September opening count" /></div><div><Label>Notes</Label><Textarea className="mt-2" value={start.notes} onChange={(e) => setStart((x) => ({ ...x, notes: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setStartOpen(false)}>Cancel</Button><Button onClick={startSession} disabled={busy}>Start counting</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}><DialogContent><DialogHeader><DialogTitle>Reject reconciliation</DialogTitle></DialogHeader><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why the count must be corrected or recounted…" /><DialogFooter><Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="destructive" onClick={reject} disabled={busy || !rejectReason.trim()}>Reject</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={scannerOpen} onOpenChange={(open) => { setScannerOpen(open); if (!open) stopCamera(); }}><DialogContent><DialogHeader><DialogTitle>Camera barcode scanner</DialogTitle></DialogHeader><div className="overflow-hidden rounded-lg bg-black"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /></div><div className="text-sm text-muted-foreground">Point the camera at the barcode. If camera detection is unavailable, close this window and use the SKU scanner field.</div></DialogContent></Dialog>
  </div>;
}
