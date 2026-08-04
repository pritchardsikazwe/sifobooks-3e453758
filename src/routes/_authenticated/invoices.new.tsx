import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Calendar as CalIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { postInvoiceLedger } from "@/lib/posting";
import { previewPdf, downloadPdf, type PdfDoc } from "@/lib/pdf";
import { Download } from "lucide-react";
import { AccountSelector } from "@/components/selectors/AccountSelector";
import { PostingPreview, isBalanced } from "@/components/PostingPreview";
import { salesInvoiceLines } from "@/lib/posting-lines";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({ meta: [{ title: "Invoice Generator — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: NewInvoicePage,
});

type Line = {
  stockItemId?: string | null;
  description: string;
  warehouseId?: string | null;
  qty: number;
  price: number;
  discount: number;
  discountType: "%" | "ZMW";
  taxCode: "A" | "B" | "C" | "D" | "E" | "X";
  vatRate: number;
};

type TaxScheme = "vat" | "vat_wht" | "turnover" | "rental_wht" | "tourism" | "exempt";
const TAX_RATES: Record<string, number> = { A: 16, B: 0, C: 0, D: 0, E: 0, X: 0 };

function NewInvoicePage() {
  const navigate = useNavigate();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  const [docType, setDocType] = useState("normal");
  const [layout, setLayout] = useState("modern");
  const [number, setNumber] = useState("INV1");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(in30);
  const [currency, setCurrency] = useState("ZMW");
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [buyerTpin, setBuyerTpin] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [taxScheme, setTaxScheme] = useState<TaxScheme>("vat");
  const [whtRate, setWhtRate] = useState(15);
  const [tourismRate, setTourismRate] = useState(5);
  const [turnoverRate, setTurnoverRate] = useState(4);

  const [customers, setCustomers] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  const [items, setItems] = useState<Line[]>([
    { description: "", qty: 1, price: 0, discount: 0, discountType: "%", taxCode: "A", vatRate: 16 },
  ]);

  // ---- Accounting effect (shared selectors + balanced posting preview) ----
  const { accounts, defaultFor } = useCoaAccounts();
  const [arAccountId, setArAccountId] = useState<string | null>(null);
  const [revenueAccountId, setRevenueAccountId] = useState<string | null>(null);
  const [vatAccountId, setVatAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!accounts.length) return;
    setArAccountId(p => p ?? defaultFor("1100")?.id ?? null);
    setRevenueAccountId(p => p ?? defaultFor("4000")?.id ?? null);
    setVatAccountId(p => p ?? defaultFor("2200")?.id ?? null);
  }, [accounts]);



  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: si }, { data: wh }, { data: co }, { count }] = await Promise.all([
        supabase.from("customers").select("id, name, tpin, payment_terms_days, address").eq("active", true).order("name"),
        supabase.from("stock_items").select("id, name, sku, vat_rate, sell_price"),
        supabase.from("warehouses").select("id, name"),
        supabase.from("companies").select("*").maybeSingle(),
        supabase.from("invoices").select("*", { count: "exact", head: true }),
      ]);
      setCustomers(cs ?? []); setStock(si ?? []); setWarehouses(wh ?? []); setCompany(co ?? null);
      if (co?.base_currency) setCurrency(co.base_currency);
      setNumber(`INV${((count ?? 0) + 1)}`);
    })();
  }, []);

  useEffect(() => {
    const c = customers.find(x => x.id === customerId);
    if (c) {
      if (c.tpin) setBuyerTpin(c.tpin);
      if (c.payment_terms_days) setDueDate(new Date(Date.now() + c.payment_terms_days * 864e5).toISOString().slice(0, 10));
    }
  }, [customerId, customers]);

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    for (const it of items) {
      const gross = it.qty * it.price;
      const disc = it.discountType === "%" ? gross * (it.discount / 100) : it.discount;
      const net = Math.max(gross - disc, 0);
      const rate = it.vatRate / 100;
      if (taxInclusive) {
        const base = net / (1 + rate);
        subtotal += base;
        tax += net - base;
      } else {
        subtotal += net;
        tax += net * rate;
      }
    }
    const total = subtotal + tax;
    const whtAmount = (taxScheme === "vat_wht" || taxScheme === "rental_wht") ? subtotal * (whtRate / 100) : 0;
    const tourismLevyAmount = taxScheme === "tourism" ? subtotal * (tourismRate / 100) : 0;
    const turnoverAmount = taxScheme === "turnover" ? subtotal * (turnoverRate / 100) : 0;
    const grossWithExtras = total + tourismLevyAmount + turnoverAmount;
    const payable = grossWithExtras - whtAmount;
    return { subtotal, tax, total: grossWithExtras, whtAmount, tourismLevyAmount, turnoverAmount, payable };
  }, [items, taxInclusive, taxScheme, whtRate, tourismRate, turnoverRate]);

  const previewLines = useMemo(() => salesInvoiceLines({
    subtotal: totals.subtotal, vat: totals.tax, total: totals.subtotal + totals.tax,
    receivable: accounts.find(a => a.id === arAccountId),
    revenue: accounts.find(a => a.id === revenueAccountId),
    vatOutput: accounts.find(a => a.id === vatAccountId),
    customerName: customers.find(c => c.id === customerId)?.name,
  }), [totals, accounts, arAccountId, revenueAccountId, vatAccountId, customers, customerId]);
  const previewBalanced = isBalanced(previewLines);

  const pickStock = (idx: number, stockId: string) => {
    const s = stock.find(x => x.id === stockId);
    if (!s) return;
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it, stockItemId: s.id, description: s.name,
      price: Number(s.sell_price), vatRate: Number(s.vat_rate ?? 16),
    } : it));
  };

  const updateRow = (idx: number, patch: Partial<Line>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const submit = async (targetStatus: "draft" | "sent") => {
    if (!customerId) return toast.error("Select a customer");
    const valid = items.filter(i => (i.description.trim() || i.stockItemId) && i.qty > 0 && i.price > 0);
    if (valid.length === 0) return toast.error("Add at least one line item with price");
    if (targetStatus === "sent" && !previewBalanced) {
      return toast.error("Posting blocked — debits and credits do not balance. Check the accounting effect panel.");
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }

    const { data: inv, error } = await supabase.from("invoices").insert({
      user_id: u.user.id, customer_id: customerId, number,
      issue_date: issueDate, due_date: dueDate, status: targetStatus, currency,
      subtotal: totals.subtotal, vat_amount: totals.tax, total: totals.total, notes,
      seller_tpin: company?.tpin ?? null, buyer_tpin: buyerTpin || null,
    }).select().single();
    if (error || !inv) { setSaving(false); return toast.error(error?.message ?? "Failed"); }

    const { error: ie } = await supabase.from("invoice_items").insert(valid.map(i => {
      const gross = i.qty * i.price;
      const disc = i.discountType === "%" ? gross * (i.discount / 100) : i.discount;
      const net = Math.max(gross - disc, 0);
      const line = taxInclusive ? net : net * (1 + i.vatRate / 100);
      return {
        user_id: u.user.id, invoice_id: inv.id, stock_item_id: i.stockItemId ?? null,
        description: i.description || stock.find(s => s.id === i.stockItemId)?.name || "",
        quantity: i.qty, unit_price: i.price, vat_rate: i.vatRate, line_total: line,
      };
    }));
    for (const i of valid) {
      if (i.stockItemId) {
        await supabase.from("stock_movements").insert({
          user_id: u.user.id, item_id: i.stockItemId, movement_type: "out",
          quantity: i.qty, reference: number, note: `Invoice ${number}`,
        });
      }
    }
    if (targetStatus === "sent") {
      const custName = customers.find(c => c.id === customerId)?.name;
      const res = await postInvoiceLedger({
        userId: u.user.id, invoiceId: inv.id, number,
        issueDate: issueDate, subtotal: totals.subtotal, vat: totals.tax, total: totals.total,
        customerName: custName,
      });
      if (!res.ok) toast.warning(`Invoice saved but ledger posting failed: ${res.error ?? "unknown"}`);
    }
    setSaving(false);
    if (ie) return toast.error(ie.message);
    toast.success(targetStatus === "draft" ? "Saved as draft" : `Invoice ${number} posted — journal entry created, stock deducted, customer balance updated`);
    navigate({ to: "/invoices" });
  };

  const buildPdfDoc = (): PdfDoc => {
    const customer = customers.find(c => c.id === customerId);
    return {
      kind: "Invoice", number, issueDate, dueDate, currency, taxInclusive,
      company, customer, buyerTpin,
      items: items.filter(i => (i.description.trim() || i.stockItemId) && i.qty > 0).map(i => {
        const gross = i.qty * i.price;
        const disc = i.discountType === "%" ? gross * (i.discount / 100) : i.discount;
        const net = Math.max(gross - disc, 0);
        const lineTotal = taxInclusive ? net : net * (1 + i.vatRate / 100);
        return {
          description: i.description || stock.find(s => s.id === i.stockItemId)?.name || "—",
          qty: i.qty, price: i.price, discount: i.discount, discountType: i.discountType,
          vatRate: i.vatRate, taxCode: i.taxCode, lineTotal,
        };
      }),
      subtotal: totals.subtotal, tax: totals.tax, total: totals.total, notes,
      taxScheme,
      whtRate: (taxScheme === "vat_wht" || taxScheme === "rental_wht") ? whtRate : undefined,
      whtAmount: totals.whtAmount || undefined,
      tourismLevyRate: taxScheme === "tourism" ? tourismRate : undefined,
      tourismLevyAmount: totals.tourismLevyAmount || undefined,
      turnoverRate: taxScheme === "turnover" ? turnoverRate : undefined,
      turnoverAmount: totals.turnoverAmount || undefined,
      payable: totals.payable,
    };
  };

  const ActionButtons = (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" onClick={() => submit("draft")} disabled={saving}>Save as Draft</Button>
      <Button variant="outline" onClick={() => previewPdf(buildPdfDoc())}>Preview Invoice</Button>
      <Button variant="outline" onClick={() => downloadPdf(buildPdfDoc())} className="gap-1"><Download className="h-4 w-4" /> PDF</Button>
      <Button onClick={() => submit("sent")} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 text-white">Post Invoice</Button>
    </div>
  );


  return (
    <div className="min-h-screen bg-slate-50 pb-28 lg:pb-0">
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.history.back()} className="gap-1"><ArrowLeft className="h-4 w-4" /> Go Back</Button>
        <div className="hidden lg:flex">{ActionButtons}</div>
        <div className="lg:hidden flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => previewPdf(buildPdfDoc())} className="gap-1"><Download className="h-4 w-4" /> Preview</Button>
        </div>
      </div>


      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-lg font-semibold">Invoice Generator</h1>
        </div>


        <div>
          <Label className="text-xs text-muted-foreground">Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="mt-1 max-w-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal Invoice</SelectItem>
              <SelectItem value="recurring">Recurring Invoice</SelectItem>
              <SelectItem value="credit">Credit Note</SelectItem>
              <SelectItem value="proforma">Proforma</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoice Information */}
        <Section title="INVOICE INFORMATION" action={<button className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add More Fields <Info className="h-3 w-3 opacity-60" /></button>}>
          <Field label="Invoice Number">
            <Input value={number} onChange={e => setNumber(e.target.value)} className="bg-slate-50" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Issued Date">
              <div className="relative">
                <CalIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="pl-9" />
              </div>
            </Field>
            <Field label="Due Date">
              <div className="relative">
                <CalIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="pl-9" />
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Invoice Layout">
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern Invoice</SelectItem>
                  <SelectItem value="classic">Classic Invoice</SelectItem>
                  <SelectItem value="minimal">Minimal Invoice</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Currency">
              <Input value={`Zambian Kwacha (${currency})`} readOnly className="bg-slate-50" />
              <div className="text-right"><button className="text-xs text-emerald-700 font-medium underline mt-1">Set Exchange Rate</button></div>
            </Field>
          </div>
        </Section>

        {/* Customer Information */}
        <Section title="CUSTOMER INFORMATION">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Customer" action={
              <QuickAddCustomer
                trigger={<button type="button" className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1"><Plus className="h-3 w-3" /> New</button>}
                onCreated={c => { setCustomers(p => [...p, c]); setCustomerId(c.id); }}
              />
            }>
              {customers.length === 0 ? (
                <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">No customers. Click <b>New</b> to add one.</div>
              ) : (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>
            <Field label="VAT Reference">
              <Input value={buyerTpin} onChange={e => setBuyerTpin(e.target.value)} placeholder="Enter VAT" />
            </Field>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground">CUSTOMER ADDRESS</span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Show <Switch checked={showAddress} onCheckedChange={setShowAddress} /></label>
          </div>
        </Section>

        {/* Recurring toggle strip */}
        <div className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">Make this a recurring invoice?</span>
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-lg border">
          <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2">
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">INVOICE ITEMS</span>
            <label className="flex items-center gap-2 text-xs">
              <span className={taxInclusive ? "text-emerald-700 font-medium" : "text-muted-foreground"}>TAX INCLUSIVE</span>
              <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
              <span className={!taxInclusive ? "text-emerald-700 font-medium" : "text-muted-foreground"}>TAX EXCLUSIVE</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium p-2 min-w-[160px]">Item/Service</th>
                  <th className="text-left font-medium p-2 min-w-[160px]">Description</th>
                  <th className="text-left font-medium p-2 min-w-[130px]">Warehouse</th>
                  <th className="text-left font-medium p-2 w-20">Qty</th>
                  <th className="text-left font-medium p-2 w-28">Unit Price</th>
                  <th className="text-left font-medium p-2 w-32">Discount</th>
                  <th className="text-left font-medium p-2 w-24">Tax Code</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="p-2">
                      <Select value={it.stockItemId ?? ""} onValueChange={v => pickStock(idx, v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Item/S..." /></SelectTrigger>
                        <SelectContent>{stock.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.sku ? ` (${s.sku})` : ""}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input value={it.description} onChange={e => updateRow(idx, { description: e.target.value })} className="h-9" /></td>
                    <td className="p-2">
                      <Select value={it.warehouseId ?? ""} onValueChange={v => updateRow(idx, { warehouseId: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select iter..." /></SelectTrigger>
                        <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input type="number" value={it.qty} onChange={e => updateRow(idx, { qty: Number(e.target.value) })} className="h-9" /></td>
                    <td className="p-2"><Input type="number" step="0.01" value={it.price || ""} onChange={e => updateRow(idx, { price: Number(e.target.value) })} className={`h-9 ${!it.price ? "border-red-300" : ""}`} /></td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Input type="number" value={it.discount} onChange={e => updateRow(idx, { discount: Number(e.target.value) })} className="h-9" />
                        <Select value={it.discountType} onValueChange={(v: any) => updateRow(idx, { discountType: v })}>
                          <SelectTrigger className="h-9 w-16 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="%">%</SelectItem><SelectItem value="ZMW">ZMW</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="p-2">
                      <Select value={it.taxCode} onValueChange={(v: any) => updateRow(idx, { taxCode: v, vatRate: TAX_RATES[v] })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A (16%)</SelectItem>
                          <SelectItem value="B">B (0%)</SelectItem>
                          <SelectItem value="C">C (Exempt)</SelectItem>
                          <SelectItem value="D">D (Zero-rated Dom.)</SelectItem>
                          <SelectItem value="E">E (Export 0%)</SelectItem>
                          <SelectItem value="X">X (Out of scope)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t">
            <button onClick={() => setItems(p => [...p, { description: "", qty: 1, price: 0, discount: 0, discountType: "%", taxCode: "A", vatRate: 16 }])}
              className="text-sm text-emerald-700 font-medium inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Bank Details */}
        <Section title="BANK DETAILS" action={<button className="text-xs text-emerald-700 font-medium">Edit</button>}>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Account Name: {company?.name ?? "—"}</div>
            <div>Account Number: {company?.bank_account_number ?? "—"}</div>
            <div>Bank Name: {company?.bank_name ?? "—"}</div>
          </div>
        </Section>

        {/* Notes */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">NOTES</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Enter payment memo or additional notes..."
            className="w-full min-h-20 rounded-md border bg-background p-2 text-sm"
          />
        </div>

        {/* Zambian Tax Scheme */}
        <Section title="ZAMBIAN TAX SCHEME">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Scheme">
              <Select value={taxScheme} onValueChange={(v: TaxScheme) => setTaxScheme(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT (Standard 16%)</SelectItem>
                  <SelectItem value="vat_wht">VAT + Withholding Tax</SelectItem>
                  <SelectItem value="turnover">Turnover Tax (4%)</SelectItem>
                  <SelectItem value="rental_wht">Rental Income WHT (4%)</SelectItem>
                  <SelectItem value="tourism">Tourism Levy (5%)</SelectItem>
                  <SelectItem value="exempt">Exempt / Out of Scope</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(taxScheme === "vat_wht" || taxScheme === "rental_wht") && (
              <Field label={`WHT Rate (${taxScheme === "rental_wht" ? "typically 4%" : "typically 15%"})`}>
                <Input type="number" step="0.5" value={whtRate} onChange={e => setWhtRate(Number(e.target.value))} />
              </Field>
            )}
            {taxScheme === "tourism" && (
              <Field label="Tourism Levy Rate %">
                <Input type="number" step="0.5" value={tourismRate} onChange={e => setTourismRate(Number(e.target.value))} />
              </Field>
            )}
            {taxScheme === "turnover" && (
              <Field label="Turnover Tax Rate %">
                <Input type="number" step="0.5" value={turnoverRate} onChange={e => setTurnoverRate(Number(e.target.value))} />
              </Field>
            )}
          </div>
        </Section>

        {/* Summary */}
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs font-semibold text-muted-foreground tracking-wide mb-3">SUMMARY</div>
          <SummaryRow label="Subtotal (excl. VAT)" value={fmtMoney(totals.subtotal, currency)} />
          <SummaryRow label={`VAT ${taxInclusive ? "(inclusive)" : "(exclusive)"}`} value={fmtMoney(totals.tax, currency)} />
          {totals.tourismLevyAmount > 0 && <SummaryRow label={`Tourism Levy ${tourismRate}%`} value={fmtMoney(totals.tourismLevyAmount, currency)} />}
          {totals.turnoverAmount > 0 && <SummaryRow label={`Turnover Tax ${turnoverRate}%`} value={fmtMoney(totals.turnoverAmount, currency)} />}
          <SummaryRow label="Total" value={fmtMoney(totals.total, currency)} strong />
          {totals.whtAmount > 0 && (
            <>
              <SummaryRow label={`Less: WHT ${whtRate}%`} value={`-${fmtMoney(totals.whtAmount, currency)}`} />
              <SummaryRow label="Payable" value={fmtMoney(totals.payable, currency)} strong />
            </>
          )}
        </div>

        <div className="hidden lg:flex justify-end pt-2">{ActionButtons}</div>
      </div>

      {/* Sticky action bar on mobile & tablet — guarantees Post Invoice is always reachable */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg px-3 py-2 flex items-center gap-2">
        <Button variant="outline" onClick={() => submit("draft")} disabled={saving} className="flex-1">Save Draft</Button>
        <Button onClick={() => submit("sent")} disabled={saving} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white">
          {saving ? "Posting…" : "Post Invoice"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground tracking-wide">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-2 border-b last:border-0 text-sm ${strong ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span className={muted ? "" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
