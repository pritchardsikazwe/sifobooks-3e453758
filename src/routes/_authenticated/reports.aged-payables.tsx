import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, ageBucket } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/aged-payables")({
  head: () => ({ meta: [{ title: "Aged Payables — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AgedPayPage,
});

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;

function AgedPayPage() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("bills")
        .select("id,bill_number,bill_date,due_date,total,balance_due,status,supplier:supplier_id(name)")
        .gt("balance_due", 0).order("due_date");
      setBills(data ?? []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { supplier: string; buckets: Record<string, number>; total: number }>();
    bills.forEach((b: any) => {
      const s = b.supplier?.name ?? "(unknown)";
      const bk = ageBucket(b.due_date);
      const row = map.get(s) ?? { supplier: s, buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }, total: 0 };
      row.buckets[bk] += num(b.balance_due);
      row.total += num(b.balance_due);
      map.set(s, row);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [bills]);

  const totals = BUCKETS.reduce<Record<string, number>>((a, b) => ({ ...a, [b]: grouped.reduce((s, r) => s + r.buckets[b], 0) }), {});
  const grand = grouped.reduce((s, r) => s + r.total, 0);
  const csv = grouped.map((r) => ({ Supplier: r.supplier, ...r.buckets, Total: r.total.toFixed(2) }));

  return (
    <ReportShell title="Aged Payables" subtitle="Outstanding bills bucketed by days overdue" loading={loading} filename="aged-payables" rows={csv}>
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr><th className="text-left py-2">Supplier</th>{BUCKETS.map((b) => <th key={b} className="text-right">{b}</th>)}<th className="text-right">Total</th></tr>
        </thead>
        <tbody className="divide-y">
          {grouped.map((r) => (
            <tr key={r.supplier}>
              <td className="py-1.5">{r.supplier}</td>
              {BUCKETS.map((b) => <td key={b} className="text-right">{r.buckets[b] ? fmt(r.buckets[b]) : "—"}</td>)}
              <td className="text-right font-semibold">{fmt(r.total)}</td>
            </tr>
          ))}
          {!grouped.length && <tr><td colSpan={7} className="py-4 text-slate-400">No outstanding bills.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr><td className="pt-2">Totals</td>{BUCKETS.map((b) => <td key={b} className="pt-2 text-right">{fmt(totals[b])}</td>)}<td className="pt-2 text-right">{fmt(grand)}</td></tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
