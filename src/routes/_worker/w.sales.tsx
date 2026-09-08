import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadAssignment, mySales, monthlyHistory, kw, type CashierAssignment, type Period } from "@/lib/cashier-workspace";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_worker/w/sales")({
  head: () => ({
    meta: [
      { title: "My Sales — SifoBooks Cashier" },
      { name: "description", content: "Every sale you rang up, by day, week or month, with your own product totals and monthly history." },
      { property: "og:title", content: "My Sales — SifoBooks Cashier" },
      { property: "og:description", content: "Your receipts, quantities, discounts, VAT and payment methods in one list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MySales,
});

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

function MySales() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"sales" | "products" | "history">("sales");
  const [data, setData] = useState<Awaited<ReturnType<typeof mySales>> | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof monthlyHistory>>>([]);

  useEffect(() => {
    void (async () => {
      const asg = await loadAssignment();
      setA(asg);
      if (asg) setHistory(await monthlyHistory(asg.tenantId, asg.cashierUserId));
    })();
  }, []);

  useEffect(() => {
    if (!a) return;
    void mySales(a.cashierUserId, period, from, to).then(setData);
  }, [a, period, from, to]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold">My sales</h1>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1.5 text-sm ${period === p.key ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-auto" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sales" value={kw(data?.totals.gross ?? 0)} />
        <Stat label="Receipts" value={String(data?.totals.count ?? 0)} />
        <Stat label="Discounts" value={kw(data?.totals.discounts ?? 0)} />
        <Stat label="Refunds" value={kw(data?.totals.refunds ?? 0)} />
      </div>

      <div className="flex gap-2 border-b border-slate-800">
        {([["sales", "Receipts"], ["products", "By product"], ["history", "Monthly history"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm ${tab === k ? "border-b-2 border-emerald-500 font-semibold text-emerald-400" : "text-slate-400"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-800">
        {tab === "sales" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="p-2">Date</th><th className="p-2">Receipt</th><th className="p-2">Customer</th>
                <th className="p-2 text-right">Items</th><th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Amount</th><th className="p-2 text-right">Discount</th>
                <th className="p-2 text-right">VAT</th><th className="p-2">Payment</th><th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sales ?? []).map((s: any) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="p-2 whitespace-nowrap">{new Date(s.sold_at).toLocaleString("en-ZM", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="p-2">{s.sale_no}</td>
                  <td className="p-2">{s.customer_name ?? "Walk-in"}</td>
                  <td className="p-2 text-right">{s.items}</td>
                  <td className="p-2 text-right">{s.qty}</td>
                  <td className="p-2 text-right">{kw(Number(s.total))}</td>
                  <td className="p-2 text-right">{kw(Number(s.discount))}</td>
                  <td className="p-2 text-right">{kw(Number(s.tax))}</td>
                  <td className="p-2">{s.method}</td>
                  <td className="p-2 capitalize">{s.status}</td>
                </tr>
              ))}
              {!data?.sales.length && <tr><td colSpan={10} className="p-6 text-center text-slate-500">No sales in this period.</td></tr>}
            </tbody>
          </table>
        )}

        {tab === "products" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
              <tr><th className="p-2">Product</th><th className="p-2 text-right">Quantity sold</th><th className="p-2 text-right">Sales value</th></tr>
            </thead>
            <tbody>
              {(data?.byProduct ?? []).map((p) => (
                <tr key={p.name} className="border-t border-slate-800">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 text-right">{p.qty}</td>
                  <td className="p-2 text-right">{kw(p.value)}</td>
                </tr>
              ))}
              {!data?.byProduct.length && <tr><td colSpan={3} className="p-6 text-center text-slate-500">Nothing sold in this period.</td></tr>}
            </tbody>
          </table>
        )}

        {tab === "history" && (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="p-2">Month</th><th className="p-2 text-right">Shifts</th><th className="p-2 text-right">Sales</th>
                <th className="p-2 text-right">Expected cash</th><th className="p-2 text-right">Counted cash</th>
                <th className="p-2 text-right">Cash variance</th><th className="p-2">Approval</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => (
                <tr key={m.month} className="border-t border-slate-800">
                  <td className="p-2">{new Date(`${m.month}-01`).toLocaleDateString("en-ZM", { month: "long", year: "numeric" })}</td>
                  <td className="p-2 text-right">{m.shifts}</td>
                  <td className="p-2 text-right">{kw(m.sales)}</td>
                  <td className="p-2 text-right">{kw(m.cashExpected)}</td>
                  <td className="p-2 text-right">{kw(m.cashActual)}</td>
                  <td className={`p-2 text-right ${m.variance < 0 ? "text-rose-400" : m.variance > 0 ? "text-sky-400" : ""}`}>{kw(m.variance)}</td>
                  <td className="p-2">{m.approved} approved{m.pending ? ` · ${m.pending} pending` : ""}</td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No shift history yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
