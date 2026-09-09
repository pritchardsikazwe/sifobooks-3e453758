import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  loadAssignment, resolveStoreLocation, countSheet, submitStockCount,
  type CashierAssignment, type StoreLocation, type CountLine,
} from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_worker/w/count")({
  head: () => ({
    meta: [
      { title: "Stock Count — SifoBooks Cashier" },
      { name: "description", content: "Count what is physically on the shelf at your store and submit the sheet for manager approval." },
      { property: "og:title", content: "Stock Count — SifoBooks Cashier" },
      { property: "og:description", content: "Expected versus counted quantities with variance, submitted for approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockCount,
});

function StockCount() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [store, setStore] = useState<StoreLocation | null>(null);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const asg = await loadAssignment();
    setA(asg);
    const loc = await resolveStoreLocation(asg);
    setStore(loc);
    if (asg && loc) setLines(await countSheet(asg.tenantId, loc.id));
  };
  useEffect(() => { void load(); }, []);

  const setCounted = (itemId: string, v: string) =>
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, counted: v } : l)));

  const entered = lines.filter((l) => l.counted !== "");
  const varianceCount = entered.filter((l) => Number(l.counted || 0) !== l.expected).length;

  const submit = async () => {
    if (!a || !store) return;
    setBusy(true);
    try {
      const c = await submitStockCount(a, store.id, lines, notes);
      toast.success(`Count ${c.count_number ?? ""} submitted for approval`);
      setNotes("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit the count");
    }
    setBusy(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Stock count</h1>
        <p className="text-sm text-slate-400">
          {store?.name ?? "Your store"} · {entered.length} of {lines.length} counted
          {varianceCount ? ` · ${varianceCount} with a difference` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>{["Item", "Expected", "Counted", "Difference"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const diff = l.counted === "" ? null : Number(l.counted || 0) - l.expected;
              return (
                <tr key={l.itemId} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    {l.name}
                    {l.sku && <span className="block text-xs text-slate-500">{l.sku}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{l.expected}</td>
                  <td className="px-3 py-2">
                    <input value={l.counted} onChange={(e) => setCounted(l.itemId, e.target.value)} inputMode="decimal"
                      className="w-24 rounded-lg bg-slate-800 px-2 py-1" placeholder="—" />
                  </td>
                  <td className={`px-3 py-2 font-semibold ${diff === null ? "text-slate-500" : diff === 0 ? "text-emerald-400" : diff > 0 ? "text-sky-400" : "text-rose-400"}`}>
                    {diff === null ? "—" : diff}
                  </td>
                </tr>
              );
            })}
            {!lines.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No stock recorded at this store yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the manager (optional)"
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm" />
        <Button className="bg-emerald-500 text-slate-950" disabled={busy || !entered.length} onClick={() => void submit()}>
          Submit count for approval
        </Button>
        <p className="text-xs text-slate-500">Counts are only applied to stock once a manager approves and posts them.</p>
      </div>
    </div>
  );
}
