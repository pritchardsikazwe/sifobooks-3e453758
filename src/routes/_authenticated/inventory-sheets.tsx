import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, ClipboardList, TrendingUp, ArrowLeftRight, Download } from "lucide-react";
import { generateBinCardPdf, generateStockTakeSheet, generateStockValuationPdf, generateStockMovementReport } from "@/lib/inventory-sheets-pdf";

export const Route = createFileRoute("/_authenticated/inventory-sheets")({
  head: () => ({
    meta: [
      { title: "Inventory Sheets — SifoBooks" },
      { name: "description", content: "Bin cards, stock take sheets, valuation and movement reports for Zambian businesses." },
      { property: "og:title", content: "Inventory Sheets — SifoBooks" },
      { property: "og:description", content: "Printable bin cards, stock-take sheets, valuation and movement reports." },
    ],
  }),
  component: InventorySheetsPage,
});

function InventorySheetsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [warehouse, setWarehouse] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: si }, { data: wh }] = await Promise.all([
        supabase.from("stock_items").select("id, name, sku, unit, on_hand, cost_price, category, warehouse_id"),
        supabase.from("warehouses").select("id, name"),
      ]);
      setItems(si ?? []);
      setWarehouses(wh ?? []);
    })();
  }, []);

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

  const filtered = items.filter(i =>
    (warehouse === "all" || i.warehouse_id === warehouse) &&
    (category === "all" || i.category === category)
  );

  const enrich = (rows: any[]) => rows.map(r => ({
    ...r,
    warehouse: warehouses.find(w => w.id === r.warehouse_id)?.name ?? "—",
  }));

  const runBinCard = async () => {
    const it = items.find(i => i.id === selectedItem);
    if (!it) return toast.error("Select an item first");
    setBusy(true);
    try { await generateBinCardPdf(it); toast.success("Bin card generated"); }
    finally { setBusy(false); }
  };

  const runStockTake = async () => {
    if (!filtered.length) return toast.error("No items match filters");
    setBusy(true);
    try { await generateStockTakeSheet(enrich(filtered)); toast.success("Stock take sheet generated"); }
    finally { setBusy(false); }
  };

  const runValuation = async () => {
    if (!filtered.length) return toast.error("No items match filters");
    setBusy(true);
    try { await generateStockValuationPdf(filtered); toast.success("Valuation report generated"); }
    finally { setBusy(false); }
  };

  const runMovement = async () => {
    setBusy(true);
    try { await generateStockMovementReport(from, to); toast.success("Movement report generated"); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Sheets</h1>
        <p className="text-sm text-muted-foreground">Branded, printable sheets for warehouse operations and audit.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Warehouse</Label>
          <Select value={warehouse} onValueChange={setWarehouse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Period (from)</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Period (to)</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Sheets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SheetCard
          icon={<FileText className="h-5 w-5" />}
          title="Bin Card"
          desc="Full movement history for a single item with running balance."
        >
          <div className="flex gap-2">
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="save" onClick={runBinCard} disabled={busy || !selectedItem} className="gap-1">
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </SheetCard>

        <SheetCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Stock Take Sheet"
          desc="Printable count sheet with signature lines for warehouse cycle counts."
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{filtered.length} items in scope</span>
            <Button variant="save" onClick={runStockTake} disabled={busy} className="gap-1">
              <Download className="h-4 w-4" /> Print Sheet
            </Button>
          </div>
        </SheetCard>

        <SheetCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Stock Valuation"
          desc="Current on-hand quantities × unit cost, totalled in Kwacha."
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Snapshot as of today</span>
            <Button variant="save" onClick={runValuation} disabled={busy} className="gap-1">
              <Download className="h-4 w-4" /> Valuation PDF
            </Button>
          </div>
        </SheetCard>

        <SheetCard
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Stock Movement Report"
          desc="All inbound / outbound / adjustment movements for the selected period."
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{from} → {to}</span>
            <Button variant="save" onClick={runMovement} disabled={busy} className="gap-1">
              <Download className="h-4 w-4" /> Movement PDF
            </Button>
          </div>
        </SheetCard>
      </div>
    </div>
  );
}

function SheetCard({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center">{icon}</div>
        <div>
          <div className="font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
