import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { ExportMenu } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { MOVEMENT_LABEL, fetchLocations, fetchStockCard, type Location } from "@/lib/multi-location";

export const Route = createFileRoute("/_authenticated/inventory/stock-card")({
  head: () => ({
    meta: [
      { title: "Stock Card — SifoBooks" },
      { name: "description", content: "Every movement for a product at a location with a running balance: opening, transfers, sales, returns and adjustments." },
      { property: "og:title", content: "Stock Card — SifoBooks" },
      { property: "og:description", content: "Product movement history with running balance per location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockCardPage,
});

type Product = { id: string; name: string; sku: string | null; unit: string; cost_price: number };

function StockCardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemId, setItemId] = useState("");
  const [locId, setLocId] = useState("__all");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([
        supabase.from("stock_items").select("id, name, sku, unit, cost_price").order("name").limit(1000),
        fetchLocations(true),
      ]);
      const list = (p.data ?? []).map((x: any) => ({ ...x, cost_price: Number(x.cost_price ?? 0) })) as Product[];
      setProducts(list);
      setLocations(l);
      if (list.length) setItemId(list[0].id);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      setRows(await fetchStockCard(itemId, locId === "__all" ? undefined : locId));
    } finally { setLoading(false); }
  }, [itemId, locId]);

  useEffect(() => { load(); }, [load]);

  const product = products.find((p) => p.id === itemId);
  const closing = rows.length ? rows[rows.length - 1].balance : 0;
  const totalIn = rows.filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0);
  const totalOut = rows.filter((r) => r.delta < 0).reduce((s, r) => s - r.delta, 0);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <SifoModuleHeader
        module="inventory"
        title="Stock card"
        description="Full movement history for one product, with a running balance you can trace back to any document."
        icon={ScrollText}
        actions={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div className="space-y-2">
          <Label>Product</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.unit}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={locId} onValueChange={setLocId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All locations</SelectItem>
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SifoKpiCard label="Closing balance" value={`${closing} ${product?.unit ?? ""}`} />
        <SifoKpiCard label="Stock value" value={fmtMoney(closing * (product?.cost_price ?? 0))} hint={`In ${totalIn} · Out ${totalOut}`} />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Movement</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-right">In</th>
              <th className="px-4 py-2 text-right">Out</th>
              <th className="px-4 py-2 text-right">Balance</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-1.5">{r.transaction_date}</td>
                <td className="px-4 py-1.5">{MOVEMENT_LABEL[r.movement_type] ?? r.movement_type}</td>
                <td className="px-4 py-1.5">{locName(r.location_id)}</td>
                <td className="px-4 py-1.5 text-muted-foreground">{r.reference ?? "—"}</td>
                <td className="px-4 py-1.5 text-right text-emerald-600">{r.delta > 0 ? r.delta : ""}</td>
                <td className="px-4 py-1.5 text-right text-destructive">{r.delta < 0 ? -r.delta : ""}</td>
                <td className="px-4 py-1.5 text-right font-semibold">{r.balance}</td>
                <td className="px-4 py-1.5 text-muted-foreground">{r.note ?? ""}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No movements recorded for this product yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ExportMenu
        rows={rows.map((r) => ({
          Date: r.transaction_date, Movement: MOVEMENT_LABEL[r.movement_type] ?? r.movement_type,
          Location: locName(r.location_id), Reference: r.reference, In: r.delta > 0 ? r.delta : "",
          Out: r.delta < 0 ? -r.delta : "", Balance: r.balance,
        }))}
        filename={`stock-card-${product?.sku ?? product?.name ?? "item"}`}
        title="Stock card"
      />
    </div>
  );
}
