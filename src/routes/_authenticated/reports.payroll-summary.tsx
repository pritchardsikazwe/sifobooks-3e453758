import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/payroll-summary")({
  head: () => ({ meta: [{ title: "Payroll Summary — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PayrollPage,
});

function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("payroll_runs")
        .select("run_number,period_year,period_month,pay_date,status,total_gross,total_paye,total_napsa,total_nhima,total_net")
        .order("period_year", { ascending: false }).order("period_month", { ascending: false });
      setRuns(data ?? []);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => runs.reduce((acc, r) => ({
    gross: acc.gross + num(r.total_gross),
    paye: acc.paye + num(r.total_paye),
    napsa: acc.napsa + num(r.total_napsa),
    nhima: acc.nhima + num(r.total_nhima),
    net: acc.net + num(r.total_net),
  }), { gross: 0, paye: 0, napsa: 0, nhima: 0, net: 0 }), [runs]);

  const csv = runs.map((r) => ({
    Run: r.run_number, Period: `${r.period_year}-${String(r.period_month).padStart(2, "0")}`,
    Pay_Date: r.pay_date, Status: r.status,
    Gross: num(r.total_gross).toFixed(2), PAYE: num(r.total_paye).toFixed(2),
    NAPSA: num(r.total_napsa).toFixed(2), NHIMA: num(r.total_nhima).toFixed(2), Net: num(r.total_net).toFixed(2),
  }));

  return (
    <ReportShell title="Payroll Summary" subtitle={`${runs.length} runs`} loading={loading} filename="payroll-summary" rows={csv}>
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr>
            <th className="text-left py-2">Run</th><th className="text-left">Period</th><th className="text-left">Status</th>
            <th className="text-right">Gross</th><th className="text-right">PAYE</th>
            <th className="text-right">NAPSA</th><th className="text-right">NHIMA</th><th className="text-right">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {runs.map((r) => (
            <tr key={r.run_number}>
              <td className="py-1.5 font-medium">{r.run_number}</td>
              <td>{r.period_year}-{String(r.period_month).padStart(2, "0")}</td>
              <td className="capitalize text-slate-500">{r.status}</td>
              <td className="text-right">{fmt(num(r.total_gross))}</td>
              <td className="text-right">{fmt(num(r.total_paye))}</td>
              <td className="text-right">{fmt(num(r.total_napsa))}</td>
              <td className="text-right">{fmt(num(r.total_nhima))}</td>
              <td className="text-right font-semibold">{fmt(num(r.total_net))}</td>
            </tr>
          ))}
          {!runs.length && <tr><td colSpan={8} className="py-4 text-slate-400">No payroll runs.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr>
            <td colSpan={3} className="pt-2">Totals</td>
            <td className="pt-2 text-right">{fmt(totals.gross)}</td>
            <td className="pt-2 text-right">{fmt(totals.paye)}</td>
            <td className="pt-2 text-right">{fmt(totals.napsa)}</td>
            <td className="pt-2 text-right">{fmt(totals.nhima)}</td>
            <td className="pt-2 text-right">{fmt(totals.net)}</td>
          </tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
