import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, CreditCard, AlertTriangle, RotateCcw, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printHtmlDocument } from "@/services/printDocument";
import { fmtMoney } from "@/lib/format";
import { ShareDoc } from "@/components/ShareDoc";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { reverseJournalEntry } from "@/lib/reversal";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { PostingPreview, isBalanced } from "@/components/PostingPreview";
import { receiptLines } from "@/lib/posting-lines";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

export const Route = createFileRoute("/_authenticated/receipts")({
  head: () => ({ meta: [{ title: "Receipts — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ReceiptsPage,
});

const METHODS = ["cash", "bank_transfer", "mobile_money", "card", "cheque"] as const;
const TYPES = [
  { value: "customer",   label: "Customer receipt" },
  { value: "cash",       label: "Cash sale / walk-in" },
  { value: "other",      label: "Other income" },
  { value: "loan",       label: "Loan received" },
  { value: "capital",    label: "Capital introduced" },
  { value: "deposit",    label: "Bank deposit" },
  { value: "mobile",     label: "Mobile money in" },
  { value: "manual",     label: "Manual entry" },
];

function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"posted"|"reversed"|"all">("posted");

  const today = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [q, setQ] = useState("");

  // Form
  const [receiptType, setReceiptType] = useState<string>("customer");
  const [customerId, setCustomerId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [receiptDate, setReceiptDate] = useState(today);
  const [method, setMethod] = useState<string>("cash");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [voucherNo, setVoucherNo] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Shared selectors + balanced posting preview
  const { accounts, defaultFor } = useCoaAccounts();
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  useEffect(() => {
    if (!accounts.length) return;
    setDebitAccountId(p => p ?? defaultFor("1000")?.id ?? null);
    setCreditAccountId(p => p ?? defaultFor(receiptType === "customer" ? "1100" : "4000")?.id ?? null);
  }, [accounts, receiptType]);

  const previewLines = useMemo(() => receiptLines({
    amount,
    bank: accounts.find(a => a.id === debitAccountId),
    credit: accounts.find(a => a.id === creditAccountId),
    isCustomerReceipt: receiptType === "customer",
    payer: receiptType === "customer" ? customers.find(c => c.id === customerId)?.name : payerName,
    invoiceNumber: openInvoices.find(i => i.id === invoiceId)?.number,
  }), [amount, accounts, debitAccountId, creditAccountId, receiptType, customers, customerId, payerName, openInvoices, invoiceId]);
  const previewBalanced = isBalanced(previewLines);

  const load = async () => {
    setLoading(true);
    const [{ data: rs }, { data: cs }, { data: bs }, { data: invs }] = await Promise.all([
      supabase.from("receipts").select("*, customers(name), invoices(number)").order("receipt_date", { ascending: false }),
      supabase.from("customers").select("id, name").eq("active", true).order("name"),
      supabase.from("bank_accounts").select("id, name, account_number, currency, cashbook_type").eq("is_active", true).order("name"),
      supabase.from("invoices").select("id, number, customer_id, total, balance_due, due_date, status, currency").gt("balance_due", 0).order("issue_date", { ascending: false }),
    ]);
    setReceipts(rs ?? []); setCustomers(cs ?? []); setBanks(bs ?? []); setOpenInvoices(invs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return receipts.filter(r => {
      if (!inRange(r.receipt_date, range)) return false;
      const status = (r as any).status ?? "posted";
      if (tab === "posted"   && status !== "posted")   return false;
      if (tab === "reversed" && status !== "reversed") return false;
      if (!s) return true;
      return (r.number ?? "").toLowerCase().includes(s)
        || (r.customers?.name ?? "").toLowerCase().includes(s)
        || (r.payer_name ?? "").toLowerCase().includes(s)
        || (r.reference ?? "").toLowerCase().includes(s)
        || (r.voucher_no ?? "").toLowerCase().includes(s);
    });
  }, [receipts, range, q, tab]);

  const invoicesForCustomer = useMemo(() => customerId ? openInvoices.filter(i => i.customer_id === customerId) : [], [customerId, openInvoices]);
  const overdue = openInvoices.filter(i => i.due_date && i.due_date < today);
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  const totals = useMemo(() => {
    const rec = filtered.filter(r => ((r as any).status ?? "posted") === "posted");
    return {
      count: rec.length,
      amount: rec.reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [filtered]);

  useEffect(() => {
    if (invoiceId) {
      const inv = openInvoices.find(i => i.id === invoiceId);
      if (inv) setAmount(Number(inv.balance_due));
    }
  }, [invoiceId, openInvoices]);

  useEffect(() => {
    // Default method based on type
    if (receiptType === "mobile") setMethod("mobile_money");
    else if (receiptType === "deposit") setMethod("bank_transfer");
    else if (receiptType === "cash") setMethod("cash");
  }, [receiptType]);

  const resetForm = () => {
    setReceiptType("customer");
    setCustomerId(""); setPayerName(""); setInvoiceId("");
    setAmount(0); setReference(""); setNotes(""); setVoucherNo("");
    setBankAccountId(""); setMethod("cash");
  };

  const save = async () => {
    const needsCustomer = receiptType === "customer";
    if (needsCustomer && !customerId) return toast.error("Select a customer");
    if (!needsCustomer && !payerName.trim()) return toast.error("Enter payer name");
    if (amount <= 0) return toast.error("Amount must be positive");
    if (!previewBalanced) return toast.error("Posting blocked — debits and credits must balance. Check the accounting effect panel.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const number = `RCT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const payload = {
      user_id: u.user.id,
      customer_id: needsCustomer ? customerId : null,
      invoice_id: invoiceId || null,
      number, receipt_date: receiptDate, amount, method,
      reference: reference || null, notes: notes || null,
      receipt_type: receiptType,
      payer_name: needsCustomer ? null : payerName,
      voucher_no: voucherNo || null,
      bank_account_id: bankAccountId || null,
      status: "posted",
    };
    const { offlineInsert } = await import("@/lib/offline-queue");
    const { error, queued } = await offlineInsert("receipts", payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(
      queued
        ? `Receipt ${number} saved offline — will sync when back online`
        : `Receipt ${number} captured and posted`,
    );
    setOpen(false);
    resetForm();
    load();
  };

  const reverseReceipt = async (r: any) => {
    const reason = window.prompt(`Reverse receipt ${r.number}? Enter reason:`);
    if (!reason?.trim()) return;
    try {
      // Find the JE created by trg_post_receipt (reference = RCT:<number>)
      const { data: je } = await supabase.from("journal_entries")
        .select("id").eq("user_id", r.user_id).eq("reference", `RCT:${r.number}`).maybeSingle();
      if (je?.id) await reverseJournalEntry(je.id, reason);
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("receipts").update({
        status: "reversed",
        reversed_at: new Date().toISOString(),
        reversed_by: u.user?.id,
        reversal_reason: reason.trim(),
      } as any).eq("id", r.id);
      toast.success("Receipt reversed");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Reversal failed");
    }
  };

  const printReceipt = (r: any) => {
    const html = `<!DOCTYPE html><html><head><title>${r.number}</title>
      <style>body{font-family:system-ui;padding:32px;color:#0f172a;max-width:640px;margin:auto}
      h1{margin:0;font-size:22px}h2{font-size:14px;color:#475569;margin:4px 0 24px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:8px 4px;border-bottom:1px solid #e2e8f0;font-size:14px}
      .amt{font-size:28px;font-weight:700;color:#059669;margin-top:24px}
      .foot{margin-top:32px;color:#64748b;font-size:12px}</style></head><body>
      <h1>OFFICIAL RECEIPT</h1><h2>${r.number}</h2>
      <table>
        <tr><td><b>Date</b></td><td>${r.receipt_date}</td></tr>
        <tr><td><b>Received from</b></td><td>${r.customers?.name ?? r.payer_name ?? "—"}</td></tr>
        <tr><td><b>Method</b></td><td>${(r.method ?? "").replace("_"," ")}</td></tr>
        ${r.reference ? `<tr><td><b>Reference</b></td><td>${r.reference}</td></tr>` : ""}
        ${r.voucher_no ? `<tr><td><b>Voucher #</b></td><td>${r.voucher_no}</td></tr>` : ""}
        ${r.invoices?.number ? `<tr><td><b>Applied to invoice</b></td><td>${r.invoices.number}</td></tr>` : ""}
        ${r.notes ? `<tr><td><b>Notes</b></td><td>${r.notes}</td></tr>` : ""}
      </table>
      <div class="amt">${fmtMoney(r.amount, r.currency)}</div>
      <div class="foot">Generated by SifoBooks · ${new Date().toLocaleString()}</div>
      </body></html>`;
    void printHtmlDocument(`Official Receipt ${r.number}`, html, `receipt-${r.number}.pdf`);
  };

  const receiptColumns: DTColumn<any>[] = [
    { key: "number", header: "#", cell: r => <span className="font-mono text-xs">{r.number}</span> },
    { key: "receipt_date", header: "Date", cell: r => <span className="text-xs">{r.receipt_date}</span> },
    { key: "receipt_type", header: "Type", cell: r => <span className="text-xs capitalize">{(r.receipt_type ?? "customer").replace("_", " ")}</span> },
    { key: "payer", header: "Payer", accessor: r => r.customers?.name ?? r.payer_name ?? "", cell: r => r.customers?.name ?? r.payer_name ?? "—" },
    { key: "invoice", header: "Invoice", accessor: r => r.invoices?.number ?? "", cell: r => <span className="font-mono text-xs">{r.invoices?.number ?? <span className="text-muted-foreground">—</span>}</span> },
    { key: "voucher_no", header: "Voucher", cell: r => <span className="font-mono text-xs">{r.voucher_no ?? ""}</span> },
    { key: "method", header: "Method", cell: r => <span className="text-xs capitalize">{(r.method ?? "").replace("_", " ")}</span> },
    { key: "status", header: "Status", cell: r => badgeFor((r as any).status ?? "posted") },
    { key: "amount", header: "Amount", align: "right", cell: r => {
        const status = (r as any).status ?? "posted";
        return <span className={`font-medium ${status === "reversed" ? "line-through" : "text-emerald-700"}`}>{fmtMoney(r.amount, r.currency)}</span>;
      } },
    { key: "actions", header: "", sortable: false, cell: r => {
        const status = (r as any).status ?? "posted";
        return (
          <div className="inline-flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => printReceipt(r)} title="Print"><Printer className="h-4 w-4" /></Button>
            <ShareDoc kind="receipt" id={r.id} docNumber={r.number} />
            {status === "posted" && (
              <Button size="icon" variant="ghost" onClick={() => reverseReceipt(r)} title="Reverse"><RotateCcw className="h-4 w-4 text-red-600" /></Button>
            )}
          </div>
        );
      } },
  ];

  const badgeFor = (s: string) => {
    if (s === "reversed") return <Badge variant="destructive" className="text-[10px]">Reversed</Badge>;
    if (s === "draft")    return <Badge variant="outline" className="text-[10px]">Draft</Badge>;
    return <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Posted</Badge>;
  };

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="sales"
          icon={CreditCard}
          title="Receive payment"
          subtitle="Cashbook → Customer ledger → General ledger → Reports."
          onCancel={() => { setOpen(false); resetForm(); }}
          onSave={save}
          saving={saving}
          saveDisabled={!previewBalanced}
          saveLabel={saving ? "Posting…" : "Post receipt"}
        >
          <SifoFormSection title="Payment details">
            <SifoField label="Receipt type" required>
              <Select value={receiptType} onValueChange={setReceiptType}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>

            {receiptType === "customer" ? (
              <>
                <SifoField label="Customer" required wide>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <QuickAddCustomer onCreated={(c) => { setCustomers(prev => [...prev, c]); setCustomerId(c.id); }} />
                  </div>
                  {customers.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground text-center">
                      No customers yet. Click <span className="font-semibold text-foreground">New customer</span> above.
                    </div>
                  ) : (
                    <Select value={customerId} onValueChange={v => { setCustomerId(v); setInvoiceId(""); }}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Choose customer" /></SelectTrigger>
                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </SifoField>
                <SifoField label="Apply to invoice (optional)" wide>
                  <Select value={invoiceId || "none"} onValueChange={v => setInvoiceId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Unallocated" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unallocated / on account</SelectItem>
                      {invoicesForCustomer.map(i => <SelectItem key={i.id} value={i.id}>{i.number} — bal {fmtMoney(i.balance_due, i.currency)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SifoField>
              </>
            ) : (
              <SifoField label="Payer / source" required wide>
                <Input className="h-11" value={payerName} onChange={e => setPayerName(e.target.value)} placeholder="Name of payer, lender, or source" />
              </SifoField>
            )}

            <SifoField label="Date" required>
              <Input type="date" className="h-11" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </SifoField>
            <SifoField label="Amount" required>
              <Input type="number" step="0.01" className="h-11" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </SifoField>
            <SifoField label="Method">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Bank / cashbook">
              <Select value={bankAccountId || "none"} onValueChange={v => setBankAccountId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Default cash" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default cash (1000)</SelectItem>
                  {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}{b.account_number ? ` — ${b.account_number}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Voucher #">
              <Input className="h-11" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} placeholder="Optional" />
            </SifoField>
            <SifoField label="Reference">
              <Input className="h-11" value={reference} onChange={e => setReference(e.target.value)} placeholder="Txn #, cheque #…" />
            </SifoField>
            <SifoField label="Notes" wide>
              <Input className="h-11" value={notes} onChange={e => setNotes(e.target.value)} />
            </SifoField>
          </SifoFormSection>

          <SifoFormSection title="Ledger accounts">
            <AccountSelector
              label="Debit — cash / bank" required recentKey="rct-bank"
              help="Account that receives the money."
              accounts={accounts} types={["asset"]} cashBankOnly value={debitAccountId} onChange={setDebitAccountId}
            />
            <AccountSelector
              label={receiptType === "customer" ? "Credit — receivable" : "Credit — income / source"}
              required recentKey="rct-credit"
              help={receiptType === "customer"
                ? "Customer ledger account cleared by this payment."
                : "Income, loan or capital account credited."}
              accounts={accounts} value={creditAccountId} onChange={setCreditAccountId}
            />
          </SifoFormSection>

          <SifoFormSection title="Posting" columns={1}>
            <PostingPreview lines={previewLines} title="Journal that will be posted" />
            {!previewBalanced && (
              <p className="text-xs text-destructive">Enter an amount and pick both accounts before posting.</p>
            )}
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <SifoModuleHeader
        module="sales"
        icon={CreditCard}
        title="Receipts"
        description="Cashbook → Customer ledger → General ledger → Reports."
        breadcrumbs={[{ label: "Sales", to: "/invoices" }, { label: "Receipts" }]}
        actions={<>
          <DateRangeFilter value={range} onChange={setRange} compact />
          <ExportMenu filename="receipts" title="Receipts" rows={filtered.map(r => ({
            Number: r.number, Date: r.receipt_date, Type: r.receipt_type ?? "customer",
            Payer: r.customers?.name ?? r.payer_name ?? "",
            Invoice: r.invoices?.number ?? "", Method: r.method,
            Voucher: r.voucher_no ?? "", Reference: r.reference ?? "",
            Amount: r.amount, Status: r.status ?? "posted",
          }))} />
          <Button onClick={() => setOpen(true)} size="sm" variant="save" className="h-9"><Plus className="h-4 w-4 mr-1.5" /> Receive payment</Button>
        </>}
      />



      {overdue.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <span><strong>{overdue.length}</strong> overdue invoice{overdue.length === 1 ? "" : "s"} totalling <strong>{fmtMoney(overdueTotal)}</strong> — chase payment.</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">History</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search receipt #, payer, ref…" className="h-8 w-56" />
            <div className="flex rounded-md border p-0.5 text-xs">
              {(["posted","reversed","all"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded capitalize ${tab===t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {totals.count} posted · <b className="text-emerald-700">{fmtMoney(totals.amount)}</b>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            tableId="receipts-history"
            columns={receiptColumns}
            data={filtered}
            loading={loading}
            searchPlaceholder={null}
            empty="No receipts in this range."
            totals={rows => ({ amount: fmtMoney(rows.reduce((s, r) => s + Number(r.amount || 0), 0)) })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
