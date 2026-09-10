import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { SifoHubTabs } from "@/components/sifo/SifoHubTabs";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { PostingPreview } from "@/components/PostingPreview";

export const Route = createFileRoute("/_authenticated/bill-payments")({
  head: () => ({ meta: [{ title: "Supplier Payments — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BillPaymentsPage,
});

const METHODS = [
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "cheque", label: "Cheque" },
];

/** Money is handled in integer ngwee so allocation totals never drift. */
const toMinor = (v: unknown) => Math.round((Number(v) || 0) * 100);
const toMajor = (m: number) => m / 100;

type Bill = {
  id: string; bill_number: string | null; supplier_invoice_number: string | null;
  bill_date: string | null; due_date: string | null; total: number | null;
  amount_paid: number | null; balance_due: number | null; status: string | null;
  supplier_id: string | null;
};

function BillPaymentsPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [openBills, setOpenBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [q, setQ] = useState("");

  // Payment form
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [method, setMethod] = useState("bank");
  const [bankAccountId, setBankAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  /** bill id -> allocated amount as typed */
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: ps, error }, { data: sup }, { data: bk }, { data: bl }] = await Promise.all([
      supabase.from("bill_payments").select("*, suppliers(name), bills(bill_number, supplier_invoice_number)").order("payment_date", { ascending: false }),
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("bank_accounts").select("id, name, account_number, cashbook_type").eq("is_active", true).order("name"),
      supabase.from("bills").select("id, bill_number, supplier_invoice_number, bill_date, due_date, total, amount_paid, balance_due, status, supplier_id")
        .gt("balance_due", 0).order("due_date", { ascending: true }),
    ]);
    if (error) toast.error(error.message);
    setPayments(ps ?? []); setSuppliers(sup ?? []); setBanks(bk ?? []);
    setOpenBills((bl ?? []) as Bill[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const billsForSupplier = useMemo(
    () => (supplierId ? openBills.filter(b => b.supplier_id === supplierId) : []),
    [supplierId, openBills],
  );

  const allocated = useMemo(() => {
    let total = 0;
    const errors: string[] = [];
    for (const b of billsForSupplier) {
      const minor = toMinor(alloc[b.id]);
      if (!minor) continue;
      if (minor < 0) errors.push(`${b.bill_number ?? "Bill"}: amount cannot be negative`);
      if (minor > toMinor(b.balance_due)) errors.push(`${b.bill_number ?? "Bill"}: more than the outstanding balance`);
      total += minor;
    }
    return { totalMinor: total, errors };
  }, [alloc, billsForSupplier]);

  const supplierName = suppliers.find(s => s.id === supplierId)?.name ?? "";
  const canPost = !!supplierId && allocated.totalMinor > 0 && allocated.errors.length === 0
    && !(method === "bank" && !bankAccountId);

  const previewLines = useMemo(() => {
    const amt = toMajor(allocated.totalMinor);
    if (!amt) return [];
    return [
      { account: "2100 · Accounts Payable", description: `Settle ${supplierName || "supplier"} bills`, debit: amt, credit: 0 },
      { account: method === "bank" ? (banks.find(b => b.id === bankAccountId)?.name ?? "Bank") : "1000 · Cash & Bank", description: `${method.replace("_", " ")} payment`, debit: 0, credit: amt },
    ];
  }, [allocated.totalMinor, supplierName, method, bankAccountId, banks]);

  const resetForm = () => {
    setSupplierId(""); setPaymentDate(today); setMethod("bank"); setBankAccountId("");
    setReference(""); setNotes(""); setAlloc({});
  };

  const nextNumber = async (userId: string, index: number) => {
    const { data } = await supabase.rpc("next_doc_number", { _uid: userId, _prefix: "PAY" });
    if (typeof data === "string" && data) return index === 0 ? data : `${data}-${index + 1}`;
    return `PAY-${Date.now().toString().slice(-8)}${index ? `-${index + 1}` : ""}`;
  };

  const save = async () => {
    if (!canPost) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const lines = billsForSupplier
        .map(b => ({ bill: b, minor: toMinor(alloc[b.id]) }))
        .filter(l => l.minor > 0);

      let posted = 0;
      for (const [i, line] of lines.entries()) {
        const payment_number = await nextNumber(u.user.id, i);
        // Insert only — the existing bill_payments auto-post trigger writes the journal.
        const { error } = await supabase.from("bill_payments").insert({
          user_id: u.user.id,
          bill_id: line.bill.id,
          supplier_id: supplierId,
          payment_number,
          payment_date: paymentDate,
          amount: toMajor(line.minor),
          payment_method: method,
          reference: reference || null,
          notes: notes || null,
          bank_account_id: method === "bank" ? bankAccountId : null,
        } as any);
        if (error) throw new Error(`${line.bill.bill_number ?? "Bill"}: ${error.message}`);

        // Keep the bill's own paid / outstanding figures in step with the payment.
        const paidMinor = toMinor(line.bill.amount_paid) + line.minor;
        const balMinor = Math.max(toMinor(line.bill.total) - paidMinor, 0);
        const { error: upErr } = await supabase.from("bills").update({
          amount_paid: toMajor(paidMinor),
          balance_due: toMajor(balMinor),
          status: balMinor === 0 ? "paid" : "open",
        } as any).eq("id", line.bill.id);
        if (upErr) throw new Error(upErr.message);
        posted += 1;
      }

      toast.success(`${posted} supplier payment${posted === 1 ? "" : "s"} posted for ${supplierName}`);
      setOpen(false);
      resetForm();
      void load();
    } catch (e: any) {
      toast.error(e?.message ?? "Payment could not be posted");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return payments.filter(p => {
      if (!inRange(p.payment_date, range)) return false;
      if (!s) return true;
      return [p.payment_number, p.reference, p.suppliers?.name, p.bills?.bill_number]
        .join(" ").toLowerCase().includes(s);
    });
  }, [payments, range, q]);

  const columns: DTColumn<any>[] = [
    { key: "payment_number", header: "Payment #", cell: r => <Link to="/bill-payment-detail/$id" params={{ id: r.id }} className="font-mono text-xs text-primary hover:underline">{r.payment_number}</Link> },
    { key: "payment_date", header: "Date", cell: r => <span className="text-xs">{r.payment_date}</span> },
    { key: "supplier", header: "Supplier", accessor: r => r.suppliers?.name ?? "", cell: r => r.suppliers?.name ?? <span className="text-muted-foreground">—</span> },
    { key: "bill", header: "Bill", accessor: r => r.bills?.bill_number ?? "", cell: r => <span className="font-mono text-xs">{r.bills?.bill_number ?? "—"}</span> },
    { key: "payment_method", header: "Method", cell: r => <span className="text-xs capitalize">{String(r.payment_method ?? "").replace(/_/g, " ")}</span> },
    { key: "reference", header: "Reference", cell: r => <span className="text-xs">{r.reference ?? "—"}</span> },
    { key: "amount", header: "Amount", align: "right", cell: r => <span className="font-semibold tabular-nums">{fmtMoney(r.amount ?? 0)}</span> },
    { key: "open", header: "", sortable: false, align: "right", cell: r => <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/bill-payment-detail/$id", params: { id: r.id } })}><ExternalLink className="mr-1 h-3.5 w-3.5" />View</Button> },
  ];

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="purchases"
          icon={Wallet}
          title="Pay supplier"
          subtitle="Choose the supplier, then settle their outstanding bills."
          onCancel={() => { setOpen(false); resetForm(); }}
          onSave={save}
          saving={saving}
          saveDisabled={!canPost}
          saveLabel={saving ? "Posting…" : "Post payment"}
        >
          <SifoFormSection title="Payment details">
            <SifoField label="Supplier" required wide>
              {suppliers.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  No suppliers yet. Add one on the Suppliers page first.
                </div>
              ) : (
                <Select value={supplierId} onValueChange={v => { setSupplierId(v); setAlloc({}); }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </SifoField>
            <SifoField label="Payment date" required>
              <Input type="date" className="h-11" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </SifoField>
            <SifoField label="Method" required>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>
            {method === "bank" && (
              <SifoField label="Bank account" required wide>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose the account the money leaves" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}{b.account_number ? ` — ${b.account_number}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </SifoField>
            )}
            <SifoField label="Reference">
              <Input className="h-11" value={reference} onChange={e => setReference(e.target.value)} placeholder="Cheque / txn #" />
            </SifoField>
            <SifoField label="Notes">
              <Input className="h-11" value={notes} onChange={e => setNotes(e.target.value)} />
            </SifoField>
          </SifoFormSection>

          <SifoFormSection title="Outstanding bills" columns={1}>
            {!supplierId ? (
              <p className="text-sm text-muted-foreground">Choose a supplier to see their unpaid and part-paid bills.</p>
            ) : billsForSupplier.length === 0 ? (
              <p className="text-sm text-muted-foreground">This supplier has no outstanding bills.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Bill #</th>
                      <th className="px-3 py-2 text-left">Supplier inv #</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Due</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                      <th className="px-3 py-2 text-right">Pay now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {billsForSupplier.map(b => {
                      const over = toMinor(alloc[b.id]) > toMinor(b.balance_due);
                      return (
                        <tr key={b.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{b.bill_number ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{b.supplier_invoice_number ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{b.bill_date ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{b.due_date ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(b.total ?? 0)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(b.amount_paid ?? 0)}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtMoney(b.balance_due ?? 0)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number" step="0.01" min="0"
                                aria-label={`Amount to pay on bill ${b.bill_number ?? ""}`}
                                className={`h-9 w-28 text-right tabular-nums ${over ? "border-destructive" : ""}`}
                                value={alloc[b.id] ?? ""}
                                onChange={e => setAlloc(p => ({ ...p, [b.id]: e.target.value }))}
                              />
                              <Button type="button" size="sm" variant="ghost" className="h-9 px-2 text-xs"
                                onClick={() => setAlloc(p => ({ ...p, [b.id]: String(Number(b.balance_due ?? 0)) }))}>
                                Full
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Total being paid</span>
              <span className="text-lg font-bold tabular-nums">{fmtMoney(toMajor(allocated.totalMinor))}</span>
            </div>
            {allocated.errors.map(msg => <p key={msg} className="text-xs text-destructive">{msg}</p>)}
            {method === "bank" && !bankAccountId && <p className="text-xs text-destructive">Choose the bank account the payment leaves.</p>}
          </SifoFormSection>

          <SifoFormSection title="Posting" columns={1}>
            <PostingPreview lines={previewLines} title="Journal that will be posted" />
            <p className="text-xs text-muted-foreground">
              One payment record is created per bill so each settlement stays traceable to its own supplier invoice.
            </p>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  const outstandingTotal = openBills.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <SifoHubTabs hub="finance" active="/bill-payments" />
      <SifoModuleHeader
        module="purchases"
        icon={Wallet}
        title="Supplier Payments"
        description="Supplier ledger → cashbook → general ledger."
        breadcrumbs={[{ label: "Purchases", to: "/bills" }, { label: "Supplier Payments" }]}
        actions={<>
          <DateRangeFilter value={range} onChange={setRange} compact />
          <ExportMenu filename="supplier-payments" title="Supplier Payments" rows={filtered.map(p => ({
            Number: p.payment_number, Date: p.payment_date, Supplier: p.suppliers?.name ?? "",
            Bill: p.bills?.bill_number ?? "", Method: p.payment_method, Reference: p.reference ?? "", Amount: p.amount,
          }))} />
          <Button size="sm" variant="save" className="h-9" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Pay supplier</Button>
        </>}
      />

      {openBills.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
          <span><Badge variant="secondary" className="mr-2">{openBills.length}</Badge>bills still outstanding</span>
          <span className="font-semibold tabular-nums">{fmtMoney(outstandingTotal)}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Payment history</CardTitle>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search payment #, supplier, bill…" className="h-8 w-64" />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <DataTable
              tableId="supplier-payments"
              columns={columns}
              data={filtered}
              searchPlaceholder={null}
              empty="No supplier payments in this range."
              totals={rows => ({ amount: fmtMoney(rows.reduce((s, r) => s + Number(r.amount || 0), 0)) })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
