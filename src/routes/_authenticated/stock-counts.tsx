import { createFileRoute } from "@tanstack/react-router";
import { SifoWorkflowGuide } from "@/components/sifo/SifoWorkflowGuide";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Check, RefreshCw, ShieldCheck } from "lucide-react";
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
import { toast } from "sonner";
import {
  ADJUSTMENT_REASONS, currentUserId, fetchBalances, fetchLocations, type BalanceRow, type Location,
} from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/stock-counts")({
  head: () => ({
    meta: [
      { title: "Stock Takes — SifoBooks" },
      { name: "description", content: "Physical stock takes per location with expected vs counted variance, approval and posting to the stock ledger." },
      { property: "og:title", content: "Stock Takes — SifoBooks" },
      { property: "og:description", content: "Location stock takes with variance approval and posting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockCountsPage,
});

type CountRow = {
  id: string; count_number: string | null; count_date: string; status: string;
  location_id: string | null; warehouse_id: string | null; notes: string | null; posted_at: string | null;
};

type LineRow = {
  id: string; item_id: string; expected_qty: number; counted_qty: number | null;
  variance: number; note: string | null; reason_code: string | null;
};

function StockCountsPage() {
  const [rows, setRows] = useState<CountRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "new" | "sheet">("list");
  const [active, setActive] = useState<CountRow | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [form, setForm] = useState({ count_number: "", count_date: new Date().toISOString().slice(0, 10), location_id: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data, error }, locs, bals] = await Promise.all([
        supabase.from("stock_counts").select("*").order("count_date", { ascending: false }),
        fetchLocations(true),
        fetchBalances(),
      ]);
      if (error) throw error;
      setRows((data ?? []) as unknown as CountRow[]);
      setLocations(locs);
      setBalances(bals);
    } catch (e: any) { setError(e.message ?? "Failed to load stock takes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "All locations";
  const itemName = (id: string) => balances.find((b) => b.item_id === id)?.name ?? "—";

  const openSheet = async (row: CountRow) => {
    setActive(row); setMode("sheet");
    const { data } = await supabase.from("stock_count_lines").select("*").eq("count_id", row.id);
    setLines((data ?? []) as unknown as LineRow[]);
  };

  const createCount = async () => {
    if (!form.location_id) return toast.error("Choose the location being counted");
    setBusy(true);
    try {
      const uid = await currentUserId();
      let number = form.count_number.trim();
      if (!number) {
        const { data } = await supabase.rpc("next_doc_number", { _uid: uid, _prefix: "CNT" } as never);
        number = (data as string) ?? `CNT-${Date.now().toString().slice(-6)}`;
      }
      const { data, error } = await supabase.from("stock_counts").insert({
        user_id: uid, count_number: number, count_date: form.count_date,
        location_id: form.location_id, notes: form.notes || null, counted_by: uid,
      } as never).select().single();
      if (error) throw error;

      const scoped = balances.filter((b) => b.location_id === form.location_id);
      if (scoped.length) {
        const { error: le } = await supabase.from("stock_count_lines").insert(
          scoped.map((b) => ({
            user_id: uid, count_id: (data as any).id, item_id: b.item_id,
            location_id: form.location_id, expected_qty: b.quantity,
          })) as never,
        );
        if (le) throw le;
      }
      toast.success(`Count sheet ${number} created with ${scoped.length} products`);
      await load();
      await openSheet(data as unknown as CountRow);
    } catch (e: any) { toast.error(e.message ?? "Could not create stock take"); }
    finally { setBusy(false); }
  };

  const saveLine = async (line: LineRow, counted: string) => {
    const qty = counted === "" ? null : Number(counted);
    setLines((prev) => prev.map((l) => l.id === line.id ? { ...l, counted_qty: qty, variance: (qty ?? 0) - l.expected_qty } : l));
    await supabase.from("stock_count_lines").update({ counted_qty: qty } as never).eq("id", line.id);
  };

  const saveReason = async (line: LineRow, reason: string) => {
    setLines((prev) => prev.map((l) => l.id === line.id ? { ...l, reason_code: reason } : l));
    await supabase.from("stock_count_lines").update({ reason_code: reason } as never).eq("id", line.id);
  };

  const markCounted = async () => {
    if (!active) return;
    await supabase.from("stock_counts").update({ status: "counted" } as never).eq("id", active.id);
    toast.success("Marked as counted — awaiting approval");
    await load(); setActive({ ...active, status: "counted" });
  };

  const approveCount = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("approve_stock_count", { _count_id: active.id } as never);
      if (error) throw error;
      toast.success("Stock take approved — you can now post the variances");
      await load(); setActive({ ...active, status: "approved" });
    } catch (e: any) { toast.error(e.message ?? "Approval failed"); }
    finally { setBusy(false); }
  };

  const postCount = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("post_stock_count", { _count_id: active.id } as never);
      if (error) throw error;
      const res = data as any;
      if (res?.ok === false) toast.info(res.message ?? "Nothing to post");
      else toast.success(`Posted — ${res?.lines_applied ?? 0} variance line(s) applied to stock`);
      await load();
      setMode("list"); setActive(null);
    } catch (e: any) { toast.error(e.message ?? "Posting failed"); }
    finally { setBusy(false); }
  };

  const columns: DTColumn<CountRow>[] = useMemo(() => [
    { key: "count_number", header: "Count #", sortable: true, sticky: true },
    { key: "count_date", header: "Date", sortable: true },
    { key: "location_id", header: "Location", cell: (r) => locName(r.location_id) },
    { key: "status", header: "Status", cell: (r) => <SifoStatusBadge status={r.status} /> },
    { key: "notes", header: "Notes" },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [locations]);

  if (mode === "new") {
    return (
      <SifoFormPage
        module="inventory"
        title="New stock take"
        subtitle="Generates a count sheet from the quantities currently held at that location."
        onCancel={() => setMode("list")}
        onSave={createCount}
        saving={busy}
      >
        <SifoFormSection title="Stock take details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Count number</Label>
              <Input value={form.count_number} onChange={(e) => setForm((f) => ({ ...f, count_number: e.target.value }))} placeholder="Auto" />
            </div>
            <div className="space-y-2">
              <Label>Count date</Label>
              <Input type="date" value={form.count_date} onChange={(e) => setForm((f) => ({ ...f, count_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={form.location_id} onValueChange={(v) => setForm((f) => ({ ...f, location_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </SifoFormSection>
      </SifoFormPage>
    );
  }

  if (mode === "sheet" && active) {
    const posted = active.status === "posted";
    const variances = lines.filter((l) => l.counted_qty != null && (l.counted_qty - l.expected_qty) !== 0);
    const lineCols: DTColumn<LineRow>[] = [
      { key: "item", header: "Item", sticky: true, accessor: (r) => itemName(r.item_id), cell: (r) => itemName(r.item_id) },
      { key: "expected_qty", header: "Expected", align: "right" },
      {
        key: "counted_qty", header: "Counted", align: "right",
        cell: (r) => posted ? (r.counted_qty ?? "—") : (
          <Input className="h-8 w-24 text-right" type="number" defaultValue={r.counted_qty ?? ""}
            onBlur={(e) => saveLine(r, e.target.value)} />
        ),
      },
      {
        key: "variance", header: "Variance", align: "right",
        cell: (r) => {
          const v = (r.counted_qty ?? 0) - r.expected_qty;
          if (r.counted_qty == null) return <span className="text-muted-foreground">—</span>;
          return <span className={v === 0 ? "" : v > 0 ? "text-emerald-600" : "text-destructive"}>{v > 0 ? `+${v}` : v}</span>;
        },
      },
      {
        key: "reason_code", header: "Reason",
        cell: (r) => posted ? (r.reason_code ?? "—") : (
          <Select value={r.reason_code ?? ""} onValueChange={(v) => saveReason(r, v)}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Reason" /></SelectTrigger>
            <SelectContent>
              {ADJUSTMENT_REASONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ),
      },
    ];
    return (
      <div className="space-y-4">
        <SifoWorkflowGuide doc="stock_count" defaultOpen />
        <SifoModuleHeader
          module="inventory"
          title={`Stock take ${active.count_number ?? ""}`}
          description={`${active.count_date} · ${locName(active.location_id)} · ${active.status} · ${variances.length} variance line(s)`}
          icon={ClipboardList}
          breadcrumbs={[{ label: "Stock takes", to: "/stock-counts" }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setMode("list"); setActive(null); }}>Back</Button>
              {active.status === "draft" && <Button variant="outline" onClick={markCounted}><Check className="mr-2 h-4 w-4" />Mark counted</Button>}
              {active.status === "counted" && (
                <Button variant="outline" onClick={approveCount} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4" />Approve</Button>
              )}
              {active.status === "approved" && (
                <Button onClick={postCount} disabled={busy}><Check className="mr-2 h-4 w-4" />Post variances</Button>
              )}
            </div>
          }
        />
        <DataTable
          tableId="stock-count-lines"
          data={lines}
          columns={lineCols}
          searchPlaceholder="Search items…"
          pageSize={50}
          toolbarRight={
            <ExportMenu
              rows={lines.map((l) => ({
                item: itemName(l.item_id), expected: l.expected_qty, counted: l.counted_qty,
                variance: (l.counted_qty ?? 0) - l.expected_qty, reason: l.reason_code ?? "",
              }))}
              filename={`stock-take-${active.count_number ?? active.id}`}
              title="Stock take"
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SifoWorkflowGuide doc="stock_count" />
      <SifoModuleHeader
        module="inventory"
        title="Stock takes"
        description="Count a location, review the variance, approve it, then post it to the stock ledger."
        icon={ClipboardList}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => setMode("new")}><Plus className="mr-2 h-4 w-4" />New stock take</Button>
          </div>
        }
      />
      <DataTable
        tableId="stock-counts"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={openSheet}
        searchPlaceholder="Search stock takes…"
        empty="No stock takes yet. Start one to reconcile physical stock."
        toolbarRight={<ExportMenu rows={rows} filename="stock-takes" title="Stock takes" />}
      />
    </div>
  );
}
