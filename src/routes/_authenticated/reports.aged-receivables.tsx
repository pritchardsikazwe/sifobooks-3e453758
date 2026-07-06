import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, ageBucket } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/aged-receivables")({
  head: () => ({ meta: [{ title: "Aged Receivables — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AgedRecPage,
});

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;

function AgedRecPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("invoices")
        .select("id,number,issue_date,due_date,total,balance_due,status,customer:customer_id(name)")
        .neq("status", "voided").gt("balance_due", 0).order("due_date");
      setInvoices(data ?? []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { customer: string; buckets: Record<string, number>; total: number }>();
    invoices.forEach((inv: any) => {
      const cust = inv.customer?.name ?? "(unknown)";
      const b = ageBucket(inv.due_date);
      const row = map.get(cust) ?? { customer: cust, buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }, total: 0 };
      row.buckets[b] += num(inv.balance_due);
      row.total += num(inv.balance_due);
      map.set(cust, row);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const totals = BUCKETS.reduce<Record<string, number>>((a, b) => ({ ...a, [b]: grouped.reduce((s, r) => s + r.buckets[b], 0) }), {});
  const grand = grouped.reduce((s, r) => s + r.total, 0);

  const csv = grouped.map((r) => ({ Customer: r.customer, ...r.buckets, Total: r.total.toFixed(2) }));

  return (
    <ReportShell title="Aged Receivables" subtitle="Outstanding invoices bucketed by days overdue" loading={loading} filename="aged-receivables" rows={csv}>
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr><th className="text-left py-2">Customer</th>{BUCKETS.map((b) => <th key={b} className="text-right">{b}</th>)}<th className="text-right">Total</th></tr>
        </thead>
        <tbody className="divide-y">
          {grouped.map((r) => (
            <tr key={r.customer}>
              <td className="py-1.5">{r.customer}</td>
              {BUCKETS.map((b) => <td key={b} className="text-right">{r.buckets[b] ? fmt(r.buckets[b]) : "—"}</td>)}
              <td className="text-right font-semibold">{fmt(r.total)}</td>
            </tr>
          ))}
          {!grouped.length && <tr><td colSpan={7} className="py-4 text-slate-400">No outstanding invoices.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr><td className="pt-2">Totals</td>{BUCKETS.map((b) => <td key={b} className="pt-2 text-right">{fmt(totals[b])}</td>)}<td className="pt-2 text-right">{fmt(grand)}</td></tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
