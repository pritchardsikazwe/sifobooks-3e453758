import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/bank-reconciliation")({
  head: () => ({ meta: [{ title: "Bank Reconciliation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BankReconciliationReport,
});

function BankReconciliationReport() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [session, setSession] = useState<any | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("reconciliation_sessions")
        .select("id,statement_date,statement_balance,book_balance,difference,status,bank_account:bank_account_id(account_name)")
        .order("statement_date", { ascending: false });
      setSessions(data ?? []);
      if (data && data.length && !sessionId) setSessionId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("reconciliation_sessions")
        .select("*,bank_account:bank_account_id(account_name,bank_name,account_number)")
        .eq("id", sessionId).single();
      setSession(s);
      const { data: ls } = await supabase.from("reconciliation_lines")
        .select("cleared, bank_txn:bank_txn_id(id,txn_date,description,reference,amount)")
        .eq("session_id", sessionId);
      setLines(ls ?? []);
      setLoading(false);
    })();
  }, [sessionId]);

  const cleared = useMemo(() => (lines ?? []).filter((l) => l.cleared).map((l) => l.bank_txn).filter(Boolean), [lines]);
  const outstandingDep = cleared.filter((t: any) => num(t.amount) > 0);
  const outstandingPay = cleared.filter((t: any) => num(t.amount) < 0);
  const balanced = session ? Math.abs(num(session.difference)) < 0.01 : false;

  const csv = cleared.map((t: any) => ({
    Date: t.txn_date, Description: t.description, Reference: t.reference, Amount: num(t.amount).toFixed(2),
  }));

  return (
    <ReportShell
      title="Bank Reconciliation" subtitle={session ? `${session.bank_account?.account_name ?? ""} — ${session.statement_date}` : ""}
      loading={loading} filename={`bank-recon-${session?.statement_date ?? "session"}`} rows={csv}
      filters={
        <Select value={sessionId} onValueChange={setSessionId}>
          <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Select session" /></SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.statement_date} — {s.bank_account?.account_name ?? "—"} ({s.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {!session ? (
        <div className="text-sm text-slate-500 py-6">No reconciliation sessions yet.</div>
      ) : (
        <div className="space-y-6">
          <div className={`rounded-lg p-4 flex items-center justify-between ${balanced ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
            <div className="flex items-center gap-2">
              {balanced ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
              <span className={`font-semibold ${balanced ? "text-emerald-700" : "text-rose-700"}`}>
                {balanced ? "Reconciled" : `Difference found: ${fmt(num(session.difference))}`}
              </span>
            </div>
            <div className="text-xs text-slate-500 uppercase">{session.status}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-slate-500 uppercase mb-2">Account</div>
              <div className="font-semibold">{session.bank_account?.account_name}</div>
              <div className="text-slate-500 text-xs">{session.bank_account?.bank_name} · {session.bank_account?.account_number}</div>
            </div>
            <div className="rounded-lg border p-4 grid grid-cols-2 gap-2">
              <div><div className="text-xs text-slate-500">Statement balance</div><div className="font-semibold">{fmt(num(session.statement_balance))}</div></div>
              <div><div className="text-xs text-slate-500">Book balance</div><div className="font-semibold">{fmt(num(session.book_balance))}</div></div>
              <div><div className="text-xs text-slate-500">Cleared deposits</div><div>{fmt(num(session.cleared_deposits))}</div></div>
              <div><div className="text-xs text-slate-500">Cleared payments</div><div>{fmt(num(session.cleared_payments))}</div></div>
            </div>
          </div>

          <ClearedTable title="Cleared deposits" items={outstandingDep} />
          <ClearedTable title="Cleared payments" items={outstandingPay.map((t: any) => ({ ...t, amount: -num(t.amount) }))} />
        </div>
      )}
    </ReportShell>
  );
}

function ClearedTable({ title, items }: { title: string; items: any[] }) {
  const total = items.reduce((s, t) => s + num(t.amount), 0);
  return (
    <div>
      <div className="text-sm font-semibold text-slate-700 mb-1">{title}</div>
      <table className="w-full text-xs">
        <thead className="text-[11px] text-slate-500 uppercase border-b">
          <tr><th className="text-left py-1 w-24">Date</th><th className="text-left">Description</th><th className="text-left w-32">Reference</th><th className="text-right w-28">Amount</th></tr>
        </thead>
        <tbody className="divide-y">
          {items.map((t: any) => (
            <tr key={t.id}><td className="py-1">{t.txn_date}</td><td>{t.description}</td><td className="text-slate-500">{t.reference}</td><td className="text-right">{fmt(num(t.amount))}</td></tr>
          ))}
          {!items.length && <tr><td colSpan={4} className="py-2 text-slate-400">None</td></tr>}
        </tbody>
        <tfoot className="border-t font-semibold"><tr><td colSpan={3} className="pt-1">Total</td><td className="pt-1 text-right">{fmt(total)}</td></tr></tfoot>
      </table>
    </div>
  );
}
