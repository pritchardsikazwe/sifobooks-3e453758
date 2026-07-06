import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, CreditCard, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts")({
  head: () => ({ meta: [{ title: "Receipts — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: ReceiptsPage,
});

const METHODS = ["cash", "bank_transfer", "mobile_money", "card", "cheque"] as const;

function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [receiptDate, setReceiptDate] = useState(today);
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: rs }, { data: cs }, { data: invs }] = await Promise.all([
      supabase.from("receipts").select("*, customers(name), invoices(number)").order("receipt_date", { ascending: false }),
      supabase.from("customers").select("id, name").eq("active", true).order("name"),
      supabase.from("invoices").select("id, number, customer_id, total, balance_due, due_date, status, currency").gt("balance_due", 0).order("issue_date", { ascending: false }),
    ]);
    setReceipts(rs ?? []); setCustomers(cs ?? []); setOpenInvoices(invs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const invoicesForCustomer = useMemo(() => customerId ? openInvoices.filter(i => i.customer_id === customerId) : [], [customerId, openInvoices]);
  const overdue = openInvoices.filter(i => i.due_date && i.due_date < today);
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  useEffect(() => {
    if (invoiceId) {
      const inv = openInvoices.find(i => i.id === invoiceId);
      if (inv) setAmount(Number(inv.balance_due));
    }
  }, [invoiceId, openInvoices]);

  const save = async () => {
    if (!customerId) return toast.error("Select a customer");
    if (amount <= 0) return toast.error("Amount must be positive");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const number = `RCT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const { error } = await supabase.from("receipts").insert({
      user_id: u.user.id, customer_id: customerId, invoice_id: invoiceId || null, number,
      receipt_date: receiptDate, amount, method, reference: reference || null, notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Receipt ${number} captured`);
    setOpen(false);
    setCustomerId(""); setInvoiceId(""); setAmount(0); setReference(""); setNotes("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this receipt? Invoice balance will be restored.")) return;
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><CreditCard className="h-6 w-6 text-emerald-600" /> Receipts</h1>
          <p className="text-sm text-muted-foreground">Capture customer payments — invoice balances update automatically.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Receive payment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Receive payment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Customer *</Label>
                <Select value={customerId} onValueChange={v => { setCustomerId(v); setInvoiceId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Apply to invoice (optional)</Label>
                <Select value={invoiceId || "none"} onValueChange={v => setInvoiceId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Unallocated" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unallocated / on account</SelectItem>
                    {invoicesForCustomer.map(i => <SelectItem key={i.id} value={i.id}>{i.number} — bal {fmtMoney(i.balance_due, i.currency)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} /></div>
                <div className="space-y-1"><Label>Amount *</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
                <div className="space-y-1"><Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Txn #, cheque #…" /></div>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Capture"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span><strong>{overdue.length}</strong> overdue invoice{overdue.length === 1 ? "" : "s"} totalling <strong>{fmtMoney(overdueTotal)}</strong> — chase payment.</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading…</div> :
          receipts.length === 0 ? <div className="py-12 text-center text-muted-foreground">No receipts yet. Capture the first payment above.</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
              <TableHead>Invoice</TableHead><TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>{receipts.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.number}</TableCell>
                <TableCell className="text-xs">{r.receipt_date}</TableCell>
                <TableCell>{r.customers?.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.invoices?.number ?? <span className="text-muted-foreground">Unallocated</span>}</TableCell>
                <TableCell className="text-xs capitalize">{r.method.replace("_", " ")}</TableCell>
                <TableCell className="text-right font-medium text-emerald-700">{fmtMoney(r.amount, r.currency)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
}
