import { SifoHubTabs } from "@/components/sifo/SifoHubTabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Plus, Undo2, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { reverseJournalEntry } from "@/lib/reversal";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { EntitySelector, type EntityOption } from "@/components/selectors/EntitySelector";
import { PostingPreview, isBalanced, type PreviewLine } from "@/components/PostingPreview";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { PostingFlow } from "@/components/accounting/PostingFlow";
import {
  AccountingStatusBadge, ApprovalStatusBadge, PaymentStatusBadge, TransactionTypeBadge,
} from "@/components/finance/StatusBadges";
import { WhatWasPosted } from "@/components/finance/WhatWasPosted";
import {
  EXPENSE_TXN_TYPES, TXN_TYPES, countsAsExpense, derivePaymentStatus, txnTypeMeta,
  type FinanceTxnType,
} from "@/lib/finance/transaction-model";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ExpensesPage,
});

type Account = { id: string; account_code: string; account_name: string; account_type: string };
type Expense = {
  id: string; expense_number: string | null; expense_date: string; category: string | null;
  payment_method: string; amount: number; vat_amount: number; total: number; status: string;
  reference: string | null; notes: string | null; journal_entry_id: string | null;
  bank_account_id: string | null; expense_account_id: string | null;
  transaction_type: string | null; supplier_id: string | null; employee_id: string | null;
  branch_id: string | null; bill_id: string | null;
  payment_status: string | null; amount_paid: number | null; approval_status: string | null;
  created_by: string | null; approved_by: string | null; approved_at: string | null;
  posted_by: string | null; posted_at: string | null; created_at: string | null;
};
type Bill = {
  id: string; bill_number: string | null; supplier_invoice_number: string | null;
  bill_date: string | null; total: number | null; balance_due: number | null; supplier_id: string | null;
};

const CATEGORIES = ["Fuel", "Vehicle Maintenance", "Office Supplies", "Utilities", "Rent", "Travel", "Mobile / Airtime", "Bank Charges", "Repairs", "Marketing", "Meals", "Professional Fees", "Other"];
const ALL = "__all__";

function ExpensesPage() {
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [drawer, setDrawer] = useState<Expense | null>(null);

  // List filters
  const [fType, setFType] = useState<string>(ALL);
  const [fStatus, setFStatus] = useState<string>(ALL);
  const [fPayment, setFPayment] = useState<string>(ALL);
  const [fApproval, setFApproval] = useState<string>(ALL);
  const [fSupplier, setFSupplier] = useState<string>(ALL);
  const [fCategory, setFCategory] = useState<string>(ALL);
  const [fBranch, setFBranch] = useState<string>(ALL);

  // New-expense form state
  const [txnType, setTxnType] = useState<FinanceTxnType>("business_expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [payment, setPayment] = useState("cash");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [linkedBillId, setLinkedBillId] = useState<string>("");
  const [settleNow, setSettleNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const expenseAccounts = accounts.filter(a => a.account_type === "expense");
  const cashBankAccounts = accounts.filter(a => a.account_type === "asset" && /(cash|bank|mobile|airtel|mtn|zamtel|visa|master|petty)/i.test(a.account_name));
  const payableAccount = accounts.find(a => a.account_type === "liability" && /account.*payable|creditor/i.test(a.account_name));
  const vatInputAccount = accounts.find(a => /vat.*input|input.*vat/i.test(a.account_name));

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    setUserId(u.user.id);
    const [{ data: ex }, { data: acc }, { data: sup }, { data: emp }, { data: br }, { data: bl }] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("chart_of_accounts").select("id,account_code,account_name,account_type").eq("is_active", true).order("account_code"),
      supabase.from("suppliers").select("id,name,supplier_code,phone,tpin,current_balance").order("name"),
      supabase.from("employees").select("id,employee_code,first_name,last_name,status").order("first_name"),
      supabase.from("branches").select("id,name,code,active").order("name"),
      supabase.from("bills").select("id,bill_number,supplier_invoice_number,bill_date,total,balance_due,supplier_id").order("bill_date", { ascending: false }).limit(500),
    ]);
    setRows((ex ?? []) as any);
    setAccounts((acc ?? []) as any);
    setSuppliers(sup ?? []); setEmployees(emp ?? []); setBranches(br ?? []);
    setBills((bl ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!expenseAccountId && expenseAccounts[0]) setExpenseAccountId(expenseAccounts[0].id);
    if (!bankAccountId && cashBankAccounts[0]) setBankAccountId(cashBankAccounts[0].id);
  }, [accounts.length]);

  const supplierName = (id?: string | null) => suppliers.find(s => s.id === id)?.name ?? null;
  const employeeName = (id?: string | null) => {
    const e = employees.find(x => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : null;
  };
  const branchName = (id?: string | null) => branches.find(b => b.id === id)?.name ?? null;
  const accountLabel = (id?: string | null) => {
    const a = accounts.find(x => x.id === id);
    return a ? `${a.account_code} — ${a.account_name}` : "—";
  };
  const payeeOf = (r: Expense) =>
    supplierName(r.supplier_id) ?? employeeName(r.employee_id) ?? (r.transaction_type === "business_expense" ? "—" : "—");

  const filtered = useMemo(() => rows.filter(r => {
    if (!inRange(r.expense_date, range)) return false;
    if (fType !== ALL && (r.transaction_type ?? "business_expense") !== fType) return false;
    if (fStatus !== ALL && r.status !== fStatus) return false;
    if (fPayment !== ALL && (r.payment_status ?? "") !== fPayment) return false;
    if (fApproval !== ALL && (r.approval_status ?? "") !== fApproval) return false;
    if (fSupplier !== ALL && r.supplier_id !== fSupplier) return false;
    if (fCategory !== ALL && (r.category ?? "") !== fCategory) return false;
    if (fBranch !== ALL && r.branch_id !== fBranch) return false;
    return true;
  }), [rows, range, fType, fStatus, fPayment, fApproval, fSupplier, fCategory, fBranch]);

  /**
   * Totals only count records that genuinely represent a cost, and never
   * reversed or voided ones — so nothing is double counted.
   */
  const totals = useMemo(() => {
    const t = { net: 0, vat: 0, total: 0, count: 0, unpaidSupplier: 0, paid: 0 };
    for (const r of filtered) {
      if (!countsAsExpense(r)) continue;
      t.net += Number(r.amount); t.vat += Number(r.vat_amount); t.total += Number(r.total); t.count++;
      const paid = Number(r.amount_paid ?? 0);
      t.paid += paid;
      if ((r.transaction_type ?? "") === "supplier_expense") t.unpaidSupplier += Math.max(0, Number(r.total) - paid);
    }
    return t;
  }, [filtered]);

  const reverseExpense = async (r: Expense) => {
    if (r.status === "reversed") return;
    const reason = window.prompt(`Reverse expense ${r.expense_number ?? ""}? Enter a reason (required):`);
    if (!reason?.trim()) return;
    try {
      if (r.journal_entry_id) await reverseJournalEntry(r.journal_entry_id, reason);
      await supabase.from("expenses").update({ status: "reversed" }).eq("id", r.id);
      toast.success("Expense reversed — the original entry is kept for audit"); setDrawer(null); void load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (r: Expense) => {
    if (r.journal_entry_id && r.status !== "reversed") {
      toast.error("This expense is posted. Reverse it instead — posted accounting records are never deleted.");
      return;
    }
    if (!confirm("Delete this unposted expense record?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); setDrawer(null); void load(); }
  };

  const vat = +(amount * (vatRate / 100)).toFixed(2);
  const total = +(amount + vat).toFixed(2);
  const meta = txnTypeMeta(txnType);
  const paysNow = txnType === "business_expense" ? true : settleNow;
  /** Credit side: cash/bank when settled immediately, otherwise the payable. */
  const creditAccountId = paysNow ? bankAccountId : payableAccount?.id ?? "";

  const previewLines: PreviewLine[] = useMemo(() => {
    if (!expenseAccountId || !creditAccountId || total <= 0) return [];
    const lines: PreviewLine[] = [];
    const useVatAccount = vat > 0 && !!vatInputAccount;
    lines.push({ account: accountLabel(expenseAccountId), description: category, debit: useVatAccount ? amount : total, credit: 0 });
    if (useVatAccount) lines.push({ account: accountLabel(vatInputAccount!.id), description: "VAT input", debit: vat, credit: 0 });
    lines.push({
      account: accountLabel(creditAccountId),
      description: paysNow ? `Paid via ${payment}` : "Amount owed",
      debit: 0, credit: total,
    });
    return lines;
  }, [expenseAccountId, creditAccountId, amount, vat, total, category, payment, paysNow, accounts]);

  const resetForm = () => {
    setTxnType("business_expense");
    setDate(new Date().toISOString().slice(0, 10)); setCategory(CATEGORIES[0]); setPayment("cash");
    setAmount(0); setVatRate(0); setReference(""); setNotes("");
    setSupplierId(""); setEmployeeId(""); setBranchId(""); setLinkedBillId(""); setSettleNow(true);
  };
  const openNew = () => { resetForm(); setOpen(true); };

  const supplierOptions: EntityOption[] = useMemo(() => suppliers.map(s => ({
    id: s.id, code: s.supplier_code, label: s.name,
    meta: [s.phone, s.tpin ? `TPIN ${s.tpin}` : null].filter(Boolean).join(" · ") || null,
    trailing: s.current_balance ? fmtMoney(s.current_balance) : null,
  })), [suppliers]);
  const employeeOptions: EntityOption[] = useMemo(() => employees.map(e => ({
    id: e.id, code: e.employee_code, label: `${e.first_name} ${e.last_name}`, meta: e.status ?? null,
  })), [employees]);
  const branchOptions: EntityOption[] = useMemo(() => branches.map(b => ({
    id: b.id, code: b.code, label: b.name, meta: b.active === false ? "Inactive" : null,
  })), [branches]);
  const billOptions: EntityOption[] = useMemo(() => bills
    .filter(b => !supplierId || b.supplier_id === supplierId)
    .map(b => ({
      id: b.id, code: b.bill_number, label: b.supplier_invoice_number || b.bill_number || "Bill",
      meta: b.bill_date, trailing: b.total != null ? fmtMoney(b.total) : null,
    })), [bills, supplierId]);

  const linkedBill = bills.find(b => b.id === linkedBillId) ?? null;

  const blockedByBill = txnType === "supplier_expense" && !!linkedBill;
  const missingPayable = !paysNow && !payableAccount;

  const save = async () => {
    if (!userId) return toast.error("Not signed in");
    if (blockedByBill) return toast.error("This cost is already on a supplier bill — record the payment, not the cost again");
    if (txnType === "supplier_expense" && !supplierId) return toast.error("Select the existing supplier first");
    if (txnType === "reimbursement" && !employeeId) return toast.error("Select the existing employee first");
    if (!expenseAccountId) return toast.error("Select the expense account");
    if (paysNow && !bankAccountId) return toast.error("Select the cash / bank account the money came from");
    if (missingPayable) return toast.error("No Accounts Payable account found in your chart of accounts");
    if (amount <= 0) return toast.error("Amount must be > 0");
    if (!isBalanced(previewLines)) return toast.error("This transaction is not balanced — debits must equal credits");
    setSaving(true);

    const base = {
      user_id: userId, expense_date: date, category, payment_method: payment,
      transaction_type: txnType,
      supplier_id: supplierId || null, employee_id: employeeId || null, branch_id: branchId || null,
      bank_account_id: paysNow ? bankAccountId : null, expense_account_id: expenseAccountId,
      amount, vat_amount: vat, total,
      amount_paid: paysNow ? total : 0,
      payment_status: derivePaymentStatus(total, paysNow ? total : 0),
      approval_status: "approved",
      created_by: userId,
      reference: reference || null, notes: notes || null,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const number = `EXP-${Date.now().toString().slice(-8)}`;
      const { queueInsert } = await import("@/lib/offline-queue");
      await queueInsert("expenses", { ...base, expense_number: number, status: "pending_sync" });
      toast.success(`Expense ${number} saved offline — will sync when back online`);
      setOpen(false); resetForm(); setSaving(false); void load();
      return;
    }

    try {
      const number = `EXP-${Date.now().toString().slice(-8)}`;
      const { data: je, error: je1 } = await supabase.from("journal_entries").insert({
        user_id: userId, entry_number: `JE-${number}`, entry_date: date,
        reference: `EXP:${number}`,
        description: `${meta.label} — ${category}${reference ? ` — ${reference}` : ""}`.trim(),
        status: "posted", total_debit: total, total_credit: total,
      }).select().single();
      if (je1 || !je) throw new Error(je1?.message ?? "Failed to post journal entry");
      const lines: any[] = [
        { user_id: userId, entry_id: je.id, account_id: expenseAccountId, description: category, debit: amount, credit: 0 },
      ];
      if (vat > 0) {
        if (vatInputAccount) lines.push({ user_id: userId, entry_id: je.id, account_id: vatInputAccount.id, description: "VAT input", debit: vat, credit: 0 });
        else lines[0].debit = total;
      }
      lines.push({
        user_id: userId, entry_id: je.id, account_id: creditAccountId,
        description: paysNow ? `Paid via ${payment}` : "Amount owed", debit: 0, credit: total,
      });
      await supabase.from("journal_lines").insert(lines);
      const { error: e2 } = await supabase.from("expenses").insert({
        ...base, expense_number: number, status: "posted", journal_entry_id: je.id,
        posted_by: userId, posted_at: new Date().toISOString(),
        approved_by: userId, approved_at: new Date().toISOString(),
      } as any);
      if (e2) throw new Error(e2.message);
      toast.success(`${meta.label} ${number} recorded and posted`);
      setOpen(false); resetForm(); void load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const columns: DTColumn<Expense>[] = useMemo(() => [
    { key: "expense_date", header: "Date", accessor: r => r.expense_date, cell: r => <span className="tabular-nums text-xs">{r.expense_date}</span> },
    { key: "expense_number", header: "Number", accessor: r => r.expense_number ?? "", cell: r => <span className="font-mono text-xs">{r.expense_number}</span> },
    { key: "transaction_type", header: "Type", accessor: r => txnTypeMeta(r.transaction_type).label, cell: r => <TransactionTypeBadge type={r.transaction_type} /> },
    { key: "payee", header: "Supplier / Payee", accessor: r => payeeOf(r) ?? "", cell: r => <span className="text-sm">{payeeOf(r)}</span> },
    { key: "category", header: "Expense account / category", accessor: r => r.category ?? "", cell: r => (
      <div className="text-xs"><div>{r.category ?? "—"}</div><div className="text-muted-foreground">{accountLabel(r.expense_account_id)}</div></div>
    ) },
    { key: "reference", header: "Reference", accessor: r => r.reference ?? "", cell: r => <span className="text-muted-foreground text-xs">{r.reference ?? ""}</span>, defaultHidden: true },
    { key: "source", header: "Payment / source account", accessor: r => accountLabel(r.bank_account_id), cell: r => (
      <span className="text-xs">{r.bank_account_id ? accountLabel(r.bank_account_id) : "On credit (payable)"}</span>
    ) },
    { key: "amount", header: "Net", align: "right", accessor: r => Number(r.amount), cell: r => <span className="tabular-nums">{fmtMoney(r.amount)}</span> },
    { key: "vat_amount", header: "VAT / Input tax", align: "right", accessor: r => Number(r.vat_amount), cell: r => <span className="tabular-nums">{fmtMoney(r.vat_amount)}</span> },
    { key: "total", header: "Total", align: "right", accessor: r => Number(r.total), cell: r => <span className="tabular-nums font-semibold">{fmtMoney(r.total)}</span> },
    { key: "status", header: "Accounting", accessor: r => r.status, cell: r => <AccountingStatusBadge status={r.status} /> },
    { key: "payment_status", header: "Payment", accessor: r => r.payment_status ?? "", cell: r => <PaymentStatusBadge status={r.payment_status} /> },
    { key: "approval_status", header: "Approval", accessor: r => r.approval_status ?? "", cell: r => <ApprovalStatusBadge status={r.approval_status} /> },
  ], [accounts, suppliers, employees]);

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="purchases"
          icon={Receipt}
          title="Record expense"
          subtitle={meta.description}
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={saving}
          saveDisabled={!isBalanced(previewLines) || blockedByBill}
          saveLabel="Save & Post"
        >
          <SifoFormSection title="What kind of transaction is this?" columns={1}>
            <div className="grid gap-2 sm:grid-cols-3">
              {EXPENSE_TXN_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxnType(t)}
                  className={`rounded-lg border p-3 text-left transition ${txnType === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                >
                  <div className="text-sm font-semibold">{TXN_TYPES[t].label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{TXN_TYPES[t].description}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Moving money between your own accounts is a transfer, not an expense — record it in{" "}
              <Link to="/banking" className="text-primary hover:underline">Banking</Link>. Paying an existing supplier bill
              belongs in <Link to="/bill-payments" className="text-primary hover:underline">Supplier Payments</Link>.
            </p>
          </SifoFormSection>

          {txnType !== "business_expense" && (
            <SifoFormSection title={txnType === "reimbursement" ? "Employee" : "Supplier"} columns={1}>
              {txnType === "supplier_expense" ? (
                <>
                  <EntitySelector
                    label="Existing supplier"
                    help="Pick the supplier this cost came from. Create a new supplier only when it truly does not exist yet."
                    options={supplierOptions}
                    value={supplierId}
                    onChange={v => { setSupplierId(v ?? ""); setLinkedBillId(""); }}
                    required
                    emptyTitle="No suppliers yet"
                    emptyActionLabel="Go to Suppliers"
                    emptyActionTo="/suppliers"
                    recentKey="expense-supplier"
                  />
                  <EntitySelector
                    label="Already recorded on a supplier bill?"
                    help="If this cost is already captured on a bill, do not record it again here — pay the bill instead."
                    options={billOptions}
                    value={linkedBillId}
                    onChange={v => setLinkedBillId(v ?? "")}
                    clearable
                    placeholder="No — this cost is not on a bill yet"
                  />
                  {blockedByBill && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">This cost is already recorded on bill {linkedBill?.bill_number}.</p>
                        <p className="text-muted-foreground">Recording it again would double count the expense. Settle it in{" "}
                          <Link to="/bill-payments" className="text-primary hover:underline">Supplier Payments</Link> instead.</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EntitySelector
                  label="Existing employee"
                  help="The employee who paid this cost personally and is being reimbursed."
                  options={employeeOptions}
                  value={employeeId}
                  onChange={v => setEmployeeId(v ?? "")}
                  required
                  emptyTitle="No employees yet"
                  emptyActionLabel="Go to Employees"
                  emptyActionTo="/employees"
                  recentKey="expense-employee"
                />
              )}
            </SifoFormSection>
          )}

          <SifoFormSection title="Details">
            <SifoField label="Date" required>
              <Input type="date" className="h-11" value={date} onChange={e => setDate(e.target.value)} />
            </SifoField>
            <SifoField label="Category" required>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Amount (Net)" required>
              <Input type="number" step="0.01" className="h-11" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </SifoField>
            <SifoField label="VAT Rate %">
              <Input type="number" step="0.01" className="h-11" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} />
            </SifoField>
            <SifoField label="Total (auto)">
              <Input className="h-11" value={total.toFixed(2)} readOnly />
            </SifoField>
            <SifoField label="Reference">
              <Input className="h-11" value={reference} onChange={e => setReference(e.target.value)} placeholder="Receipt #, txn ref…" />
            </SifoField>
            <SifoField label="Notes" wide>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </SifoField>
          </SifoFormSection>

          <SifoFormSection title="Settlement" columns={1}>
            {txnType !== "business_expense" && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={settleNow ? "default" : "outline"} onClick={() => setSettleNow(true)}>
                  Paid now from cash / bank
                </Button>
                <Button type="button" size="sm" variant={!settleNow ? "default" : "outline"} onClick={() => setSettleNow(false)}>
                  Unpaid — owed for now
                </Button>
              </div>
            )}
            {paysNow ? (
              <>
                <SifoField label="Payment Method" required>
                  <Select value={payment} onValueChange={setPayment}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="airtel">Airtel Money</SelectItem>
                      <SelectItem value="mtn">MTN Money</SelectItem>
                      <SelectItem value="zamtel">Zamtel Money</SelectItem>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="mastercard">Mastercard</SelectItem>
                    </SelectContent>
                  </Select>
                </SifoField>
                <AccountSelector
                  label="Paid From (Cash / Bank Account)"
                  help="Select the existing bank or cash account the money left. This account is credited."
                  accounts={cashBankAccounts}
                  value={bankAccountId}
                  onChange={v => setBankAccountId(v ?? "")}
                  required
                  recentKey="paid-from-account"
                />
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                The cost is posted now and shown as <strong>Outstanding</strong>. It is credited to{" "}
                {payableAccount ? accountLabel(payableAccount.id) : "Accounts Payable"} and settled later through a payment.
              </p>
            )}
          </SifoFormSection>

          <SifoFormSection title="Ledger accounts & location">
            <AccountSelector
              label="Expense Account"
              help="Select the existing expense account that describes the cost. This account is debited."
              accounts={expenseAccounts}
              value={expenseAccountId}
              onChange={v => setExpenseAccountId(v ?? "")}
              required
              recentKey="expense-account"
            />
            <EntitySelector
              label="Branch / location"
              help="Optional. Attribute this cost to an existing branch."
              options={branchOptions}
              value={branchId}
              onChange={v => setBranchId(v ?? "")}
              clearable
              recentKey="expense-branch"
            />
          </SifoFormSection>

          <SifoFormSection title="Posting" columns={1}>
            <WhatWasPosted
              type={txnType}
              hasVat={vat > 0}
              sourceAccount={paysNow ? accountLabel(bankAccountId) : undefined}
              expenseAccount={accountLabel(expenseAccountId)}
            />
            <PostingPreview lines={previewLines} title="Journal that will be posted" />
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <SifoHubTabs hub="finance" active="/expenses" />
      <SifoModuleHeader
        module="purchases"
        icon={Receipt}
        title="Expenses"
        description="Every expense shows what it is, who it is for, the account it hit, whether it was approved, posted and paid."
        breadcrumbs={[{ label: "Purchases", to: "/bills" }, { label: "Expenses" }]}
        actions={<>
          <DateRangeFilter value={range} onChange={setRange} compact />
          <ExportMenu
            rows={filtered.map(r => ({
              Date: r.expense_date, Number: r.expense_number ?? "", Type: txnTypeMeta(r.transaction_type).label,
              "Supplier/Payee": payeeOf(r) ?? "", Category: r.category ?? "", Account: accountLabel(r.expense_account_id),
              Reference: r.reference ?? "", "Source account": r.bank_account_id ? accountLabel(r.bank_account_id) : "Payable",
              Net: r.amount, VAT: r.vat_amount, Total: r.total,
              Accounting: r.status, Payment: r.payment_status ?? "", Approval: r.approval_status ?? "",
            }))}
            filename="expenses"
            title="Expenses"
          />
          <Button onClick={openNew} size="sm"><Plus className="mr-1.5 h-4 w-4" />New expense</Button>
        </>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total posted expenses" value={fmtMoney(totals.total)} hint={`${totals.count} transactions`} />
        <Kpi label="Unpaid supplier expenses" value={fmtMoney(totals.unpaidSupplier)} hint="Still owed to suppliers" />
        <Kpi label="Paid expenses" value={fmtMoney(totals.paid)} hint="Already settled" />
        <Kpi label="VAT / input tax" value={fmtMoney(totals.vat)} hint="Recoverable input tax" />
        <Kpi label="Net of tax" value={fmtMoney(totals.net)} hint="Excludes VAT" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          <FilterSelect label="Type" value={fType} onChange={setFType}
            options={EXPENSE_TXN_TYPES.map(t => ({ value: t, label: TXN_TYPES[t].label }))} />
          <FilterSelect label="Accounting" value={fStatus} onChange={setFStatus}
            options={[{ value: "posted", label: "Posted" }, { value: "reversed", label: "Reversed" }, { value: "pending_sync", label: "Pending sync" }]} />
          <FilterSelect label="Payment" value={fPayment} onChange={setFPayment}
            options={[{ value: "paid", label: "Paid" }, { value: "partially_paid", label: "Partially paid" }, { value: "unpaid", label: "Outstanding" }]} />
          <FilterSelect label="Approval" value={fApproval} onChange={setFApproval}
            options={[{ value: "approved", label: "Approved" }, { value: "submitted", label: "Awaiting approval" }, { value: "draft", label: "Draft" }, { value: "rejected", label: "Rejected" }]} />
          <FilterSelect label="Supplier" value={fSupplier} onChange={setFSupplier}
            options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
          <FilterSelect label="Category" value={fCategory} onChange={setFCategory}
            options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          <FilterSelect label="Branch" value={fBranch} onChange={setFBranch}
            options={branches.map(b => ({ value: b.id, label: b.name }))} />
        </CardContent>
      </Card>

      <DataTable<Expense>
        data={filtered}
        columns={columns}
        loading={loading}
        onRowClick={r => setDrawer(r)}
        tableId="expenses-table"
        empty="No expenses match these filters."
      />

      <DetailDrawer
        open={!!drawer}
        onOpenChange={o => { if (!o) setDrawer(null); }}
        title={drawer ? `${txnTypeMeta(drawer.transaction_type).label} ${drawer.expense_number ?? ""}` : ""}
        subtitle={drawer ? `${drawer.expense_date} · ${fmtMoney(drawer.total)}` : ""}
      >
        {drawer && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <TransactionTypeBadge type={drawer.transaction_type} />
              <ApprovalStatusBadge status={drawer.approval_status} />
              <AccountingStatusBadge status={drawer.status} />
              <PaymentStatusBadge status={drawer.payment_status} />
            </div>

            <DrawerSection title="Transaction information">
              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerField label="Document number">{drawer.expense_number ?? "—"}</DrawerField>
                <DrawerField label="Date">{drawer.expense_date}</DrawerField>
                <DrawerField label="Supplier / payee">{payeeOf(drawer) ?? "—"}</DrawerField>
                <DrawerField label="Branch / location">{branchName(drawer.branch_id) ?? "—"}</DrawerField>
                <DrawerField label="Expense account">{accountLabel(drawer.expense_account_id)}</DrawerField>
                <DrawerField label="Category">{drawer.category ?? "—"}</DrawerField>
                <DrawerField label="VAT / tax treatment">{Number(drawer.vat_amount) > 0 ? `Input tax ${fmtMoney(drawer.vat_amount)}` : "No VAT claimed"}</DrawerField>
                <DrawerField label="Source account">{drawer.bank_account_id ? accountLabel(drawer.bank_account_id) : "On credit (payable)"}</DrawerField>
                <DrawerField label="Payment method">{drawer.payment_method}</DrawerField>
                <DrawerField label="Reference">{drawer.reference ?? "—"}</DrawerField>
                <DrawerField label="Net">{fmtMoney(drawer.amount)}</DrawerField>
                <DrawerField label="Total">{fmtMoney(drawer.total)}</DrawerField>
                <DrawerField label="Amount paid">{fmtMoney(drawer.amount_paid ?? 0)}</DrawerField>
                <DrawerField label="Outstanding">{fmtMoney(Math.max(0, Number(drawer.total) - Number(drawer.amount_paid ?? 0)))}</DrawerField>
              </div>
            </DrawerSection>

            <DrawerSection title="Audit trail">
              <div className="grid gap-3 sm:grid-cols-2">
                <DrawerField label="Created">{drawer.created_at ? new Date(drawer.created_at).toLocaleString() : "—"}</DrawerField>
                <DrawerField label="Approved at">{drawer.approved_at ? new Date(drawer.approved_at).toLocaleString() : "—"}</DrawerField>
                <DrawerField label="Posted at">{drawer.posted_at ? new Date(drawer.posted_at).toLocaleString() : "—"}</DrawerField>
                <DrawerField label="Notes">{drawer.notes ?? "—"}</DrawerField>
              </div>
            </DrawerSection>

            {drawer.bill_id && (
              <Link to="/bill-detail/$id" params={{ id: drawer.bill_id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Linked supplier bill <ExternalLink className="h-3 w-3" />
              </Link>
            )}

            <WhatWasPosted
              type={(drawer.transaction_type ?? "business_expense") as FinanceTxnType}
              entryId={drawer.journal_entry_id}
              hasVat={Number(drawer.vat_amount) > 0}
              sourceAccount={drawer.bank_account_id ? accountLabel(drawer.bank_account_id) : null}
              expenseAccount={accountLabel(drawer.expense_account_id)}
            />

            <PostingFlow kind="expense" reference={drawer.expense_number ? `EXP:${drawer.expense_number}` : null} />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => reverseExpense(drawer)} disabled={drawer.status === "reversed"}>
                <Undo2 className="mr-1.5 h-4 w-4" />Reverse
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(drawer)}>
                <Trash2 className="mr-1.5 h-4 w-4" />Delete
              </Button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[10rem] text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
