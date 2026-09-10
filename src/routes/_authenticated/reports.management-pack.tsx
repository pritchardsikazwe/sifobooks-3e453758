import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, monthRange } from "@/lib/reports";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/management-pack")({
  head: () => ({ meta: [{ title: "Monthly Management Pack — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ManagementPackPage,
});

function ManagementPackPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<any[]>([]);
  const [ar, setAR] = useState<{ current: number; d30: number; d60: number; d90: number }>({ current: 0, d30: 0, d60: 0, d90: 0 });
  const [ap, setAP] = useState<{ current: number; d30: number; d60: number; d90: number }>({ current: 0, d30: 0, d60: 0, d90: 0 });
  const [cash, setCash] = useState<number>(0);
  const [insight, setInsight] = useState<string>("");
  const [aiBusy, setAIBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { from, to } = monthRange(month);
      const { data: entries } = await supabase.from("journal_entries")
        .select("id").eq("status", "posted").gte("entry_date", from).lte("entry_date", to);
      const ids = (entries ?? []).map((e: any) => e.id);
      const { data: jl } = ids.length
        ? await supabase.from("journal_lines")
            .select("debit,credit,account:account_id(account_code,account_name,account_type)")
            .in("entry_id", ids)
        : { data: [] as any[] };
      setLines(jl ?? []);

      // AR / AP aging
      const { data: inv } = await supabase.from("invoices")
        .select("balance_due,due_date").gt("balance_due", 0);
      const { data: bills } = await supabase.from("bills")
        .select("balance_due,due_date").gt("balance_due", 0);
      setAR(bucket(inv));
      setAP(bucket(bills));

      // Cash & Bank
      const { data: bal } = await supabase.from("bank_running_balance").select("current_balance");
      setCash((bal ?? []).reduce((s: number, b: any) => s + num(b.current_balance), 0));
      setLoading(false);
    })();
  }, [month]);

  const totals = useMemo(() => {
    let revenue = 0, expense = 0, assets = 0, liab = 0, equity = 0;
    lines.forEach((l: any) => {
      const a = l.account; if (!a) return;
      if (a.account_type === "revenue") revenue += num(l.credit) - num(l.debit);
      else if (a.account_type === "expense") expense += num(l.debit) - num(l.credit);
      else if (a.account_type === "asset") assets += num(l.debit) - num(l.credit);
      else if (a.account_type === "liability") liab += num(l.credit) - num(l.debit);
      else if (a.account_type === "equity") equity += num(l.credit) - num(l.debit);
    });
    return { revenue, expense, net: revenue - expense, assets, liab, equity };
  }, [lines]);

  const margin = totals.revenue > 0 ? (totals.net / totals.revenue) * 100 : 0;

  const generateInsight = async () => {
    setAIBusy(true); setInsight("");
    try {
      const context = {
        period: month,
        revenue: totals.revenue, expense: totals.expense, net: totals.net, margin,
        cash, ar_total: ar.current + ar.d30 + ar.d60 + ar.d90,
        ap_total: ap.current + ap.d30 + ap.d60 + ap.d90,
        overdue_ar: ar.d30 + ar.d60 + ar.d90, overdue_ap: ap.d30 + ap.d60 + ap.d90,
      };
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": "" },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: "You are a Zambian CFO. Write 4-6 concise, plain-English insights for a monthly management pack. Cover profitability, cash, receivables/payables risk, and one recommendation. No markdown headings." },
            { role: "user", content: `Financials for ${month}:\n${JSON.stringify(context, null, 2)}` },
          ],
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const j = await res.json();
      setInsight(j.choices?.[0]?.message?.content ?? "");
    } catch (e: any) {
      // AI Gateway auth is server-side; fall back to a rule-based summary.
      setInsight(fallbackInsight({ month, ...totals, margin, cash, ar, ap }));
      toast.info("Using rule-based insight (AI unavailable).");
    } finally {
      setAIBusy(false);
    }
  };

  const csv = [
    { Section: "P&L", Line: "Revenue", Amount: totals.revenue.toFixed(2) },
    { Section: "P&L", Line: "Expense", Amount: totals.expense.toFixed(2) },
    { Section: "P&L", Line: "Net", Amount: totals.net.toFixed(2) },
    { Section: "BS", Line: "Assets", Amount: totals.assets.toFixed(2) },
    { Section: "BS", Line: "Liabilities", Amount: totals.liab.toFixed(2) },
    { Section: "BS", Line: "Equity", Amount: totals.equity.toFixed(2) },
    { Section: "Cash", Line: "Bank balance", Amount: cash.toFixed(2) },
    { Section: "AR", Line: "Total outstanding", Amount: (ar.current + ar.d30 + ar.d60 + ar.d90).toFixed(2) },
    { Section: "AP", Line: "Total outstanding", Amount: (ap.current + ap.d30 + ap.d60 + ap.d90).toFixed(2) },
  ];

  return (
    <ReportShell
      title="Monthly Management Pack" subtitle={`Period: ${month}`}
      loading={loading} filename={`management-pack-${month}`} rows={csv}
      filters={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-40" />}
    >
      <div className="space-y-8 print:space-y-6">
        {/* Executive summary */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 border-b pb-1 mb-3">1. Executive Summary</h2>
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <Kpi label="Revenue" value={fmt(totals.revenue)} />
            <Kpi label="Expenses" value={fmt(totals.expense)} />
            <Kpi label={totals.net >= 0 ? "Net Profit" : "Net Loss"} value={fmt(Math.abs(totals.net))} tone={totals.net >= 0 ? "pos" : "neg"} />
            <Kpi label="Profit margin" value={`${margin.toFixed(1)}%`} tone={margin >= 0 ? "pos" : "neg"} />
            <Kpi label="Cash & Bank" value={fmt(cash)} />
            <Kpi label="Receivables" value={fmt(ar.current + ar.d30 + ar.d60 + ar.d90)} />
            <Kpi label="Payables" value={fmt(ap.current + ap.d30 + ap.d60 + ap.d90)} />
            <Kpi label="Overdue AR" value={fmt(ar.d30 + ar.d60 + ar.d90)} tone={ar.d30 + ar.d60 + ar.d90 > 0 ? "neg" : "neu"} />
          </div>
        </section>

        {/* P&L */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 border-b pb-1 mb-2">2. Profit & Loss</h2>
          <Row label="Revenue" value={totals.revenue} />
          <Row label="Expenses" value={totals.expense} />
          <Row label={totals.net >= 0 ? "Net Profit" : "Net Loss"} value={Math.abs(totals.net)} bold tone={totals.net >= 0 ? "pos" : "neg"} />
        </section>

        {/* Balance Sheet snapshot */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 border-b pb-1 mb-2">3. Balance Sheet (period movement)</h2>
          <Row label="Assets" value={totals.assets} />
          <Row label="Liabilities" value={totals.liab} />
          <Row label="Equity" value={totals.equity} />
        </section>

        {/* AR/AP aging */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 border-b pb-1 mb-2">4. Receivables & Payables Aging</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <AgingTable title="Receivables" data={ar} />
            <AgingTable title="Payables" data={ap} />
          </div>
        </section>

        {/* AI insight */}
        <section>
          <div className="flex items-center justify-between border-b pb-1 mb-2">
            <h2 className="text-sm font-semibold text-slate-700">5. AI Business Insights</h2>
            <Button size="sm" variant="outline" onClick={generateInsight} disabled={aiBusy} className="print:hidden">
              {aiBusy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Generate
            </Button>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
            {insight || <span className="text-slate-400">Click Generate to produce plain-English commentary on this month's numbers.</span>}
          </div>
        </section>
      </div>
    </ReportShell>
  );
}

function bucket(rows: any[] | null): { current: number; d30: number; d60: number; d90: number } {
  const out = { current: 0, d30: 0, d60: 0, d90: 0 };
  (rows ?? []).forEach((r: any) => {
    const amt = num(r.balance_due);
    if (!r.due_date) { out.current += amt; return; }
    const days = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
    if (days <= 0) out.current += amt;
    else if (days <= 30) out.d30 += amt;
    else if (days <= 60) out.d60 += amt;
    else out.d90 += amt;
  });
  return out;
}

function Kpi({ label, value, tone = "neu" }: { label: string; value: string; tone?: "pos" | "neg" | "neu" }) {
  const color = tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] text-slate-500 uppercase">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
function Row({ label, value, bold, tone = "neu" }: { label: string; value: number; bold?: boolean; tone?: "pos" | "neg" | "neu" }) {
  const color = tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "";
  return (
    <div className={`flex justify-between py-1.5 border-b text-sm ${bold ? "font-semibold" : ""} ${color}`}>
      <span>{label}</span><span>{fmt(value)}</span>
    </div>
  );
}
function AgingTable({ title, data }: { title: string; data: { current: number; d30: number; d60: number; d90: number } }) {
  const total = data.current + data.d30 + data.d60 + data.d90;
  return (
    <div>
      <div className="text-xs uppercase text-slate-500 mb-1">{title}</div>
      <table className="w-full text-xs">
        <tbody className="divide-y">
          <tr><td className="py-1">Current</td><td className="text-right">{fmt(data.current)}</td></tr>
          <tr><td>1-30 days</td><td className="text-right">{fmt(data.d30)}</td></tr>
          <tr><td>31-60 days</td><td className="text-right">{fmt(data.d60)}</td></tr>
          <tr className="text-rose-700"><td>61+ days</td><td className="text-right">{fmt(data.d90)}</td></tr>
        </tbody>
        <tfoot className="border-t font-semibold"><tr><td className="pt-1">Total</td><td className="text-right pt-1">{fmt(total)}</td></tr></tfoot>
      </table>
    </div>
  );
}

function fallbackInsight(x: any): string {
  const parts: string[] = [];
  parts.push(`Period ${x.month}: revenue ${fmt(x.revenue)} vs expenses ${fmt(x.expense)} — ${x.net >= 0 ? "net profit" : "net loss"} of ${fmt(Math.abs(x.net))} at a ${x.margin.toFixed(1)}% margin.`);
  parts.push(`Cash & bank position stands at ${fmt(x.cash)}.`);
  const overdueAR = x.ar.d30 + x.ar.d60 + x.ar.d90;
  if (overdueAR > 0) parts.push(`Overdue receivables of ${fmt(overdueAR)} need collection follow-up, with ${fmt(x.ar.d90)} beyond 60 days.`);
  const overdueAP = x.ap.d30 + x.ap.d60 + x.ap.d90;
  if (overdueAP > 0) parts.push(`Supplier payables past due total ${fmt(overdueAP)} — schedule settlements to protect credit terms.`);
  parts.push(x.margin < 10 ? "Recommendation: review pricing and top expense categories to lift margin above 10%." : "Recommendation: maintain expense discipline and reinvest surplus into growth areas.");
  return parts.join("\n\n");
}
