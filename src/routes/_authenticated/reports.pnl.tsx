import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, monthRange } from "@/lib/reports";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/reports/pnl")({
  head: () => ({ meta: [{ title: "Profit & Loss — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PnLPage,
});

function PnLPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { from, to } = monthRange(month);
      const { data: entries } = await supabase.from("journal_entries")
        .select("id").eq("status", "posted").gte("entry_date", from).lte("entry_date", to);
      const ids = (entries ?? []).map((e: any) => e.id);
      if (!ids.length) { setLines([]); setLoading(false); return; }
      const { data: jl } = await supabase.from("journal_lines")
        .select("debit,credit,account:account_id(account_code,account_name,account_type)")
        .in("entry_id", ids);
      setLines(jl ?? []);
      setLoading(false);
    })();
  }, [month]);

  const { revenue, expense, rows } = useMemo(() => {
    const byAcc = new Map<string, { code: string; name: string; type: string; amount: number }>();
    lines.forEach((l: any) => {
      const a = l.account; if (!a) return;
      const key = a.account_code + a.account_name;
      const cur = byAcc.get(key) ?? { code: a.account_code, name: a.account_name, type: a.account_type, amount: 0 };
      // Revenue: credits increase; Expense: debits increase
      if (a.account_type === "revenue") cur.amount += num(l.credit) - num(l.debit);
      else if (a.account_type === "expense") cur.amount += num(l.debit) - num(l.credit);
      byAcc.set(key, cur);
    });
    const rows = Array.from(byAcc.values()).filter((r) => r.type === "revenue" || r.type === "expense");
    const revenue = rows.filter((r) => r.type === "revenue").reduce((s, r) => s + r.amount, 0);
    const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
    return { revenue, expense, rows };
  }, [lines]);

  const net = revenue - expense;
  const csvRows = rows.map((r) => ({ Type: r.type, Code: r.code, Account: r.name, Amount: r.amount.toFixed(2) }));

  return (
    <ReportShell
      title="Profit & Loss" subtitle={`Period: ${month}`}
      loading={loading} filename={`pnl-${month}`} rows={csvRows}
      filters={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-40" />}
    >
      <Section title="Revenue" items={rows.filter((r) => r.type === "revenue")} total={revenue} />
      <Section title="Expenses" items={rows.filter((r) => r.type === "expense")} total={expense} />
      <div className={`mt-6 pt-4 border-t-2 flex justify-between text-lg font-bold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
        <span>Net {net >= 0 ? "Profit" : "Loss"}</span>
        <span>{fmt(Math.abs(net))}</span>
      </div>
    </ReportShell>
  );
}

function Section({ title, items, total }: { title: string; items: any[]; total: number }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-semibold text-slate-700 mb-1">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((r) => (
            <tr key={r.code + r.name} className="border-b">
              <td className="py-1.5 text-slate-500 w-20">{r.code}</td>
              <td>{r.name}</td>
              <td className="text-right">{fmt(r.amount)}</td>
            </tr>
          ))}
          {!items.length && <tr><td className="py-2 text-slate-400" colSpan={3}>No entries</td></tr>}
        </tbody>
        <tfoot>
          <tr className="font-semibold"><td colSpan={2} className="pt-2">Total {title}</td><td className="pt-2 text-right">{fmt(total)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
