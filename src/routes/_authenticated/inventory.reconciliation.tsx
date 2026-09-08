import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Scale, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { ExportMenu } from "@/lib/exports";
import { fetchLocations, fetchReconciliation, type Location, type ReconRow } from "@/lib/multi-location";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory/reconciliation")({
  head: () => ({
    meta: [
      { title: "Stock Reconciliation — SifoBooks" },
      { name: "description", content: "Monthly stock reconciliation per location: opening, production, transfers in and out, sales, returns and adjustments against the physical count." },
      { property: "og:title", content: "Stock Reconciliation — SifoBooks" },
      { property: "og:description", content: "Expected closing versus physical count, per product and location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReconciliationPage,
});

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

function ReconciliationPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [physical, setPhysical] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations().then((l) => {
      setLocations(l);
      const outlet = l.find((x) => x.location_type === "outlet") ?? l[0];
      if (outlet) setLocationId(outlet.id);
    }).catch((e) => setError(e.message));
  }, []);

  const run = useCallback(async () => {
    if (!locationId) return;
    setLoading(true); setError(null);
    try { setRows(await fetchReconciliation(locationId, from, to)); }
    catch (e: any) { setError(e.message ?? "Could not build the reconciliation"); toast.error(e.message); }
    finally { setLoading(false); }
  }, [locationId, from, to]);

  useEffect(() => { run(); }, [run]);

  const variance = (r: ReconRow) => {
    const p = physical[r.item_id];
    if (p === undefined || p === "") return null;
    return Number(p) - r.expected_closing;
  };

  const matched = useMemo(() => rows.filter((r) => variance(r) === 0).length, [rows, physical]);
  const mismatched = useMemo(() => rows.filter((r) => { const v = variance(r); return v !== null && v !== 0; }).length, [rows, physical]);

  const columns: DTColumn<ReconRow>[] = [
    { key: "item_name", header: "Product", sortable: true, sticky: true },
    { key: "unit", header: "Unit" },
    { key: "opening", header: "Opening", align: "right", sortable: true },
    { key: "produced", header: "Produced", align: "right" },
    { key: "transfers_in", header: "Transfers in", align: "right" },
    { key: "other_in", header: "Other receipts", align: "right" },
    { key: "sales", header: "Sales", align: "right" },
    { key: "returns", header: "Returns", align: "right" },
    { key: "transfers_out", header: "Transfers out", align: "right" },
    { key: "adjustments", header: "Adjustments", align: "right" },
    { key: "expected_closing", header: "Expected closing", align: "right", sortable: true },
    {
      key: "physical", header: "Physical", align: "right",
      cell: (r) => (
        <Input className="h-8 w-24 text-right" type="number" value={physical[r.item_id] ?? ""}
          onChange={(e) => setPhysical((p) => ({ ...p, [r.item_id]: e.target.value }))} />
      ),
    },
    {
      key: "variance", header: "Variance", align: "right",
      cell: (r) => {
        const v = variance(r);
        if (v === null) return <span className="text-muted-foreground">—</span>;
        return <span className={v === 0 ? "text-emerald-600" : "text-destructive"}>{v === 0 ? "MATCHED" : (v > 0 ? `+${v}` : v)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Stock reconciliation"
        description="Opening + production + transfers in + receipts − sales + returns − transfers out ± adjustments = expected closing."
        icon={Scale}
        actions={<Button variant="outline" onClick={run}><RefreshCw className="mr-2 h-4 w-4" />Recalculate</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label>Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
            <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <SifoKpiCard label="Matched" value={String(matched)} />
          <SifoKpiCard label="Variances" value={String(mismatched)} />
        </div>
      </div>

      <DataTable
        tableId="stock-reconciliation"
        data={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={run}
        searchPlaceholder="Search products…"
        pageSize={50}
        empty="No stock movements for this location and period."
        toolbarRight={
          <ExportMenu
            rows={rows.map((r) => ({
              product: r.item_name, unit: r.unit, opening: r.opening, produced: r.produced,
              transfers_in: r.transfers_in, other_receipts: r.other_in, sales: r.sales, returns: r.returns,
              transfers_out: r.transfers_out, adjustments: r.adjustments, expected_closing: r.expected_closing,
              physical: physical[r.item_id] ?? "", variance: variance(r) ?? "",
            }))}
            filename={`stock-reconciliation-${from}-to-${to}`}
            title="Stock reconciliation"
          />
        }
      />
    </div>
  );
}
