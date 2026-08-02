import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Loader2, Undo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { reverseJournalEntry } from "@/lib/reversal";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { PostingPreview, isBalanced, type PreviewLine } from "@/components/PostingPreview";

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
};

function ExpensesPage() {
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [drawer, setDrawer] = useState<Expense | null>(null);
  const filtered = useMemo(() => rows.filter(r => inRange(r.expense_date, range)), [rows, range]);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const [{ data: ex }, { data: acc }] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("chart_of_accounts").select("id,account_code,account_name,account_type").eq("is_active", true).order("account_code"),
    ]);
    setRows((ex ?? []) as any);
    setAccounts((acc ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const t = { amount: 0, vat: 0, total: 0, count: 0 };
    for (const r of filtered) if (r.status !== "reversed") { t.amount += Number(r.amount); t.vat += Number(r.vat_amount); t.total += Number(r.total); t.count++; }
    return t;
  }, [filtered]);

  const reverseExpense = async (r: Expense) => {
    if (r.status === "reversed") return;
    if (!confirm(`Reverse expense ${r.expense_number ?? ""}? This creates a mirror journal entry to cancel the posting.`)) return;
    try {
      if (r.journal_entry_id) await reverseJournalEntry(r.journal_entry_id);
      await supabase.from("expenses").update({ status: "reversed" }).eq("id", r.id);
      toast.success("Expense reversed"); setDrawer(null); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (r: Expense) => {
    if (!confirm("Delete this expense record? If it has a posting, reverse it first.")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); setDrawer(null); load(); }
  };

  const columns: DTColumn<Expense>[] = useMemo(() => [
    { key: "expense_date", header: "Date", accessor: r => r.expense_date, cell: r => <span className="tabular-nums text-xs">{r.expense_date}</span> },
    { key: "expense_number", header: "Number", accessor: r => r.expense_number ?? "", cell: r => <span className="font-mono text-xs">{r.expense_number}</span> },
    { key: "category", header: "Category", accessor: r => r.category ?? "", cell: r => r.category ?? "—" },
    { key: "payment_method", header: "Payment", accessor: r => r.payment_method, cell: r => <span className="capitalize">{r.payment_method}</span> },
    { key: "reference", header: "Reference", accessor: r => r.reference ?? "", cell: r => <span className="text-muted-foreground text-xs">{r.reference ?? ""}</span>, defaultHidden: true },
    { key: "amount", header: "Net", align: "right", accessor: r => Number(r.amount), cell: r => <span className="tabular-nums">{fmtMoney(r.amount)}</span> },
    { key: "vat_amount", header: "VAT", align: "right", accessor: r => Number(r.vat_amount), cell: r => <span className="tabular-nums">{fmtMoney(r.vat_amount)}</span> },
    { key: "total", header: "Total", align: "right", accessor: r => Number(r.total), cell: r => <span className="tabular-nums font-semibold">{fmtMoney(r.total)}</span> },
    { key: "status", header: "Status", accessor: r => r.status, cell: r => <Badge variant={r.status === "reversed" ? "outline" : "secondary"}>{r.status}</Badge> },
  ], []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record cash/bank expenses. Each posted expense creates a journal entry and can be reversed if wrong.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter value={range} onChange={setRange} compact />
          <ExportMenu rows={filtered.map(r => ({ Date: r.expense_date, Number: r.expense_number ?? "", Category: r.category ?? "", Payment: r.payment_method, Reference: r.reference ?? "", Net: r.amount, VAT: r.vat_amount, Total: r.total, Status: r.status }))} filename="expenses" title="Expenses" />
          <NewExpenseDialog open={open} setOpen={setOpen} userId={userId} accounts={accounts} onSaved={load} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Entries" value={String(totals.count)} />
        <KPI label="Net" value={fmtMoney(totals.amount)} />
        <KPI label="VAT" value={fmtMoney(totals.vat)} />
        <KPI label="Total" value={fmtMoney(totals.total)} accent="text-primary" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search expenses…"
          onRowClick={setDrawer}
          empty={<div className="py-6"><Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" /><div>No expenses in this range.</div></div>}
        />
      )}

      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer ? `Expense ${drawer.expense_number ?? ""}` : ""}
        subtitle={drawer?.category ?? undefined}
        meta={drawer && <Badge variant={drawer.status === "reversed" ? "outline" : "secondary"}>{drawer.status}</Badge>}
        footer={drawer && (
          <>
            {drawer.status !== "reversed" && (
              <Button variant="outline" size="sm" onClick={() => reverseExpense(drawer)} className="text-amber-700">
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Reverse
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => remove(drawer)} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </>
        )}
      >
        {drawer && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <KPI compact label="Net" value={fmtMoney(drawer.amount)} />
              <KPI compact label="VAT" value={fmtMoney(drawer.vat_amount)} />
              <KPI compact label="Total" value={fmtMoney(drawer.total)} accent="text-primary" />
            </div>
            <DrawerSection title="Details">
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Date">{drawer.expense_date}</DrawerField>
                <DrawerField label="Payment method"><span className="capitalize">{drawer.payment_method}</span></DrawerField>
                <DrawerField label="Reference">{drawer.reference ?? "—"}</DrawerField>
                <DrawerField label="Status">{drawer.status}</DrawerField>
              </div>
            </DrawerSection>
            {drawer.notes && (
              <DrawerSection title="Notes"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{drawer.notes}</p></DrawerSection>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function KPI({ label, value, accent, compact }: { label: string; value: string; accent?: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-card ${compact ? "px-3 py-2" : "p-4"}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`${compact ? "text-base" : "text-2xl"} font-semibold tabular-nums mt-1 ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

const CATEGORIES = ["Fuel", "Vehicle Maintenance", "Office Supplies", "Utilities", "Rent", "Travel", "Mobile / Airtime", "Bank Charges", "Repairs", "Marketing", "Meals", "Professional Fees", "Other"];

function NewExpenseDialog({ open, setOpen, userId, accounts, onSaved }: { open: boolean; setOpen: (v: boolean) => void; userId: string; accounts: Account[]; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [payment, setPayment] = useState("cash");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const expenseAccounts = accounts.filter(a => a.account_type === "expense");
  const cashBankAccounts = accounts.filter(a => a.account_type === "asset" && /(cash|bank|mobile|airtel|mtn|zamtel|visa|master|petty)/i.test(a.account_name));

  useEffect(() => {
    if (!expenseAccountId && expenseAccounts[0]) setExpenseAccountId(expenseAccounts[0].id);
    if (!bankAccountId && cashBankAccounts[0]) setBankAccountId(cashBankAccounts[0].id);
  }, [accounts.length]);

  const vat = +(amount * (vatRate / 100)).toFixed(2);
  const total = +(amount + vat).toFixed(2);

  const vatInputAccount = accounts.find(a => /vat.*input|input.*vat/i.test(a.account_name));
  const label = (id: string) => {
    const a = accounts.find(x => x.id === id);
    return a ? `${a.account_code} — ${a.account_name}` : "—";
  };
  const previewLines: PreviewLine[] = useMemo(() => {
    if (!expenseAccountId || !bankAccountId || total <= 0) return [];
    const lines: PreviewLine[] = [];
    const useVatAccount = vat > 0 && !!vatInputAccount;
    lines.push({ account: label(expenseAccountId), description: category, debit: useVatAccount ? amount : total, credit: 0 });
    if (useVatAccount) lines.push({ account: label(vatInputAccount!.id), description: "VAT input", debit: vat, credit: 0 });
    lines.push({ account: label(bankAccountId), description: `Paid via ${payment}`, debit: 0, credit: total });
    return lines;
  }, [expenseAccountId, bankAccountId, amount, vat, total, category, payment, accounts]);

  const save = async () => {
    if (!userId) return toast.error("Not signed in");
    if (!expenseAccountId || !bankAccountId) return toast.error("Pick both expense and payment (cash/bank) accounts");
    if (amount <= 0) return toast.error("Amount must be > 0");
    if (!isBalanced(previewLines)) return toast.error("This transaction is not balanced — debits must equal credits");
    setSaving(true);
    // If offline, queue a pending expense row; server trigger will post JE on drain.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const number = `EXP-${Date.now().toString().slice(-8)}`;
      const { queueInsert } = await import("@/lib/offline-queue");
      await queueInsert("expenses", {
        user_id: userId, expense_number: number, expense_date: date, category, payment_method: payment,
        bank_account_id: bankAccountId, expense_account_id: expenseAccountId,
        amount, vat_amount: vat, total, reference: reference || null, notes: notes || null,
        status: "pending_sync",
      });
      toast.success(`Expense ${number} saved offline — will sync when back online`);
      setOpen(false); setAmount(0); setVatRate(0); setReference(""); setNotes("");
      setSaving(false); onSaved();
      return;
    }
    try {
      const number = `EXP-${Date.now().toString().slice(-8)}`;
      const { data: je, error: je1 } = await supabase.from("journal_entries").insert({
        user_id: userId, entry_number: `JE-${number}`, entry_date: date,
        reference: `EXP:${number}`, description: `${category} — ${reference || notes || ""}`.trim(),
        status: "posted", total_debit: total, total_credit: total,
      }).select().single();
      if (je1 || !je) throw new Error(je1?.message ?? "Failed to post JE");
      const lines: any[] = [
        { user_id: userId, entry_id: je.id, account_id: expenseAccountId, description: category, debit: amount, credit: 0 },
      ];
      if (vat > 0) {
        const vatIn = accounts.find(a => /vat.*input|input.*vat/i.test(a.account_name));
        if (vatIn) lines.push({ user_id: userId, entry_id: je.id, account_id: vatIn.id, description: "VAT input", debit: vat, credit: 0 });
        else lines[0].debit = total;
      }
      lines.push({ user_id: userId, entry_id: je.id, account_id: bankAccountId, description: `Paid via ${payment}`, debit: 0, credit: total });
      await supabase.from("journal_lines").insert(lines);
      const { error: e2 } = await supabase.from("expenses").insert({
        user_id: userId, expense_number: number, expense_date: date, category, payment_method: payment,
        bank_account_id: bankAccountId, expense_account_id: expenseAccountId,
        amount, vat_amount: vat, total, reference: reference || null, notes: notes || null,
        status: "posted", journal_entry_id: je.id,
      } as any);
      if (e2) throw new Error(e2.message);
      toast.success(`Expense ${number} recorded and posted`);
      setOpen(false); setAmount(0); setVatRate(0); setReference(""); setNotes("");
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="h-4 w-4 mr-1.5" /> New expense</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Record expense</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <AccountSelector
            label="Expense Account"
            help="Select the expense category that describes what the money was spent on. This account is debited."
            accounts={expenseAccounts}
            value={expenseAccountId}
            onChange={v => setExpenseAccountId(v ?? "")}
            required
            recentKey="expense-account"
          />
          <div><Label>Payment Method</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
          </div>
          <AccountSelector
            label="Paid From (Cash / Bank Account)"
            help="Select the bank or cash account the money was paid from. This account is credited."
            accounts={cashBankAccounts}
            value={bankAccountId}
            onChange={v => setBankAccountId(v ?? "")}
            required
            recentKey="paid-from-account"
            className="sm:col-span-2"
          />
          <div><Label>Amount (Net)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
          <div><Label>VAT Rate %</Label><Input type="number" step="0.01" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} /></div>
          <div><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Receipt #, txn ref…" /></div>
          <div><Label>Total (auto)</Label><Input value={total.toFixed(2)} readOnly /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="sm:col-span-2"><PostingPreview lines={previewLines} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !isBalanced(previewLines)}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save & Post</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
