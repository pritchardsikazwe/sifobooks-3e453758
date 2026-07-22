import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Loader2, Undo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { reverseJournalEntry } from "@/lib/reversal";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";

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
  const filtered = useMemo(() => rows.filter(r => inRange(r.expense_date, range)), [rows, range]);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    // Rely on RLS to scope to current company/user — showing every expense the user can see.
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
      toast.success("Expense reversed");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (r: Expense) => {
    if (!confirm("Delete this expense record? If it has a posting, reverse it first.")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2"><Receipt className="h-6 w-6 text-emerald-600" /> Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Record cash/bank expenses. Each posted expense creates a journal entry and can be reversed if wrong.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter value={range} onChange={setRange} compact />
          <ExportMenu rows={filtered.map(r => ({ Date: r.expense_date, Number: r.expense_number ?? "", Category: r.category ?? "", Payment: r.payment_method, Reference: r.reference ?? "", Net: r.amount, VAT: r.vat_amount, Total: r.total, Status: r.status }))} filename="expenses" title="Expenses" />
          <NewExpenseDialog open={open} setOpen={setOpen} userId={userId} accounts={accounts} onSaved={load} />
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4 flex flex-wrap items-center gap-6">
          <Stat label="Entries" value={String(totals.count)} />
          <Stat label="Net" value={fmtMoney(totals.amount)} />
          <Stat label="VAT" value={fmtMoney(totals.vat)} />
          <Stat label="Total" value={fmtMoney(totals.total)} accent />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle>All expenses</CardTitle><CardDescription>Latest first.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</div>
            : filtered.length === 0 ? <div className="py-10 text-center text-slate-400">No expenses in this range.</div>
            : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Number</TableHead><TableHead>Category</TableHead>
                    <TableHead>Payment</TableHead><TableHead>Reference</TableHead>
                    <TableHead className="text-right">Net</TableHead><TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead />
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id} className={r.status === "reversed" ? "opacity-50" : ""}>
                        <TableCell>{r.expense_date}</TableCell>
                        <TableCell className="font-mono text-xs">{r.expense_number}</TableCell>
                        <TableCell>{r.category ?? "—"}</TableCell>
                        <TableCell className="capitalize">{r.payment_method}</TableCell>
                        <TableCell className="text-slate-500">{r.reference ?? ""}</TableCell>
                        <TableCell className="text-right">{fmtMoney(r.amount)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(r.vat_amount)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtMoney(r.total)}</TableCell>
                        <TableCell><Badge variant={r.status === "reversed" ? "outline" : "secondary"}>{r.status}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.status !== "reversed" && <Button size="sm" variant="ghost" title="Reverse" onClick={() => reverseExpense(r)}><Undo2 className="h-4 w-4 text-amber-600" /></Button>}
                          <Button size="sm" variant="ghost" title="Delete" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-emerald-600" : "text-slate-900"}`}>{value}</div>
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
  const cashBankAccounts = accounts.filter(a => a.account_type === "asset" && /(cash|bank|mobile|airtel|mtn|zamtel|visa|master)/i.test(a.account_name));

  useEffect(() => {
    if (!expenseAccountId && expenseAccounts[0]) setExpenseAccountId(expenseAccounts[0].id);
    if (!bankAccountId && cashBankAccounts[0]) setBankAccountId(cashBankAccounts[0].id);
  }, [accounts.length]);

  const vat = +(amount * (vatRate / 100)).toFixed(2);
  const total = +(amount + vat).toFixed(2);

  const save = async () => {
    if (!userId) return toast.error("Not signed in");
    if (!expenseAccountId || !bankAccountId) return toast.error("Pick both expense and payment (cash/bank) accounts");
    if (amount <= 0) return toast.error("Amount must be > 0");
    setSaving(true);
    try {
      // Number
      const number = `EXP-${Date.now().toString().slice(-8)}`;
      // Create JE
      const { data: je, error: je1 } = await supabase.from("journal_entries").insert({
        user_id: userId, entry_number: `JE-${number}`, entry_date: date,
        reference: `EXP:${number}`, description: `${category} — ${reference || notes || ""}`.trim(),
        status: "posted", total_debit: total, total_credit: total,
      }).select().single();
      if (je1 || !je) throw new Error(je1?.message ?? "Failed to post JE");

      // Lines: DR Expense (amount) + DR VAT input (vat) ; CR Cash/Bank (total)
      const lines: any[] = [
        { user_id: userId, entry_id: je.id, account_id: expenseAccountId, description: category, debit: amount, credit: 0 },
      ];
      if (vat > 0) {
        const vatIn = accounts.find(a => /vat.*input|input.*vat/i.test(a.account_name));
        if (vatIn) lines.push({ user_id: userId, entry_id: je.id, account_id: vatIn.id, description: "VAT input", debit: vat, credit: 0 });
        else lines[0].debit = total; // fold VAT into expense if no VAT account
      }
      lines.push({ user_id: userId, entry_id: je.id, account_id: bankAccountId, description: `Paid via ${payment}`, debit: 0, credit: total });
      await supabase.from("journal_lines").insert(lines);

      // Save expense record
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
      <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" /> New Expense</Button></DialogTrigger>
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
          <div><Label>Expense Account</Label>
            <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{expenseAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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
          <div className="sm:col-span-2"><Label>Paid From (Cash / Bank Account)</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{cashBankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount (Net)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
          <div><Label>VAT Rate %</Label><Input type="number" step="0.01" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} /></div>
          <div><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Receipt #, txn ref…" /></div>
          <div><Label>Total (auto)</Label><Input value={total.toFixed(2)} readOnly /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save & Post</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
