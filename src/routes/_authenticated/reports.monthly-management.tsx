import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Printer, FileText, FileSpreadsheet, Mail, Loader2, RefreshCw,
  AlertTriangle, CheckCircle2, Send, Save, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildMonthlyReport, type MonthlyReport } from "@/lib/reports/monthly-management";
import { exportMonthlyManagementPdf } from "@/lib/reports/monthly-management-pdf";
import { exportCSV, exportExcel } from "@/lib/exports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/monthly-management")({
  head: () => ({
    meta: [
      { title: "Accountant Monthly Management Report — SifoBooks" },
      { name: "description", content: "Monthly accounting report to management: income, expenses, invoices, payments, returns, ZRA compliance, outstanding items and accountant activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MonthlyManagementReport,
});

const STATUSES = ["draft", "submitted", "reviewed", "approved"] as const;

function MonthlyManagementReport() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyReport | null>(null);
  const [preparedBy, setPreparedBy] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const money = (v: number) =>
    `${data?.currency ?? "ZMW"} ${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadHistory = async () => {
    const { data: rows } = await supabase.from("management_reports")
      .select("*").order("period", { ascending: false });
    setHistory(rows ?? []);
  };

  const generate = async (p = period) => {
    setLoading(true);
    try {
      const r = await buildMonthlyReport(p);
      setData(r);
      const { data: saved } = await supabase.from("management_reports").select("*").eq("period", p).maybeSingle();
      setPreparedBy(saved?.prepared_by ?? r.preparedByDefault);
      setReviewedBy(saved?.reviewed_by ?? "");
      setComments(saved?.comments ?? "");
      setStatus(saved?.status ?? "draft");
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate the report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(period); /* eslint-disable-next-line */ }, [period]);
  useEffect(() => { loadHistory(); }, []);

  const save = async (nextStatus = status) => {
    if (!data) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      user_id: auth.user!.id,
      period: data.period,
      reference: data.reference,
      prepared_by: preparedBy || null,
      reviewed_by: reviewedBy || null,
      comments: comments || null,
      status: nextStatus,
      approved_at: nextStatus === "approved" ? new Date().toISOString() : null,
      snapshot: data.summary as any,
    };
    const { error } = await supabase.from("management_reports").upsert(payload, { onConflict: "user_id,period" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setStatus(nextStatus);
    toast.success(nextStatus === "draft" ? "Report saved" : `Report ${nextStatus}`);
    loadHistory();
  };

  const excelRows = useMemo(() => {
    if (!data) return [] as Record<string, any>[];
    return [
      { Section: "Summary", Item: "Revenue", Value: data.summary.revenue },
      { Section: "Summary", Item: "Expenses", Value: data.summary.expenses },
      { Section: "Summary", Item: "Net profit", Value: data.summary.netProfit },
      { Section: "Summary", Item: "Receivables", Value: data.summary.receivables },
      { Section: "Summary", Item: "Payables", Value: data.summary.payables },
      { Section: "Summary", Item: "Cash & bank", Value: data.summary.cashAndBank },
      { Section: "Summary", Item: "Inventory value", Value: data.summary.inventoryValue },
      { Section: "Summary", Item: "Tax obligations", Value: data.summary.taxObligations },
      ...data.income.rows.map(i => ({ Section: "Income", Item: `${i.invoice} — ${i.customer}`, Date: i.date, Value: i.total, Status: i.status })),
      ...data.expenseRows.map(e => ({ Section: "Expenses", Item: `${e.payee} — ${e.account}`, Date: e.date, Value: e.total, Status: e.status })),
      ...data.purchases.rows.map(p => ({ Section: "Purchases", Item: `${p.number} — ${p.supplier}`, Date: p.date, Value: p.total, Status: p.status })),
      ...data.returns.sales.map(s => ({ Section: "Returns", Item: `${s.number} — ${s.customer}`, Date: s.date, Value: s.amount, Status: s.status })),
      ...data.receipts.map(r => ({ Section: "Receipts", Item: r.customer, Date: r.date, Value: r.amount, Status: r.method })),
      ...data.supplierPayments.map(p => ({ Section: "Payments", Item: p.supplier, Date: p.date, Value: p.amount, Status: p.method })),
      ...data.compliance.zra.map((o: any) => ({ Section: "ZRA compliance", Item: `${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), Date: o.due_date, Value: o.amount, Status: o.status })),
      ...data.compliance.other.map((o: any) => ({ Section: "Other statutory", Item: `${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), Date: o.due_date, Value: o.amount, Status: o.status })),
      ...data.debtors.map(d => ({ Section: "Debtors", Item: `${d.customer} — ${d.invoice}`, Date: d.due, Value: d.balance, Status: d.days > 0 ? `${d.days} days overdue` : "Current" })),
      ...data.creditors.map(c => ({ Section: "Creditors", Item: `${c.supplier} — ${c.bill}`, Date: c.due, Value: c.balance, Status: c.days > 0 ? `${c.days} days overdue` : "Current" })),
      ...Object.entries(data.activity).map(([k, v]) => ({ Section: "Accountant activity", Item: k, Value: v })),
    ];
  }, [data]);

  const emailReport = () => {
    if (!data) return;
    const body = [
      `${data.company?.name ?? "SifoBooks"} — Accountant Monthly Management Report`,
      `Period: ${data.label}   Ref: ${data.reference}`,
      "",
      data.summary.text,
      "",
      `Revenue: ${money(data.summary.revenue)}`,
      `Expenses: ${money(data.summary.expenses)}`,
      `Net profit: ${money(data.summary.netProfit)}`,
      `Receivables: ${money(data.summary.receivables)}`,
      `Payables: ${money(data.summary.payables)}`,
      `Cash & bank: ${money(data.summary.cashAndBank)}`,
      "",
      comments ? `Accountant's comments:\n${comments}` : "",
      "",
      `Prepared by: ${preparedBy || "—"}`,
    ].join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(`Monthly Management Report — ${data.label} (${data.reference})`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl print:p-0 print:max-w-none">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Accountant Monthly Management Report</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Monthly accounting handover to management</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="h-9 w-40" />
          <Button size="sm" variant="outline" onClick={() => generate()}><RefreshCw className="h-4 w-4 mr-1" /> Generate</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => data && exportMonthlyManagementPdf(data, { preparedBy, reviewedBy, status, comments })}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" disabled={!excelRows.length} onClick={() => exportExcel(excelRows, `monthly-management-${period}`, "Management Report")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button size="sm" variant="outline" disabled={!excelRows.length} onClick={() => exportCSV(excelRows, `monthly-management-${period}`)}>CSV</Button>
          <Button size="sm" variant="outline" onClick={emailReport}><Mail className="h-4 w-4 mr-1" /> Email</Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Building report from your SifoBooks data…
        </div>
      ) : (
        <>
          {/* 1. Header */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {data.company?.logo_url && <div className="text-xs text-muted-foreground" />}
                <div>
                  <div className="text-lg font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-400">{data.company?.name ?? "SifoBooks"}</div>
                  <div className="text-xs text-muted-foreground leading-5">
                    {data.company?.address && <div>{data.company.address}</div>}
                    {data.company?.tpin && <div>TPIN: {data.company.tpin}</div>}
                    <div>{[data.company?.phone, data.company?.email].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tracking-wide">ACCOUNTANT MONTHLY MANAGEMENT REPORT</div>
                <div className="text-xs text-muted-foreground">Reporting period: {data.from} – {data.to}</div>
                <div className="text-xs text-muted-foreground">Reference: {data.reference}</div>
                <div className="text-xs text-muted-foreground">Prepared: {new Date().toLocaleDateString()}</div>
                <Badge className="mt-1 capitalize">{status}</Badge>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-4 print:hidden">
              <div>
                <label className="text-xs text-muted-foreground">Prepared by (accountant)</label>
                <Input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Accountant name" className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reviewed / approved by (manager, director)</label>
                <Input value={reviewedBy} onChange={e => setReviewedBy(e.target.value)} placeholder="Manager / director name" className="h-9" />
              </div>
            </div>
          </section>

          {/* 2. Executive summary */}
          <Section title="Executive summary">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ["Revenue", data.summary.revenue], ["Expenses", data.summary.expenses],
                ["Net profit", data.summary.netProfit], ["Customer receivables", data.summary.receivables],
                ["Supplier payables", data.summary.payables], ["Cash & bank", data.summary.cashAndBank],
                ["Inventory value", data.summary.inventoryValue], ["Tax / compliance obligations", data.summary.taxObligations],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label as string}</div>
                  <div className="mt-1 text-base font-semibold tabular-nums break-words">{money(value as number)}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{data.summary.text}</p>
          </Section>

          <Tabs defaultValue="trading" className="print:hidden">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="trading">Income & expenses</TabsTrigger>
              <TabsTrigger value="docs">Invoices & purchases</TabsTrigger>
              <TabsTrigger value="cash">Payments & banking</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
              <TabsTrigger value="work">Accountant work</TabsTrigger>
              <TabsTrigger value="control">Control & comparison</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="trading" className="space-y-4 pt-4">
              <Section title="3. Income report" meta={`${data.income.count} invoices · ${data.income.paid} paid · ${data.income.unpaid} unpaid · ${data.income.overdue} overdue`}>
                <Table
                  head={["Date", "Customer", "Invoice", "Description", "Amount", "Tax", "Total", "Status"]}
                  rows={data.income.rows.map(i => [i.date, i.customer, i.invoice, i.description, money(i.amount), money(i.tax), money(i.total), i.status])}
                  foot={["", "", "", "Totals", money(data.income.net), money(data.income.vat), money(data.income.gross), ""]}
                />
              </Section>
              <Section title="4. Expense report" meta={`Total ${money(data.expenseTotal)}`}>
                <div className="grid gap-3 md:grid-cols-2 mb-4">
                  {data.byCategory.slice(0, 8).map(c => (
                    <div key={c.category} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="capitalize">{c.category}</span>
                      <span className="font-semibold tabular-nums">{money(c.total)}</span>
                    </div>
                  ))}
                </div>
                <Table
                  head={["Date", "Supplier / payee", "Expense account", "Reference", "Amount", "Tax", "Total", "Payment", "Status"]}
                  rows={data.expenseRows.map(e => [e.date, e.payee, e.account, e.reference, money(e.amount), money(e.tax), money(e.total), e.method, e.status])}
                />
              </Section>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4 pt-4">
              <Section title="5. Invoices issued" meta={`Invoiced ${money(data.income.gross)} · Collected ${money(data.income.collected)} · Outstanding ${money(data.income.outstanding)} · Overdue ${money(data.income.overdueAmount)}`}>
                <Table
                  head={["Invoice", "Date", "Customer", "Amount", "VAT", "Total", "Paid", "Balance", "Status"]}
                  rows={data.income.rows.map((i, idx) => [i.invoice, i.date, i.customer, money(i.amount), money(i.tax), money(i.total), "", "", i.status]).map((r, idx) => {
                    const inv = data.income.rows[idx];
                    r[6] = money(inv.total - 0);
                    return r;
                  })}
                />
              </Section>
              <Section title="6. Purchase invoices" meta={`${data.purchases.count} processed · Total ${money(data.purchases.total)} · Paid ${money(data.purchases.paid)} · Outstanding ${money(data.purchases.outstanding)}`}>
                <Table
                  head={["Invoice", "Supplier", "Date", "Amount", "VAT", "Total", "Paid", "Balance", "Status"]}
                  rows={data.purchases.rows.map(p => [p.number, p.supplier, p.date, money(p.amount), money(p.tax), money(p.total), money(p.paid), money(p.balance), p.status])}
                />
              </Section>
              <Section title="7. Returns and credit notes" meta={`${data.returns.count} credit note(s) · ${money(data.returns.salesTotal)}`}>
                <Table
                  head={["Date", "Customer", "Invoice", "Credit note", "Amount", "Reason", "Status"]}
                  rows={data.returns.sales.map(s => [s.date, s.customer, s.invoice, s.number, money(s.amount), s.reason, s.status])}
                />
              </Section>
            </TabsContent>

            <TabsContent value="cash" className="space-y-4 pt-4">
              <Section title="8a. Customer receipts" meta={money(data.receipts.reduce((s, r) => s + r.amount, 0))}>
                <Table head={["Date", "Customer", "Reference", "Amount", "Method"]}
                  rows={data.receipts.map(r => [r.date, r.customer, r.reference, money(r.amount), r.method])} />
              </Section>
              <Section title="8b. Supplier payments" meta={money(data.supplierPayments.reduce((s, r) => s + r.amount, 0))}>
                <Table head={["Date", "Supplier", "Reference", "Amount", "Method"]}
                  rows={data.supplierPayments.map(r => [r.date, r.supplier, r.reference, money(r.amount), r.method])} />
              </Section>
              <Section title="8c. Other payments" meta={money(data.otherPayments.reduce((s, r) => s + r.amount, 0))}>
                <Table head={["Date", "Payee", "Description", "Account", "Amount"]}
                  rows={data.otherPayments.map(r => [r.date, r.payee, r.description, r.account, money(r.amount)])} />
              </Section>
              <Section title="9. Banking & reconciliation" meta={`${data.banking.transactions} transactions · ${data.banking.unreconciled} unreconciled`}>
                <Table head={["Account", "Opening", "Deposits", "Withdrawals", "Closing", "Unreconciled"]}
                  rows={data.banking.accounts.map((b: any) => [
                    `${b.name}${b.bank_name ? ` — ${b.bank_name}` : ""}`, money(b.opening_balance), money(b.deposits), money(b.withdrawals), money(b.closing), String(b.unreconciled),
                  ])} />
                <div className="mt-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Reconciliation sessions</div>
                  <Table head={["Statement date", "Opening", "Book balance", "Statement balance", "Difference", "Status"]}
                    rows={data.banking.sessions.map((s: any) => [s.statement_date, money(s.opening_balance), money(s.book_balance), money(s.statement_balance), money(s.difference), s.status])} />
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4 pt-4">
              <Section title="10. ZRA compliance activities">
                <Table head={["Obligation", "Period", "Amount", "Due date", "Reference", "Status"]}
                  rows={data.compliance.zra.map((o: any) => [`${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), o.period, money(o.amount), o.due_date, o.reference ?? "—", o.status])} />
              </Section>
              <Section title="11. Other statutory compliance">
                <Table head={["Obligation", "Period", "Amount", "Due date", "Reference", "Status"]}
                  rows={data.compliance.other.map((o: any) => [`${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), o.period, money(o.amount), o.due_date, o.reference ?? "—", o.status])} />
              </Section>
            </TabsContent>

            <TabsContent value="outstanding" className="space-y-4 pt-4">
              <Section title="14. Outstanding customer debts" meta={`Total ${money(data.summary.receivables)}`}>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {(["current", "30", "60", "90+"] as const).map(k => (
                    <div key={k} className="rounded-lg border border-border p-3">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k === "current" ? "Current" : `${k} days`}</div>
                      <div className="text-sm font-semibold tabular-nums">{money(data.aging.receivables[k])}</div>
                    </div>
                  ))}
                </div>
                <Table head={["Customer", "Invoice", "Invoice date", "Due date", "Amount", "Paid", "Balance", "Days overdue"]}
                  rows={data.debtors.map(d => [d.customer, d.invoice, d.date, d.due ?? "—", money(d.amount), money(d.paid), money(d.balance), String(d.days)])} />
              </Section>
              <Section title="15. Outstanding supplier & institution obligations" meta={`Suppliers ${money(data.summary.payables)}`}>
                <Table head={["Supplier / institution", "Obligation", "Amount", "Due date", "Status"]}
                  rows={[
                    ...data.creditors.map(c => [c.supplier, c.bill, money(c.balance), c.due ?? "—", c.days > 0 ? "Overdue" : "Open"]),
                    ...data.compliance.all.filter((o: any) => o.status !== "paid").map((o: any) => [
                      o.body ?? "—", o.obligation_type ?? o.period, money(o.amount), o.due_date ?? "—", o.status,
                    ]),
                  ]} />
              </Section>
              <Section title="16. Inventory accounting summary">
                <Table head={["Metric", "Value"]} rows={[
                  ["Items tracked", String(data.inventory.items)],
                  ["Closing inventory value", money(data.inventory.value)],
                  ["Stock adjustments in period", String(data.inventory.adjustments.length)],
                  ["Low-stock items", String(data.inventory.lowStock.length)],
                ]} />
                {data.inventory.adjustments.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Stock adjustments</div>
                    <Table head={["Date", "Number", "Item", "Type", "Before", "After", "Reason"]}
                      rows={data.inventory.adjustments.map((a: any) => [a.adjustment_date, a.adjustment_number, a.item?.name ?? "—", a.adjustment_type, String(a.quantity_before), String(a.quantity_after), a.reason ?? "—"])} />
                  </div>
                )}
              </Section>
            </TabsContent>

            <TabsContent value="work" className="space-y-4 pt-4">
              <Section title="12. Accountant activity summary">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(data.activity).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border p-3">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</div>
                      <div className="text-lg font-semibold tabular-nums">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="13. Accounting tasks & approvals" meta={`${data.approvals.length} pending`}>
                <Table head={["Module", "Reference", "Description", "Amount", "Raised", "Status"]}
                  rows={data.approvals.map((a: any) => [a.module, a.reference_number ?? "—", a.description ?? "—", money(Number(a.amount ?? 0)), new Date(a.created_at).toLocaleDateString(), a.status])} />
              </Section>
              <Section title="18. Accountant's comments">
                <Textarea value={comments} onChange={e => setComments(e.target.value)} rows={6}
                  placeholder="Important issues, unusual transactions, explanations, challenges, recommendations and items requiring management approval…" />
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="save" disabled={saving} onClick={() => save("draft")}><Save className="h-4 w-4 mr-1" /> Save draft</Button>
                  <Button size="sm" variant="update" disabled={saving} onClick={() => save("submitted")}><Send className="h-4 w-4 mr-1" /> Submit to management</Button>
                  <Button size="sm" variant="approve" disabled={saving} onClick={() => save("reviewed")}>Mark reviewed</Button>
                  <Button size="sm" disabled={saving} onClick={() => save("approved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="control" className="space-y-4 pt-4">
              <Section title="17. General ledger / accounting control summary">
                <Table head={["Metric", "Value"]} rows={[
                  ["Journal entries", String(data.ledger.entries)],
                  ["Posted", String(data.ledger.posted)],
                  ["Unposted / draft", String(data.ledger.unposted)],
                  ["Reversed", String(data.ledger.reversed)],
                  ["Out of balance", String(data.ledger.outOfBalance.length)],
                  ["Total debits", money(data.ledger.totalDebit)],
                  ["Total credits", money(data.ledger.totalCredit)],
                ]} />
              </Section>
              <Section title="19. Items requiring management attention">
                {data.attention.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exceptions identified for this period.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.attention.map(a => (
                      <li key={a.item} className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 text-sm",
                        a.severity === "high" && "border-rose-200 bg-rose-50 dark:bg-rose-950/20",
                        a.severity === "medium" && "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
                        a.severity === "low" && "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20",
                      )}>
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold">{a.item}</div>
                          <div className="text-muted-foreground">{a.detail}</div>
                        </div>
                        <Link to={a.link} className="ml-auto shrink-0"><Button size="sm" variant="ghost">Open</Button></Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="20. Month-on-month comparison" meta={`${data.label} vs ${data.prevLabel}`}>
                <Table head={["Metric", data.label, data.prevLabel, "Change"]}
                  rows={data.comparison.map(c => {
                    const change = c.previous ? `${(((c.current - c.previous) / Math.abs(c.previous)) * 100).toFixed(1)}%` : "—";
                    return [c.metric, (c as any).countOnly ? String(c.current) : money(c.current), (c as any).countOnly ? String(c.previous) : money(c.previous), change];
                  })} />
              </Section>
              <Section title="22. Report approval">
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="h-10 border-b border-border" />
                    <div className="mt-1 text-muted-foreground">Prepared by: {preparedBy || "—"} · Signature / Date</div>
                  </div>
                  <div>
                    <div className="h-10 border-b border-border" />
                    <div className="mt-1 text-muted-foreground">Reviewed by: {reviewedBy || "—"} · Signature / Date</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {STATUSES.map(s => (
                    <Badge key={s} variant={status === s ? "default" : "outline"} className="capitalize">{s}</Badge>
                  ))}
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="history" className="pt-4">
              <Section title="25. Report history" meta={<span className="inline-flex items-center gap-1"><History className="h-3.5 w-3.5" /> {history.length} saved</span>}>
                <Table
                  head={["Period", "Reference", "Prepared by", "Generated", "Status", "Reviewed by", "Approved", "Actions"]}
                  rows={history.map(h => [
                    h.period, h.reference, h.prepared_by ?? "—",
                    new Date(h.created_at).toLocaleDateString(), h.status, h.reviewed_by ?? "—",
                    h.approved_at ? new Date(h.approved_at).toLocaleDateString() : "—",
                    "",
                  ])}
                  actions={history.map(h => (
                    <div className="flex gap-1" key={h.id}>
                      <Button size="sm" variant="ghost" onClick={() => setPeriod(h.period)}>Open</Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        const nextP = nextPeriod(h.period);
                        setPeriod(nextP);
                        toast.info(`Duplicated setup for ${nextP} — review and save`);
                      }}>Duplicate →</Button>
                    </div>
                  ))}
                />
              </Section>
            </TabsContent>
          </Tabs>

          {/* Print-only full report */}
          <div className="hidden print:block space-y-4">
            <p className="text-sm">{data.summary.text}</p>
            <p className="text-sm whitespace-pre-wrap"><strong>Accountant's comments:</strong> {comments || "—"}</p>
            <p className="text-sm">Prepared by: {preparedBy || "—"} · Reviewed by: {reviewedBy || "—"} · Status: {status}</p>
          </div>
        </>
      )}
    </div>
  );
}

function nextPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function Section({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-400">{title}</h2>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows, foot, actions }: { head: string[]; rows: (string | number)[][]; foot?: (string | number)[]; actions?: React.ReactNode[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs md:text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-border">
            {head.map(h => <th key={h} className="text-left font-semibold text-muted-foreground py-2 px-2 whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={head.length} className="py-4 px-2 text-muted-foreground">No records for this period</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60">
              {r.map((cell, j) => (
                <td key={j} className={cn("py-1.5 px-2 align-top", j >= 3 && typeof cell === "string" && /\d/.test(cell) && "tabular-nums")}>
                  {actions && j === r.length - 1 ? actions[i] : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="font-semibold border-t-2 border-border">
              {foot.map((f, i) => <td key={i} className="py-2 px-2 tabular-nums">{f}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
