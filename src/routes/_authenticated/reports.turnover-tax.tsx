import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, monthRange } from "@/lib/reports";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/reports/turnover-tax")({
  head: () => ({ meta: [{ title: "Turnover Tax — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: TurnoverTaxPage,
});

// Zambia Turnover Tax: 5% of gross turnover (for businesses below VAT threshold ~K800k pa).
function TurnoverTaxPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [rate, setRate] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { from, to } = monthRange(month);
      const { data } = await supabase.from("invoices")
        .select("invoice_number,issue_date,subtotal,total,status,customers(name)")
        .gte("issue_date", from).lte("issue_date", to).neq("status", "draft");
      setInvoices(data ?? []);
      setLoading(false);
    })();
  }, [month]);

  const turnover = invoices.reduce((s, r) => s + num(r.total), 0);
  const tot = +(turnover * rate / 100).toFixed(2);
  const dueDate = (() => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m, 14); return d.toISOString().slice(0, 10); })();

  const rows = [
    { Line: "Gross turnover for period", Amount: turnover.toFixed(2) },
    { Line: `Turnover Tax @ ${rate}%`, Amount: tot.toFixed(2) },
    { Line: "Due date (14th of following month)", Amount: dueDate },
  ];

  return (
    <ReportShell
      title="Turnover Tax"
      subtitle={`For businesses below the VAT threshold · ${month}`}
      loading={loading} filename={`turnover-tax-${month}`} rows={rows}
      filters={<Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-9 w-40" />}
    >
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div><Label className="text-xs">Rate %</Label><Input type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value))} /></div>
        <div className="rounded-lg border p-4 bg-emerald-50 text-emerald-700 border-emerald-200">
          <div className="text-xs font-semibold uppercase">Turnover</div>
          <div className="text-2xl font-bold mt-1">{fmt(turnover)}</div>
        </div>
        <div className="rounded-lg border p-4 bg-rose-50 text-rose-700 border-rose-200">
          <div className="text-xs font-semibold uppercase">TOT Payable</div>
          <div className="text-2xl font-bold mt-1">{fmt(tot)}</div>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs">
            <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Invoice</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No invoices in period.</td></tr>
              : invoices.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r.issue_date}</td>
                  <td className="px-3 py-2 font-mono">{r.invoice_number}</td>
                  <td className="px-3 py-2">{r.customers?.name ?? ""}</td>
                  <td className="px-3 py-2 text-right">{fmt(num(r.total))}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500">
        Return: <span className="font-medium">ZRA Turnover Tax return</span>. Rate is 5% of gross turnover; adjust above if ZRA revises it.
      </div>
    </ReportShell>
  );
}
