import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";

export const Route = createFileRoute("/_authenticated/reports/cash-flow")({
  head: () => ({ meta: [{ title: "Cash Flow — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CashFlowPage,
});

function CashFlowPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to, label } = filters.range;
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("bank_transactions")
        .select("txn_date,amount,description,category")
        .gte("txn_date", from).lte("txn_date", to)
        .order("txn_date");
      setTxns(data ?? []);
      setLoading(false);
    })();
  }, [from, to]);

  const rows = useMemo(() => {
    const map = new Map<string, { month: string; inflow: number; outflow: number }>();
    txns.forEach((t: any) => {
      const m = (t.txn_date ?? "").slice(0, 7);
      const r = map.get(m) ?? { month: m, inflow: 0, outflow: 0 };
      const a = num(t.amount);
      if (a >= 0) r.inflow += a; else r.outflow += -a;
      map.set(m, r);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [txns]);

  const totIn = rows.reduce((s, r) => s + r.inflow, 0);
  const totOut = rows.reduce((s, r) => s + r.outflow, 0);
  const csv = rows.map((r) => ({ Month: r.month, Inflow: r.inflow.toFixed(2), Outflow: r.outflow.toFixed(2), Net: (r.inflow - r.outflow).toFixed(2) }));

  return (
    <ReportShell title="Cash Flow (simple)" subtitle={`Monthly bank movement summary · ${label}`} loading={loading} filename="cash-flow" rows={csv}>
      <ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />
      <table className="w-full text-sm mt-4">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr><th className="text-left py-2">Month</th><th className="text-right">Inflow</th><th className="text-right">Outflow</th><th className="text-right">Net</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.month}>
              <td className="py-1.5">{r.month || "—"}</td>
              <td className="text-right text-emerald-700">{fmt(r.inflow)}</td>
              <td className="text-right text-rose-700">{fmt(r.outflow)}</td>
              <td className={`text-right font-semibold ${r.inflow - r.outflow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmt(r.inflow - r.outflow)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="py-4 text-slate-400">No bank transactions.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr>
            <td className="pt-2">Totals</td>
            <td className="pt-2 text-right">{fmt(totIn)}</td>
            <td className="pt-2 text-right">{fmt(totOut)}</td>
            <td className="pt-2 text-right">{fmt(totIn - totOut)}</td>
          </tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
