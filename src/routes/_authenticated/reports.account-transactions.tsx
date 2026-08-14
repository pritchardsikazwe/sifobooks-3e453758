import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";

export const Route = createFileRoute("/_authenticated/reports/account-transactions")({
  head: () => ({ meta: [{ title: "Account Transactions — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    account: (s.account as string) || "",
  }),
  component: AccountTransactionsPage,
});

function AccountTransactionsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });

  const acctId = search.account;
  const { from, to, label } = filters.range;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("chart_of_accounts").select("id,account_code,account_name,account_type").order("account_code");
      setAccounts(data ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!acctId) { setLines([]); setOpeningBalance(0); setLoading(false); return; }
      setLoading(true);

      // Opening balance = sum of postings before "from"
      let opening = 0;
      if (from) {
        const { data: prior } = await supabase.from("journal_lines")
          .select("debit,credit,entry:entry_id!inner(entry_date,status)")
          .eq("account_id", acctId)
          .lt("entry.entry_date", from)
          .eq("entry.status", "posted");
        opening = (prior ?? []).reduce((s: number, l: any) => s + num(l.debit) - num(l.credit), 0);
      }
      setOpeningBalance(opening);

      let q = supabase.from("journal_lines")
        .select("id,debit,credit,description,entry:entry_id!inner(id,entry_number,entry_date,reference,description,status)")
        .eq("account_id", acctId)
        .eq("entry.status", "posted");
      if (from) q = q.gte("entry.entry_date", from);
      if (to) q = q.lte("entry.entry_date", to);
      const { data } = await q;
      const sorted = (data ?? []).sort((a: any, b: any) => (a.entry.entry_date > b.entry.entry_date ? 1 : -1));
      setLines(sorted);
      setLoading(false);
    })();
  }, [acctId, from, to]);

  const acct = accounts.find(a => a.id === acctId);
  const isDrNormal = acct && ["asset", "expense", "cogs"].includes(acct.account_type);

  const withRunning = useMemo(() => {
    let bal = openingBalance;
    return lines.map((l: any) => {
      bal += num(l.debit) - num(l.credit);
      return { ...l, running: bal };
    });
  }, [lines, openingBalance]);

  const totalDr = lines.reduce((s, l) => s + num(l.debit), 0);
  const totalCr = lines.reduce((s, l) => s + num(l.credit), 0);
  const movement = totalDr - totalCr;
  const closing = openingBalance + movement;

  const csv = withRunning.map((l: any) => ({
    Date: l.entry.entry_date, Entry: l.entry.entry_number, Reference: l.entry.reference ?? "",
    Description: l.description ?? l.entry.description ?? "",
    Debit: num(l.debit).toFixed(2), Credit: num(l.credit).toFixed(2),
    Balance: (l.running as number).toFixed(2),
  }));

  return (
    <ReportShell
      title="Account Transactions"
      subtitle={acct ? `${acct.account_code} — ${acct.account_name} · ${label}` : "Pick an account"}
      loading={loading} filename={`acct-${acct?.account_code ?? "all"}`} rows={csv}
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap text-sm">
        <Link to="/chart-of-accounts" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />Back to COA
        </Link>
      </div>

      <ReportFilterBar
        initial={{ periodKey: "this-month" }}
        onApply={setFilters}
        extraFilters={
          <div className="min-w-[220px]">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Account</Label>
            <Select value={acctId} onValueChange={v => navigate({ search: { ...search, account: v } })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select account…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {acctId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 mt-4">
            <div className="p-3 rounded border bg-slate-50"><div className="text-xs text-slate-500">Opening</div><div className="font-semibold">{fmt(openingBalance)}</div></div>
            <div className="p-3 rounded border bg-slate-50"><div className="text-xs text-slate-500">Debits</div><div className="font-semibold">{fmt(totalDr)}</div></div>
            <div className="p-3 rounded border bg-slate-50"><div className="text-xs text-slate-500">Credits</div><div className="font-semibold">{fmt(totalCr)}</div></div>
            <div className="p-3 rounded border bg-emerald-50"><div className="text-xs text-slate-500">Closing {isDrNormal ? "(Dr)" : "(Cr)"}</div><div className="font-semibold">{fmt(isDrNormal ? closing : -closing)}</div></div>
          </div>

          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase border-b">
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-left">Entry</th>
                <th className="text-left">Reference</th>
                <th className="text-left">Description</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="bg-slate-50"><td colSpan={6} className="py-1.5 text-slate-500">Opening balance</td><td className="text-right font-medium">{fmt(openingBalance)}</td></tr>
              {withRunning.map((l: any) => (
                <tr key={l.id}>
                  <td className="py-1.5 text-slate-500">{l.entry.entry_date}</td>
                  <td className="text-slate-500">{l.entry.entry_number}</td>
                  <td className="text-slate-500">{l.entry.reference}</td>
                  <td>{l.description ?? l.entry.description}</td>
                  <td className="text-right">{num(l.debit) > 0 ? fmt(num(l.debit)) : ""}</td>
                  <td className="text-right">{num(l.credit) > 0 ? fmt(num(l.credit)) : ""}</td>
                  <td className="text-right">{fmt(l.running)}</td>
                </tr>
              ))}
              {!withRunning.length && <tr><td colSpan={7} className="py-4 text-slate-400">No transactions.</td></tr>}
            </tbody>
            <tfoot className="border-t-2 font-semibold">
              <tr>
                <td colSpan={4} className="pt-2">Totals</td>
                <td className="pt-2 text-right">{fmt(totalDr)}</td>
                <td className="pt-2 text-right">{fmt(totalCr)}</td>
                <td className="pt-2 text-right">{fmt(closing)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </ReportShell>
  );
}
