import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";

export const Route = createFileRoute("/_authenticated/reports/inventory-valuation")({
  head: () => ({ meta: [{ title: "Inventory Valuation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InvValPage,
});

function InvValPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("ytd"), periodKey: "ytd" });
  const asAt = filters.range.to;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("stock_items")
        .select("sku,name,unit,quantity_on_hand,cost_price,sell_price,reorder_level").order("name");
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [asAt]);

  const rows = useMemo(() => items.map((i: any) => ({
    ...i,
    value: num(i.quantity_on_hand) * num(i.cost_price),
    lowStock: num(i.quantity_on_hand) <= num(i.reorder_level),
  })), [items]);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const csv = rows.map((r) => ({
    SKU: r.sku, Item: r.name, Unit: r.unit, Qty: r.quantity_on_hand,
    Cost: num(r.cost_price).toFixed(2), Value: r.value.toFixed(2), LowStock: r.lowStock ? "yes" : "no",
  }));

  return (
    <ReportShell title="Inventory Valuation" subtitle={`As at ${asAt} · ${rows.length} SKUs · Total value ${fmt(total)}`} loading={loading} filename="inventory-valuation" rows={csv}>
      <ReportFilterBar initial={{ periodKey: "ytd" }} onApply={setFilters} />
      <table className="w-full text-sm mt-4">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr>
            <th className="text-left py-2">SKU</th><th className="text-left">Item</th>
            <th className="text-right">Qty</th><th className="text-right">Cost</th><th className="text-right">Value</th><th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.sku + r.name}>
              <td className="py-1.5 text-slate-500">{r.sku}</td>
              <td>{r.name} <span className="text-xs text-slate-400">{r.unit}</span></td>
              <td className="text-right">{num(r.quantity_on_hand)}</td>
              <td className="text-right">{fmt(num(r.cost_price))}</td>
              <td className="text-right font-semibold">{fmt(r.value)}</td>
              <td>{r.lowStock ? <span className="text-xs text-rose-600">Reorder</span> : <span className="text-xs text-emerald-600">OK</span>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="py-4 text-slate-400">No stock items.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr><td colSpan={4} className="pt-2">Total Inventory Value</td><td className="pt-2 text-right">{fmt(total)}</td><td /></tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
