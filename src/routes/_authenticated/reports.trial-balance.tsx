import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/trial-balance")({
  head: () => ({ meta: [{ title: "Trial Balance — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: entries } = await supabase.from("journal_entries").select("id").eq("status", "posted");
      const ids = (entries ?? []).map((e: any) => e.id);
      if (!ids.length) { setLines([]); setLoading(false); return; }
      const { data: jl } = await supabase.from("journal_lines")
        .select("debit,credit,account:account_id(account_code,account_name,account_type)")
        .in("entry_id", ids);
      setLines(jl ?? []);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    const byAcc = new Map<string, any>();
    lines.forEach((l: any) => {
      const a = l.account; if (!a) return;
      const k = a.account_code + a.account_name;
      const cur = byAcc.get(k) ?? { code: a.account_code, name: a.account_name, type: a.account_type, debit: 0, credit: 0 };
      cur.debit += num(l.debit); cur.credit += num(l.credit);
      byAcc.set(k, cur);
    });
    return Array.from(byAcc.values()).sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [lines]);

  const totalDR = rows.reduce((s, r) => s + r.debit, 0);
  const totalCR = rows.reduce((s, r) => s + r.credit, 0);
  const csv = rows.map((r) => ({ Code: r.code, Account: r.name, Type: r.type, Debit: r.debit.toFixed(2), Credit: r.credit.toFixed(2) }));

  return (
    <ReportShell title="Trial Balance" subtitle="All posted journal entries" loading={loading} filename="trial-balance" rows={csv}>
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr><th className="text-left py-2">Code</th><th className="text-left">Account</th><th className="text-left">Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.code + r.name}>
              <td className="py-1.5 text-slate-500">{r.code}</td>
              <td>{r.name}</td>
              <td className="text-slate-500 capitalize">{r.type}</td>
              <td className="text-right">{r.debit > 0 ? fmt(r.debit) : ""}</td>
              <td className="text-right">{r.credit > 0 ? fmt(r.credit) : ""}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="py-4 text-slate-400">No posted entries.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr><td colSpan={3} className="pt-2">Totals</td><td className="pt-2 text-right">{fmt(totalDR)}</td><td className="pt-2 text-right">{fmt(totalCR)}</td></tr>
        </tfoot>
      </table>
      {Math.abs(totalDR - totalCR) > 0.01 && (
        <div className="mt-3 text-xs text-rose-600">⚠ Out of balance by {fmt(totalDR - totalCR)}</div>
      )}
    </ReportShell>
  );
}
