import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadAssignment, resolveStoreLocation, storeStock, kw, type CashierAssignment, type StoreLocation } from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_worker/w/lookup")({
  head: () => ({
    meta: [
      { title: "Stock Lookup — SifoBooks Cashier" },
      { name: "description", content: "Search what is on the shelf at your own store, with selling prices — no costs, no other branches." },
      { property: "og:title", content: "Stock Lookup — SifoBooks Cashier" },
      { property: "og:description", content: "Quantities and selling prices for the products at your store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockLookup,
});

function StockLookup() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [store, setStore] = useState<StoreLocation | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ name: string; sku: string | null; qty: number; price: number }[]>([]);

  useEffect(() => {
    void (async () => {
      const asg = await loadAssignment();
      setA(asg);
      const loc = await resolveStoreLocation(asg);
      setStore(loc);
      if (asg && loc) setRows(await storeStock(asg.tenantId, loc.id, ""));
    })();
  }, []);

  const filtered = rows.filter((r) => !q || `${r.name} ${r.sku ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Stock lookup</h1>
        <p className="text-sm text-slate-400">{store?.name ?? "Your store"}{a?.branchName ? ` · ${a.branchName}` : ""}</p>
      </div>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or code" />

      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>{["Item", "Code", "On shelf", "Price"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.name}-${r.sku ?? ""}`} className="border-t border-slate-800">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-slate-400">{r.sku ?? "—"}</td>
                <td className={`px-3 py-2 font-semibold ${r.qty <= 0 ? "text-rose-400" : ""}`}>{r.qty}</td>
                <td className="px-3 py-2 text-right">{kw(r.price)}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Nothing found at this store.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
