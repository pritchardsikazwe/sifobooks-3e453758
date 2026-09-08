import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Plus, RefreshCw, Send, PackageCheck, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { SifoFormPage, SifoFormSection } from "@/components/sifo/SifoFormPage";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { currentUserId, dispatchTransfer, fetchBalances, fetchLocations, fetchTransferLines, fetchTransfers, receiveTransfer, setTransferStatus, type BalanceRow, type Location, type Transfer, type TransferLine } from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/inventory/transfers")({
  head: () => ({ meta: [
    { title: "Stock Transfers — SifoBooks" },
    { name: "description", content: "Move stock warehouse to outlet with a dispatch, transit and receive trail and a two-sided stock ledger." },
    { property: "og:title", content: "Stock Transfers — SifoBooks" },
    { property: "og:description", content: "Warehouse to outlet stock transfers with full audit trail." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ]}),
  component: TransfersPage,
});

type Draft = { item_id: string; quantity: string; unit_cost: string; batch_no: string; expiry_date: string };

function TransfersPage() {
  const [rows, setRows] = useState<Transfer[]>([]); const [locations, setLocations] = useState<Location[]>([]); const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null; unit: string; cost_price: number }[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [mode, setMode] = useState<"list" | "new" | "detail">("list");
  const [active, setActive] = useState<Transfer | null>(null); const [lines, setLines] = useState<TransferLine[]>([]); const [ledger, setLedger] = useState<any[]>([]); const [busy, setBusy] = useState(false);
  const [head, setHead] = useState({ transfer_number: "", transfer_date: new Date().toISOString().slice(0, 10), from_location_id: "", to_location_id: "", purpose: "", notes: "" });
  const [draft, setDraft] = useState<Draft[]>([{ item_id: "", quantity: "", unit_cost: "", batch_no: "", expiry_date: "" }]);

  const load = useCallback(async () => { setLoading(true); setError(null); try {
    const [t, l, b, p] = await Promise.all([fetchTransfers(), fetchLocations(), fetchBalances(), supabase.from("stock_items").select("id, name, sku, unit, cost_price").eq("is_active", true).order("name").limit(1000)]);
    setRows(t); setLocations(l); setBalances(b); setProducts((p.data ?? []).map((x: any) => ({ ...x, cost_price: Number(x.cost_price ?? 0) })));
  } catch (e: any) { setError(e.message ?? "Could not load transfers"); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";
  const availableAt = (itemId: string, locId: string) => balances.find((b) => b.item_id === itemId && b.location_id === locId)?.quantity ?? 0;

  const openDetail = async (t: Transfer) => { setActive(t); setMode("detail"); const [ls, mv] = await Promise.all([fetchTransferLines(t.id), supabase.from("stock_movements").select("id, transaction_date, movement_type, quantity, location_id, note, reference").eq("transfer_id", t.id).order("created_at")]); setLines(ls); setLedger(mv.data ?? []); };
  const createTransfer = async () => {
    if (!head.from_location_id || !head.to_location_id) return toast.error("Choose both locations"); if (head.from_location_id === head.to_location_id) return toast.error("Source and destination must differ");
    const valid = draft.filter((d) => d.item_id && Number(d.quantity) > 0); if (!valid.length) return toast.error("Add at least one product line"); setBusy(true);
    try { const uid = await currentUserId(); let number = head.transfer_number.trim(); if (!number) { const { data } = await supabase.rpc("next_doc_number", { _uid: uid, _prefix: "TRF" } as never); number = (data as string) ?? `TRF-${Date.now().toString().slice(-6)}`; }
      const { data: t, error } = await supabase.from("inventory_transfers").insert({ user_id: uid, reference: number, transfer_number: number, transfer_date: head.transfer_date, from_location_id: head.from_location_id, to_location_id: head.to_location_id, status: "draft", purpose: head.purpose || null, notes: head.notes || null, requested_by: uid } as never).select().single(); if (error) throw error;
      const { error: le } = await supabase.from("inventory_transfer_items").insert(valid.map((d) => ({ transfer_id: (t as any).id, item_id: d.item_id, description: products.find((p) => p.id === d.item_id)?.name ?? null, quantity: Number(d.quantity), unit_cost: Number(d.unit_cost || 0), batch_no: d.batch_no || null, expiry_date: d.expiry_date || null })) as never); if (le) throw le;
      toast.success(`Transfer ${number} saved as draft`); await load(); setMode("list"); setDraft([{ item_id: "", quantity: "", unit_cost: "", batch_no: "", expiry_date: "" }]);
    } catch (e: any) { toast.error(e.message ?? "Could not save transfer"); } finally { setBusy(false); }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => { if (!active) return; setBusy(true); try { await fn(); toast.success(ok); const fresh = await fetchTransfers(); setRows(fresh); setBalances(await fetchBalances()); const updated = fresh.find((r) => r.id === active.id); if (updated) await openDetail(updated); } catch (e: any) { toast.error(e.message ?? "Action failed"); } finally { setBusy(false); } };
  const submitTransfer = () => act(() => setTransferStatus(active!.id, "submitted"), "Transfer submitted");
  const approveTransfer = () => act(async () => { const { error } = await supabase.rpc("approve_stock_transfer", { _transfer_id: active!.id } as never); if (error) throw error; }, "Transfer approved");
  const dispatch = () => act(() => dispatchTransfer(active!.id), "Transfer dispatched and moved to transit");
  const receive = () => act(() => receiveTransfer(active!.id), "Transfer received and completed");
  const cancel = () => act(() => setTransferStatus(active!.id, "cancelled"), "Transfer cancelled");

  const columns: DTColumn<Transfer>[] = useMemo(() => [
    { key: "transfer_number", header: "Transfer #", sortable: true, sticky: true, cell: (r) => r.transfer_number ?? r.reference }, { key: "transfer_date", header: "Date", sortable: true },
    { key: "from_location_id", header: "From", cell: (r) => locName(r.from_location_id) }, { key: "to_location_id", header: "To", cell: (r) => locName(r.to_location_id) },
    { key: "purpose", header: "Purpose" }, { key: "status", header: "Status", cell: (r) => <SifoStatusBadge status={r.status} /> },
  ], [locations]);

  if (mode === "new") return (<SifoFormPage module="inventory" title="New stock transfer" subtitle="Move stock from one location to another. Nothing leaves the source until you dispatch." onCancel={() => setMode("list")} onSave={createTransfer} saving={busy}>
    <SifoFormSection title="Transfer details"><div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Transfer number</Label><Input value={head.transfer_number} onChange={(e) => setHead((h) => ({ ...h, transfer_number: e.target.value }))} placeholder="Auto" /></div>
      <div className="space-y-2"><Label>Date</Label><Input type="date" value={head.transfer_date} onChange={(e) => setHead((h) => ({ ...h, transfer_date: e.target.value }))} /></div>
      <div className="space-y-2"><Label>From location</Label><Select value={head.from_location_id} onValueChange={(v) => setHead((h) => ({ ...h, from_location_id: v }))}><SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger><SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>To location</Label><Select value={head.to_location_id} onValueChange={(v) => setHead((h) => ({ ...h, to_location_id: v }))}><SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger><SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Purpose</Label><Input value={head.purpose} onChange={(e) => setHead((h) => ({ ...h, purpose: e.target.value }))} placeholder="Branch opening / monthly replenishment" /></div>
      <div className="space-y-2"><Label>Notes</Label><Input value={head.notes} onChange={(e) => setHead((h) => ({ ...h, notes: e.target.value }))} /></div>
    </div></SifoFormSection>
    <SifoFormSection title="Products"><div className="space-y-3">{draft.map((d, i) => { const avail = d.item_id && head.from_location_id ? availableAt(d.item_id, head.from_location_id) : 0; const after = avail - Number(d.quantity || 0); return (<div key={i} className="grid gap-2 md:grid-cols-12 items-end rounded-lg border p-3">
      <div className="md:col-span-4 space-y-1"><Label className="text-xs">Product</Label><Select value={d.item_id} onValueChange={(v) => setDraft((p) => p.map((x, j) => j === i ? { ...x, item_id: v, unit_cost: x.unit_cost || String(products.find((pr) => pr.id === v)?.cost_price ?? 0) } : x))}><SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.unit}</SelectItem>)}</SelectContent></Select></div>
      <div className="md:col-span-2 space-y-1"><Label className="text-xs">Transfer qty</Label><Input type="number" value={d.quantity} onChange={(e) => setDraft((p) => p.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} /></div>
      <div className="md:col-span-2 space-y-1"><Label className="text-xs">Unit cost</Label><Input type="number" value={d.unit_cost} onChange={(e) => setDraft((p) => p.map((x, j) => j === i ? { ...x, unit_cost: e.target.value } : x))} /></div>
      <div className="md:col-span-2 space-y-1"><Label className="text-xs">Batch</Label><Input value={d.batch_no} onChange={(e) => setDraft((p) => p.map((x, j) => j === i ? { ...x, batch_no: e.target.value } : x))} /></div>
      <div className="md:col-span-2 text-xs text-muted-foreground"><div>Available: <span className="font-medium text-foreground">{avail}</span></div><div className={after < 0 ? "text-destructive" : ""}>After transfer: {after}</div></div>
    </div>); })}<Button type="button" variant="outline" size="sm" onClick={() => setDraft((p) => [...p, { item_id: "", quantity: "", unit_cost: "", batch_no: "", expiry_date: "" }])}><Plus className="mr-2 h-4 w-4" />Add line</Button></div></SifoFormSection>
  </SifoFormPage>);

  if (mode === "detail" && active) {
    const lineCols: DTColumn<TransferLine>[] = [
      { key: "description", header: "Product", sticky: true }, { key: "quantity", header: "Transfer qty", align: "right" }, { key: "qty_received", header: "Received", align: "right" },
      { key: "unit_cost", header: "Unit cost", align: "right", cell: (r) => fmtMoney(Number(r.unit_cost)) }, { key: "total", header: "Total cost", align: "right", cell: (r) => fmtMoney(Number(r.unit_cost) * Number(r.quantity)) }, { key: "batch_no", header: "Batch" }, { key: "expiry_date", header: "Expiry" },
    ];
    return (<div className="space-y-4"><SifoModuleHeader module="inventory" title={`Transfer ${active.transfer_number ?? active.reference}`} subtitle={`${locName(active.from_location_id)} → ${locName(active.to_location_id)}`} />
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setMode("list"); setActive(null); }}><ArrowLeftRight className="mr-2 h-4 w-4" />Back</Button>
        {active.status === "draft" && <Button disabled={busy} onClick={submitTransfer}><Send className="mr-2 h-4 w-4" />Submit</Button>}
        {active.status === "submitted" && <Button disabled={busy} onClick={approveTransfer}><Check className="mr-2 h-4 w-4" />Approve</Button>}
        {active.status === "approved" && <Button disabled={busy} onClick={dispatch}><Send className="mr-2 h-4 w-4" />Dispatch</Button>}
        {active.status === "in_transit" && <Button disabled={busy} onClick={receive}><PackageCheck className="mr-2 h-4 w-4" />Receive</Button>}
        {["draft", "submitted", "approved"].includes(active.status) && <Button variant="destructive" disabled={busy} onClick={cancel}><Ban className="mr-2 h-4 w-4" />Cancel</Button>}
      </div>
      <div className="grid gap-4 md:grid-cols-4"><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Status</div><div className="mt-1"><SifoStatusBadge status={active.status} /></div></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">From</div><div className="mt-1 font-medium">{locName(active.from_location_id)}</div></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">To</div><div className="mt-1 font-medium">{locName(active.to_location_id)}</div></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Purpose</div><div className="mt-1 font-medium">{active.purpose ?? "—"}</div></div></div>
      <div className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">Transfer lines</h3><DataTable columns={lineCols} data={lines} loading={busy && !lines.length} emptyMessage="No transfer lines" /></div>
      <div className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">Stock movement ledger</h3><DataTable columns={[{ key: "transaction_date", header: "Date" }, { key: "movement_type", header: "Movement" }, { key: "location_id", header: "Location", cell: (r: any) => locName(r.location_id) }, { key: "quantity", header: "Qty", align: "right" }, { key: "note", header: "Note" }]} data={ledger} emptyMessage="No stock movements yet — transfer is not dispatched." /></div>
    </div>);
  }

  return (<div className="space-y-4"><SifoModuleHeader module="inventory" title="Stock transfers" subtitle="Move inventory between warehouses, outlets and other locations with an auditable transit trail." actions={<div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => setMode("new")}><Plus className="mr-2 h-4 w-4" />New transfer</Button><ExportMenu data={rows as any[]} filename="stock-transfers" title="Stock Transfers" /></div>} /><div>{error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}<DataTable columns={columns} data={rows} loading={loading} onRowClick={openDetail} emptyMessage="No stock transfers yet." searchPlaceholder="Search transfers..." /></div></div>);
}
