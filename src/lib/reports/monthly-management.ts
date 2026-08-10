// Data layer for the Accountant Monthly Management Report.
// Pulls exclusively from existing SifoBooks modules — no invented data.
import { supabase } from "@/integrations/supabase/client";

export const n = (v: any) => Number(v ?? 0) || 0;

export type Company = {
  name?: string; tpin?: string | null; address?: string | null;
  phone?: string | null; email?: string | null; logo_url?: string | null;
  base_currency?: string | null;
};

export type MonthlyReport = Awaited<ReturnType<typeof buildMonthlyReport>>;

export function periodRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const prevPeriod = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { from, to, prevPeriod, label };
}

export const reportReference = (period: string) => `AMR-${period.replace("-", "")}`;

function daysOverdue(due?: string | null) {
  if (!due) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / 86400000));
}

function bucketOf(due?: string | null): "current" | "30" | "60" | "90+" {
  const d = daysOverdue(due);
  if (d <= 0) return "current";
  if (d <= 30) return "30";
  if (d <= 60) return "60";
  return "90+";
}

async function pnlFor(from: string, to: string) {
  const { data: entries } = await supabase.from("journal_entries")
    .select("id").eq("status", "posted").gte("entry_date", from).lte("entry_date", to);
  const ids = (entries ?? []).map((e: any) => e.id);
  if (!ids.length) return { revenue: 0, expense: 0, byAccount: [] as { code: string; name: string; type: string; amount: number }[] };
  const { data: jl } = await supabase.from("journal_lines")
    .select("debit,credit,account:account_id(account_code,account_name,account_type)")
    .in("entry_id", ids);
  const map = new Map<string, { code: string; name: string; type: string; amount: number }>();
  (jl ?? []).forEach((l: any) => {
    const a = l.account; if (!a) return;
    if (a.account_type !== "revenue" && a.account_type !== "expense") return;
    const k = `${a.account_code}|${a.account_name}`;
    const cur = map.get(k) ?? { code: a.account_code, name: a.account_name, type: a.account_type, amount: 0 };
    cur.amount += a.account_type === "revenue" ? n(l.credit) - n(l.debit) : n(l.debit) - n(l.credit);
    map.set(k, cur);
  });
  const byAccount = Array.from(map.values());
  return {
    revenue: byAccount.filter(r => r.type === "revenue").reduce((s, r) => s + r.amount, 0),
    expense: byAccount.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0),
    byAccount,
  };
}

const ZRA_BODIES = ["zra", "vat", "paye", "wht", "withholding", "turnover", "tot"];
const isZra = (o: any) =>
  ZRA_BODIES.some(k => `${o.body ?? ""} ${o.obligation_type ?? ""}`.toLowerCase().includes(k));

export async function buildMonthlyReport(period: string) {
  const { from, to, prevPeriod, label } = periodRange(period);
  const prev = periodRange(prevPeriod);

  const [
    companyRes, profileRes, curr, prior,
    invRes, billRes, expRes, recRes, payRes, cnRes,
    banksRes, btRes, reconRes, compRes, auditRes,
    stockRes, adjRes, jeRes, openInvRes, openBillRes, apprRes,
  ] = await Promise.all([
    supabase.from("companies").select("name,tpin,address,phone,email,logo_url,base_currency").limit(1).maybeSingle(),
    supabase.from("profiles").select("full_name,email").limit(1).maybeSingle(),
    pnlFor(from, to),
    pnlFor(prev.from, prev.to),
    supabase.from("invoices").select("id,number,issue_date,due_date,status,subtotal,vat_amount,total,amount_paid,balance_due,customer:customer_id(name)").gte("issue_date", from).lte("issue_date", to).order("issue_date"),
    supabase.from("bills").select("id,bill_number,supplier_invoice_number,bill_date,due_date,status,subtotal,tax_amount,total,amount_paid,balance_due,supplier:supplier_id(name)").gte("bill_date", from).lte("bill_date", to).order("bill_date"),
    supabase.from("expenses").select("id,expense_number,expense_date,category,amount,vat_amount,total,payment_method,reference,status,supplier:supplier_id(name),account:expense_account_id(account_code,account_name)").gte("expense_date", from).lte("expense_date", to).order("expense_date"),
    supabase.from("receipts").select("id,number,receipt_date,amount,method,reference,customer:customer_id(name)").gte("receipt_date", from).lte("receipt_date", to).order("receipt_date"),
    supabase.from("bill_payments").select("id,payment_number,payment_date,amount,payment_method,reference,supplier:supplier_id(name)").gte("payment_date", from).lte("payment_date", to).order("payment_date"),
    supabase.from("credit_notes").select("id,number,issue_date,reason,subtotal,vat_amount,total,status,customer:customer_id(name),invoice:invoice_id(number)").gte("issue_date", from).lte("issue_date", to).order("issue_date"),
    supabase.from("bank_accounts").select("id,name,bank_name,opening_balance,currency"),
    supabase.from("bank_transactions").select("id,txn_date,description,amount,reference,reconciled,bank_account_id,category").gte("txn_date", from).lte("txn_date", to),
    supabase.from("reconciliation_sessions").select("id,bank_account_id,statement_date,statement_balance,opening_balance,book_balance,cleared_deposits,cleared_payments,difference,status").gte("statement_date", from).lte("statement_date", to),
    supabase.from("compliance_obligations").select("id,body,obligation_type,period,due_date,status,amount,reference,notes"),
    supabase.from("audit_logs").select("action,entity_type,created_at,actor_email").gte("created_at", `${from}T00:00:00Z`).lte("created_at", `${to}T23:59:59Z`).limit(5000),
    supabase.from("stock_items").select("id,name,sku,quantity_on_hand,reorder_level,cost_price"),
    supabase.from("stock_adjustments").select("id,adjustment_number,adjustment_date,adjustment_type,quantity_before,quantity_after,reason,item:item_id(name)").gte("adjustment_date", from).lte("adjustment_date", to),
    supabase.from("journal_entries").select("id,entry_number,entry_date,description,status,total_debit,total_credit,reversal_of,reversed_by").gte("entry_date", from).lte("entry_date", to),
    supabase.from("invoices").select("id,number,issue_date,due_date,total,amount_paid,balance_due,customer:customer_id(name)").gt("balance_due", 0),
    supabase.from("bills").select("id,bill_number,bill_date,due_date,total,amount_paid,balance_due,supplier:supplier_id(name)").gt("balance_due", 0),
    supabase.from("approval_requests").select("id,module,reference_number,description,amount,status,created_at").eq("status", "pending"),
  ]);

  const company = (companyRes.data ?? null) as Company | null;
  const profile = profileRes.data as any;
  const currency = company?.base_currency || "ZMW";

  const invoices = (invRes.data ?? []) as any[];
  const bills = (billRes.data ?? []) as any[];
  const expenses = (expRes.data ?? []) as any[];
  const receipts = (recRes.data ?? []) as any[];
  const payments = (payRes.data ?? []) as any[];
  const creditNotes = (cnRes.data ?? []) as any[];
  const banks = (banksRes.data ?? []) as any[];
  const bankTxns = (btRes.data ?? []) as any[];
  const recons = (reconRes.data ?? []) as any[];
  const obligations = (compRes.data ?? []) as any[];
  const audits = (auditRes.data ?? []) as any[];
  const stock = (stockRes.data ?? []) as any[];
  const adjustments = (adjRes.data ?? []) as any[];
  const journals = (jeRes.data ?? []) as any[];
  const openInvoices = (openInvRes.data ?? []) as any[];
  const openBills = (openBillRes.data ?? []) as any[];
  const approvals = (apprRes.data ?? []) as any[];

  // ---- Executive summary ----
  const receivables = openInvoices.reduce((s, i) => s + n(i.balance_due), 0);
  const payables = openBills.reduce((s, b) => s + n(b.balance_due), 0);
  const inventoryValue = stock.reduce((s, i) => s + n(i.quantity_on_hand) * n(i.cost_price), 0);
  const bankBalances = banks.map(b => {
    const txns = bankTxns.filter(t => t.bank_account_id === b.id);
    return {
      ...b,
      deposits: txns.filter(t => n(t.amount) > 0).reduce((s, t) => s + n(t.amount), 0),
      withdrawals: txns.filter(t => n(t.amount) < 0).reduce((s, t) => s + Math.abs(n(t.amount)), 0),
      unreconciled: txns.filter(t => !t.reconciled).length,
      closing: n(b.opening_balance) + txns.reduce((s, t) => s + n(t.amount), 0),
    };
  });
  const cashAndBank = bankBalances.reduce((s, b) => s + b.closing, 0);
  const periodObligations = obligations.filter(o => (o.period ?? "").startsWith(period));
  const taxObligations = periodObligations.reduce((s, o) => s + n(o.amount), 0);

  const netProfit = curr.revenue - curr.expense;
  const prevNet = prior.revenue - prior.expense;

  // ---- Income ----
  const income = {
    rows: invoices.map(i => ({
      date: i.issue_date, customer: i.customer?.name ?? "—", invoice: i.number,
      description: "Sales invoice", amount: n(i.subtotal), tax: n(i.vat_amount),
      total: n(i.total), paid: n(i.amount_paid), balance: n(i.balance_due), status: i.status,
    })),
    gross: invoices.reduce((s, i) => s + n(i.total), 0),
    vat: invoices.reduce((s, i) => s + n(i.vat_amount), 0),
    net: invoices.reduce((s, i) => s + n(i.subtotal), 0),
    count: invoices.length,
    paid: invoices.filter(i => n(i.balance_due) <= 0).length,
    unpaid: invoices.filter(i => n(i.balance_due) > 0).length,
    overdue: invoices.filter(i => n(i.balance_due) > 0 && daysOverdue(i.due_date) > 0).length,
    collected: invoices.reduce((s, i) => s + n(i.amount_paid), 0),
    outstanding: invoices.reduce((s, i) => s + n(i.balance_due), 0),
    overdueAmount: invoices.filter(i => daysOverdue(i.due_date) > 0).reduce((s, i) => s + n(i.balance_due), 0),
  };

  // ---- Expenses ----
  const expenseRows = expenses.map(e => ({
    date: e.expense_date, payee: e.supplier?.name ?? "—",
    account: e.account ? `${e.account.account_code} ${e.account.account_name}` : (e.category ?? "—"),
    category: e.category ?? e.account?.account_name ?? "Other expenses",
    reference: e.reference ?? e.expense_number ?? "—",
    amount: n(e.amount), tax: n(e.vat_amount), total: n(e.total),
    method: e.payment_method ?? "—", status: e.status ?? "—",
  }));
  const byCategory = Array.from(
    expenseRows.reduce((m, r) => m.set(r.category, (m.get(r.category) ?? 0) + r.total), new Map<string, number>()),
  ).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  const expenseTotal = expenseRows.reduce((s, r) => s + r.total, 0);

  // ---- Purchases ----
  const purchases = {
    rows: bills.map(b => ({
      number: b.bill_number ?? b.supplier_invoice_number ?? "—", supplier: b.supplier?.name ?? "—",
      date: b.bill_date, amount: n(b.subtotal), tax: n(b.tax_amount), total: n(b.total),
      paid: n(b.amount_paid), balance: n(b.balance_due), status: b.status,
    })),
    count: bills.length,
    total: bills.reduce((s, b) => s + n(b.total), 0),
    paid: bills.reduce((s, b) => s + n(b.amount_paid), 0),
    outstanding: bills.reduce((s, b) => s + n(b.balance_due), 0),
  };

  // ---- Returns / credit notes ----
  const returns = {
    sales: creditNotes.map(c => ({
      date: c.issue_date, customer: c.customer?.name ?? "—", invoice: c.invoice?.number ?? "—",
      number: c.number, amount: n(c.total), reason: c.reason ?? "—", status: c.status ?? "—",
    })),
    salesTotal: creditNotes.reduce((s, c) => s + n(c.total), 0),
    count: creditNotes.length,
  };

  // ---- Aging ----
  const ageBuckets = (rows: any[], key: string) => {
    const out = { current: 0, "30": 0, "60": 0, "90+": 0 } as Record<string, number>;
    rows.forEach(r => { out[bucketOf(r.due_date)] += n(r[key]); });
    return out;
  };
  const debtors = openInvoices
    .map(i => ({
      customer: i.customer?.name ?? "—", invoice: i.number, date: i.issue_date, due: i.due_date,
      amount: n(i.total), paid: n(i.amount_paid), balance: n(i.balance_due), days: daysOverdue(i.due_date),
    }))
    .sort((a, b) => b.balance - a.balance);
  const creditors = openBills
    .map(b => ({
      supplier: b.supplier?.name ?? "—", bill: b.bill_number, date: b.bill_date, due: b.due_date,
      amount: n(b.total), paid: n(b.amount_paid), balance: n(b.balance_due), days: daysOverdue(b.due_date),
    }))
    .sort((a, b) => b.balance - a.balance);

  // ---- Accountant activity ----
  const countAudit = (entity: string) => audits.filter(a => (a.entity_type ?? "").toLowerCase().includes(entity)).length;
  const activity = {
    salesInvoices: invoices.length,
    purchaseInvoices: bills.length,
    receipts: receipts.length,
    payments: payments.length,
    expenses: expenses.length,
    journals: journals.length,
    creditNotes: creditNotes.length,
    bankReconciled: bankTxns.filter(t => t.reconciled).length,
    customersAdded: countAudit("customer"),
    suppliersTouched: countAudit("supplier"),
    stockAdjustments: adjustments.length,
    reconciliations: recons.length,
    auditEvents: audits.length,
    compliancePrepared: periodObligations.filter(o => o.status !== "pending").length,
  };

  // ---- Management attention ----
  const attention: { severity: "high" | "medium" | "low"; item: string; detail: string; link: string }[] = [];
  const overdueTax = obligations.filter(o => o.status !== "paid" && daysOverdue(o.due_date) > 0);
  if (overdueTax.length) attention.push({ severity: "high", item: "Overdue statutory obligations", detail: `${overdueTax.length} obligation(s) past due, ${overdueTax.reduce((s, o) => s + n(o.amount), 0).toFixed(2)} ${currency}`, link: "/compliance" });
  const overdueBills = creditors.filter(c => c.days > 0);
  if (overdueBills.length) attention.push({ severity: "high", item: "Overdue supplier payments", detail: `${overdueBills.length} bill(s), ${overdueBills.reduce((s, c) => s + c.balance, 0).toFixed(2)} ${currency}`, link: "/bills" });
  const overdueInv = debtors.filter(d => d.days > 0);
  if (overdueInv.length) attention.push({ severity: "high", item: "Overdue customer invoices", detail: `${overdueInv.length} invoice(s), ${overdueInv.reduce((s, d) => s + d.balance, 0).toFixed(2)} ${currency}`, link: "/invoices" });
  const unrec = bankTxns.filter(t => !t.reconciled).length;
  if (unrec) attention.push({ severity: "medium", item: "Unreconciled bank transactions", detail: `${unrec} transaction(s) in ${label}`, link: "/reconciliation" });
  if (approvals.length) attention.push({ severity: "medium", item: "Pending approvals", detail: `${approvals.length} request(s) awaiting decision`, link: "/approvals" });
  const upcoming = obligations.filter(o => o.status !== "paid" && daysOverdue(o.due_date) === 0 && o.due_date);
  if (upcoming.length) attention.push({ severity: "low", item: "Upcoming compliance deadlines", detail: `${upcoming.length} obligation(s) due`, link: "/compliance" });

  // ---- Ledger control ----
  const ledger = {
    entries: journals.length,
    posted: journals.filter(j => j.status === "posted").length,
    unposted: journals.filter(j => j.status !== "posted").length,
    reversed: journals.filter(j => j.reversed_by || j.reversal_of).length,
    outOfBalance: journals.filter(j => Math.abs(n(j.total_debit) - n(j.total_credit)) > 0.01),
    totalDebit: journals.reduce((s, j) => s + n(j.total_debit), 0),
    totalCredit: journals.reduce((s, j) => s + n(j.total_credit), 0),
  };

  const summaryText =
    `During ${label}, total income was ${currency} ${curr.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} against expenses of ` +
    `${currency} ${curr.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}, resulting in a net ` +
    `${netProfit >= 0 ? "profit" : "loss"} of ${currency} ${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}. ` +
    `The accounting team processed ${invoices.length} sales invoice(s), ${bills.length} purchase invoice(s), ${receipts.length} receipt(s), ` +
    `${payments.length} supplier payment(s), ${expenses.length} expense(s), ${journals.length} journal(s) and handled ` +
    `${periodObligations.length} compliance obligation(s).`;

  return {
    period, label, from, to, reference: reportReference(period), currency,
    company, preparedByDefault: profile?.full_name || profile?.email || "",
    summary: {
      revenue: curr.revenue, expenses: curr.expense, netProfit,
      receivables, payables, cashAndBank, inventoryValue, taxObligations,
      text: summaryText,
    },
    comparison: [
      { metric: "Revenue", current: curr.revenue, previous: prior.revenue },
      { metric: "Expenses", current: curr.expense, previous: prior.expense },
      { metric: "Net profit", current: netProfit, previous: prevNet },
      { metric: "Invoices issued", current: invoices.length, previous: 0, countOnly: true },
      { metric: "Collections", current: receipts.reduce((s, r) => s + n(r.amount), 0), previous: 0 },
      { metric: "Purchases", current: purchases.total, previous: 0 },
    ],
    prevLabel: prev.label,
    income, expenseRows, expenseTotal, byCategory, purchases, returns,
    receipts: receipts.map(r => ({ date: r.receipt_date, customer: r.customer?.name ?? r.payer_name ?? "—", reference: r.reference ?? r.number, amount: n(r.amount), method: r.method ?? "—" })),
    supplierPayments: payments.map(p => ({ date: p.payment_date, supplier: p.supplier?.name ?? "—", reference: p.reference ?? p.payment_number, amount: n(p.amount), method: p.payment_method ?? "—" })),
    otherPayments: expenseRows.map(e => ({ date: e.date, payee: e.payee, description: e.reference, account: e.account, amount: e.total })),
    banking: { accounts: bankBalances, sessions: recons, unreconciled: unrec, transactions: bankTxns.length },
    compliance: {
      zra: periodObligations.filter(isZra),
      other: periodObligations.filter(o => !isZra(o)),
      all: obligations,
    },
    debtors, creditors,
    aging: { receivables: ageBuckets(openInvoices, "balance_due"), payables: ageBuckets(openBills, "balance_due") },
    inventory: {
      value: inventoryValue,
      items: stock.length,
      lowStock: stock.filter(i => n(i.reorder_level) > 0 && n(i.quantity_on_hand) <= n(i.reorder_level)),
      adjustments,
    },
    ledger, activity, attention, approvals,
    accounts: curr.byAccount,
  };
}
