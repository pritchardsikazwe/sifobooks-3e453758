import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";

export const Route = createFileRoute("/_authenticated/reports/balance-sheet")({
  head: () => ({ meta: [{ title: "Balance Sheet — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BalanceSheetPage,
});

function BalanceSheetPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("ytd"), periodKey: "ytd" });
  const asAt = filters.range.to;
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: entries } = await supabase.from("journal_entries").select("id").eq("status", "posted").lte("entry_date", asAt);
      const ids = (entries ?? []).map((e: any) => e.id);
      if (!ids.length) { setLines([]); setLoading(false); return; }
      const { data: jl } = await supabase.from("journal_lines")
        .select("debit,credit,account:account_id(account_code,account_name,account_type)")
        .in("entry_id", ids);
      setLines(jl ?? []);
      setLoading(false);
    })();
  }, [asAt]);

  const groups = useMemo(() => {
    const byAcc = new Map<string, { code: string; name: string; type: string; balance: number }>();
    lines.forEach((l: any) => {
      const a = l.account; if (!a) return;
      const key = a.account_code + a.account_name;
      const cur = byAcc.get(key) ?? { code: a.account_code, name: a.account_name, type: a.account_type, balance: 0 };
      // Assets & expenses: debit-normal. Liabilities, equity, revenue: credit-normal.
      const dr = ["asset", "expense"].includes(a.account_type);
      cur.balance += dr ? num(l.debit) - num(l.credit) : num(l.credit) - num(l.debit);
      byAcc.set(key, cur);
    });
    const all = Array.from(byAcc.values());
    // Add net income into equity
    const netIncome =
      all.filter((r) => r.type === "revenue").reduce((s, r) => s + r.balance, 0) -
      all.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);
    const assets = all.filter((r) => r.type === "asset");
    const liabilities = all.filter((r) => r.type === "liability");
    const equity = all.filter((r) => r.type === "equity");
    return { assets, liabilities, equity, netIncome };
  }, [lines]);

  const totalAssets = groups.assets.reduce((s, r) => s + r.balance, 0);
  const totalLiab = groups.liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquity = groups.equity.reduce((s, r) => s + r.balance, 0) + groups.netIncome;

  const csvRows = [
    ...groups.assets.map((r) => ({ Section: "Asset", Code: r.code, Account: r.name, Balance: r.balance.toFixed(2) })),
    ...groups.liabilities.map((r) => ({ Section: "Liability", Code: r.code, Account: r.name, Balance: r.balance.toFixed(2) })),
    ...groups.equity.map((r) => ({ Section: "Equity", Code: r.code, Account: r.name, Balance: r.balance.toFixed(2) })),
    { Section: "Equity", Code: "-", Account: "Retained earnings (period)", Balance: groups.netIncome.toFixed(2) },
  ];

  return (
    <ReportShell title="Balance Sheet" subtitle={`As at ${asAt} · ${filters.range.label} · posted entries only`} loading={loading} filename="balance-sheet" rows={csvRows}>
      <ReportFilterBar initial={{ periodKey: "ytd" }} onApply={setFilters} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <Side title="Assets" items={groups.assets} total={totalAssets} />
        <div>
          <Side title="Liabilities" items={groups.liabilities} total={totalLiab} />
          <Side title="Equity" items={[...groups.equity, { code: "-", name: "Retained earnings (period)", balance: groups.netIncome }]} total={totalEquity} />
          <div className="mt-4 pt-3 border-t-2 flex justify-between font-bold">
            <span>Total Liab + Equity</span><span>{fmt(totalLiab + totalEquity)}</span>
          </div>
        </div>
      </div>
      <div className={`mt-6 text-xs ${Math.abs(totalAssets - (totalLiab + totalEquity)) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>
        {Math.abs(totalAssets - (totalLiab + totalEquity)) < 0.01
          ? "✓ Books balance." : `⚠ Out of balance by ${fmt(totalAssets - (totalLiab + totalEquity))}`}
      </div>
    </ReportShell>
  );
}

function Side({ title, items, total }: { title: string; items: any[]; total: number }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-slate-700 mb-1">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((r) => (
            <tr key={r.code + r.name} className="border-b">
              <td className="py-1.5 text-slate-500 w-16">{r.code}</td>
              <td>{r.name}</td>
              <td className="text-right">{fmt(r.balance)}</td>
            </tr>
          ))}
          {!items.length && <tr><td className="py-2 text-slate-400" colSpan={3}>No entries</td></tr>}
        </tbody>
        <tfoot><tr className="font-semibold"><td colSpan={2} className="pt-2">Total {title}</td><td className="pt-2 text-right">{fmt(total)}</td></tr></tfoot>
      </table>
    </div>
  );
}
