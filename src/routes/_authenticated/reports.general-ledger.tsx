import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports/general-ledger")({
  head: () => ({ meta: [{ title: "General Ledger — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: GeneralLedgerPage,
});

type Row = {
  date: string; entry_no: string; reference: string; description: string;
  code: string; name: string; type: string; debit: number; credit: number; balance: number;
};

function GeneralLedgerPage() {
  const today = new Date().toISOString().slice(0, 10);
  const first = new Date(); first.setDate(1);
  const [from, setFrom] = useState(first.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: entries } = await supabase.from("journal_entries")
        .select("id,entry_number,entry_date,reference,description")
        .eq("status", "posted").gte("entry_date", from).lte("entry_date", to)
        .order("entry_date", { ascending: true });
      const ids = (entries ?? []).map((e: any) => e.id);
      if (!ids.length) { setRows([]); setLoading(false); return; }
      const byId = new Map<string, any>();
      (entries ?? []).forEach((e: any) => byId.set(e.id, e));
      const { data: jl } = await supabase.from("journal_lines")
        .select("entry_id,debit,credit,description,account:account_id(account_code,account_name,account_type)")
        .in("entry_id", ids);

      // Group by account, then compute running balance per account
      const byAcc = new Map<string, Row[]>();
      (jl ?? []).forEach((l: any) => {
        const a = l.account; if (!a) return;
        const e = byId.get(l.entry_id) ?? {};
        const k = a.account_code + "|" + a.account_name;
        const list = byAcc.get(k) ?? [];
        list.push({
          date: e.entry_date, entry_no: e.entry_number, reference: e.reference,
          description: l.description || e.description || "",
          code: a.account_code, name: a.account_name, type: a.account_type,
          debit: num(l.debit), credit: num(l.credit), balance: 0,
        });
        byAcc.set(k, list);
      });
      const out: Row[] = [];
      Array.from(byAcc.keys()).sort().forEach((k) => {
        const list = byAcc.get(k)!.sort((a, b) => a.date.localeCompare(b.date));
        let bal = 0;
        list.forEach((r) => {
          const debitNature = r.type === "asset" || r.type === "expense";
          bal += debitNature ? (r.debit - r.credit) : (r.credit - r.debit);
          r.balance = bal;
          out.push(r);
        });
      });
      setRows(out);
      setLoading(false);
    })();
  }, [from, to]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (type !== "all" && r.type !== type) return false;
    if (q && !(`${r.code} ${r.name} ${r.reference} ${r.description}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, type, q]);

  // Group for display
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    filtered.forEach((r) => {
      const k = `${r.code} — ${r.name}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    });
    return Array.from(m.entries());
  }, [filtered]);

  const csv = filtered.map((r) => ({
    Date: r.date, Entry: r.entry_no, Reference: r.reference, Account: `${r.code} ${r.name}`,
    Type: r.type, Description: r.description, Debit: r.debit.toFixed(2), Credit: r.credit.toFixed(2), Balance: r.balance.toFixed(2),
  }));

  return (
    <ReportShell
      title="General Ledger" subtitle={`${from} to ${to}`}
      loading={loading} filename={`general-ledger-${from}-${to}`} rows={csv}
      filters={
        <div className="flex gap-2 flex-wrap items-center">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="liability">Liability</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-48" />
        </div>
      }
    >
      {groups.map(([acc, list]) => {
        const dr = list.reduce((s, r) => s + r.debit, 0);
        const cr = list.reduce((s, r) => s + r.credit, 0);
        const closing = list[list.length - 1]?.balance ?? 0;
        return (
          <div key={acc} className="mb-6">
            <div className="text-sm font-semibold text-slate-700 border-b pb-1 mb-1">{acc}</div>
            <table className="w-full text-xs">
              <thead className="text-[11px] text-slate-500 uppercase">
                <tr>
                  <th className="text-left py-1 w-24">Date</th>
                  <th className="text-left w-28">Entry</th>
                  <th className="text-left w-32">Reference</th>
                  <th className="text-left">Description</th>
                  <th className="text-right w-24">Debit</th>
                  <th className="text-right w-24">Credit</th>
                  <th className="text-right w-28">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1">{r.date}</td>
                    <td className="text-slate-500">{r.entry_no}</td>
                    <td className="text-slate-500">{r.reference}</td>
                    <td>{r.description}</td>
                    <td className="text-right">{r.debit > 0 ? fmt(r.debit) : ""}</td>
                    <td className="text-right">{r.credit > 0 ? fmt(r.credit) : ""}</td>
                    <td className="text-right font-medium">{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t font-semibold">
                <tr>
                  <td colSpan={4} className="pt-1">Totals / Closing</td>
                  <td className="text-right pt-1">{fmt(dr)}</td>
                  <td className="text-right pt-1">{fmt(cr)}</td>
                  <td className="text-right pt-1">{fmt(closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
      {!groups.length && <div className="py-6 text-slate-400 text-sm">No posted entries in this range.</div>}
    </ReportShell>
  );
}
