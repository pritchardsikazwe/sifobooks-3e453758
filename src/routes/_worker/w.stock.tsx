import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can, canFully } from "@/lib/pos-permissions";
import {
  loadAssignment, resolveStoreLocation, storeStock, kw,
  type CashierAssignment, type StoreLocation,
} from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_worker/w/stock")({
  head: () => ({
    meta: [
      { title: "My Stock — SifoBooks Cashier" },
      { name: "description", content: "Look up what is on the shelf at your own store: available quantity, selling price and low-stock warnings." },
      { property: "og:title", content: "My Stock — SifoBooks Cashier" },
      { property: "og:description", content: "Read-only stock for the store you are assigned to." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerStock,
});

type Row = { name: string; sku: string | null; qty: number; price: number; reorder: number };

function WorkerStock() {
  const ctx = usePosContext();
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [store, setStore] = useState<StoreLocation | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const asg = await loadAssignment();
      setA(asg);
      const loc = await resolveStoreLocation(asg);
      setStore(loc);
      if (asg && loc) setRows(await storeStock(asg.tenantId, loc.id, ""));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => !q || `${r.name} ${r.sku ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const out = filtered.filter((r) => r.qty <= 0).length;

  if (!can(ctx, "stock_view")) {
    return <div className="p-10 text-center text-slate-400">Stock lookup is not available for your role.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">My stock</h1>
        <p className="text-sm text-slate-400">
          {store ? `${store.name} · what is on the shelf where you sell` : "No store is assigned to you yet"}
          {canFully(ctx, "stock_transfer") ? "" : " · view only"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Items listed" value={String(filtered.length)} />
        <Stat label="Out of stock" value={String(out)} tone={out ? "text-rose-400" : undefined} />
        <Stat label="Store" value={store?.name ?? "—"} />
      </div>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item name, SKU or scan a barcode" className="max-w-sm" />

      {!store && !loading && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Your account has no store or location assigned, so there is no stock to show. Ask your manager to assign you to a
          store — a cashier cannot create one.
        </div>
      )}

      <div className="overflow-auto rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
            <tr>{["Item", "SKU", "Available", "Price"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.name}-${r.sku ?? ""}`} className="border-t border-slate-800">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-slate-400">{r.sku ?? "—"}</td>
                <td className={`px-3 py-2 font-semibold ${r.qty <= 0 ? "text-rose-400" : r.reorder > 0 && r.qty <= r.reorder ? "text-amber-400" : ""}`}>
                  {r.qty}
                </td>
                <td className="px-3 py-2">{kw(r.price)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                {loading ? "Loading your store stock…" : "Nothing matches that search."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Quantities come straight from the stock records for {store?.name ?? "your store"}. A cashier can look stock up but
        cannot change balances, move stock between stores or create locations.
        {a?.displayName ? ` Signed in as ${a.displayName}.` : ""}
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-lg font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
