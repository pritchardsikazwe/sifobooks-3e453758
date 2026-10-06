import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { vatBillsQuery, vatInvoicesQuery, computeVatReturn, isCountable } from "@/lib/tax-reports";
import { applyVatAdjustments, buildVat3Rows, downloadTaxCsv, exportVat3Csv, filingDueDate, type TaxAdjustment } from "@/lib/tax-compliance";
import { monthRange, fmt, num } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/tax-compliance")({
  head: () => ({ meta: [{ title: "Tax Compliance Centre — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: TaxCompliancePage,
});

function TaxCompliancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<TaxAdjustment[]>([]);
  const [purchaseLine, setPurchaseLine] = useState({ bill_id: "", description: "", tax_category: "standard", vat_rate: "16", net_amount: "", vat_amount: "", business_use_percent: "100", import_vat: "0", evidence_type: "tax_invoice" });
  const [form, setForm] = useState({
    document_type: "credit_note",
    direction: "issued",
    reference: "",
    adjustment_date: new Date().toISOString().slice(0, 10),
    reason: "",
    subtotal: "",
    vat_amount: "",
    original_id: "",
  });

  const load = async () => {
    setLoading(true);
    const { from, to } = monthRange(month);
    const [{ data: inv }, { data: bl }, { data: adj }] = await Promise.all([
      vatInvoicesQuery(supabase, from, to),
      vatBillsQuery(supabase, from, to),
      supabase.from("tax_adjustments").select("*").gte("adjustment_date", from).lte("adjustment_date", to).order("adjustment_date", { ascending: false }),
    ]);
    setInvoices((inv ?? []).filter(isCountable));
    setBills((bl ?? []).filter(isCountable));
    setAdjustments((adj ?? []) as TaxAdjustment[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [month]);

  const totals = useMemo(() => {
    const { to } = monthRange(month);
    return computeVatReturn(invoices, bills, { returnEnd: to, returnStart: monthRange(month).from, adjustments });
  }, [invoices, bills, adjustments, month]);

  const adjustmentTotals = useMemo(
    () => applyVatAdjustments(adjustments, monthRange(month).from, monthRange(month).to),
    [adjustments, month],
  );

  const vat3 = useMemo(() => buildVat3Rows({
    salesStandardNet: totals.salesStandardNet,
    salesStandardVat: totals.salesStandardVat,
    salesZeroRatedNet: totals.salesZeroRatedNet,
    purchasesNet: totals.purchasesNet,
    purchasesVat: totals.purchasesVat,
  }), [totals]);

  const saveAdjustment = async () => {
    if (!form.reference || !form.reason || !form.subtotal || !form.vat_amount) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const payload: any = {
      user_id: user.user.id,
      document_type: form.document_type,
      direction: form.direction,
      reference: form.reference,
      adjustment_date: form.adjustment_date,
      reason: form.reason,
      subtotal: Number(form.subtotal) || 0,
      vat_amount: Number(form.vat_amount) || 0,
      total: (Number(form.subtotal) || 0) + (Number(form.vat_amount) || 0),
      status: "posted",
      original_invoice_id: form.direction === "issued" ? (form.original_id || null) : null,
      original_bill_id: form.direction === "received" ? (form.original_id || null) : null,
      zra_document_type: form.document_type,
      zra_original_reference: form.direction === "issued" ? (invoices.find(x => x.id === form.original_id)?.number ?? null) : (bills.find(x => x.id === form.original_id)?.bill_number ?? null),
      zra_state: form.direction === "issued" ? "READY_FOR_SMART_INVOICE" : "PORTAL_REVIEW",
    };
    const { data: created, error } = await supabase.from("tax_adjustments").insert(payload).select("id").single();
    if (error || !created) return;
    await supabase.from("tax_audit_events").insert({
      user_id: user.user.id,
      entity_type: "tax_adjustment",
      entity_id: created.id,
      action: "posted",
      details: { document_type: form.document_type, direction: form.direction, reference: form.reference },
    });
    setForm(f => ({ ...f, reference: "", reason: "", subtotal: "", vat_amount: "", original_id: "" }));
    await load();
  };

  const exportReturn = async () => {
    const csv = exportVat3Csv(vat3, month);
    downloadTaxCsv(`sifobooks-vat-3-${month}.csv`, csv);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { from, to } = monthRange(month);
      await supabase.from("tax_filing_records").upsert({
        user_id: user.user.id, filing_type: "VAT", period_start: from, period_end: to,
        due_date: filingDueDate("VAT", month), status: "exported",
        amount_due: Math.max(0, totals.netVat), amount_claimed: Math.max(0, -totals.netVat),
        reconciliation_difference: 0, exported_at: new Date().toISOString(),
      }, { onConflict: "user_id,filing_type,period_start,period_end" });
    }
  };

  const filingCards = ["VAT", "PAYE", "NAPSA", "NHIMA", "WHT", "TOT", "SDL"].map(kind => ({
    kind, due: filingDueDate(kind as any, month),
    amount: kind === "VAT" ? totals.netVat : null,
  }));

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Zambia Tax Control</div>
            <h1 className="mt-2 text-2xl font-bold">Tax Compliance Centre</h1>
            <p className="text-sm text-muted-foreground">VAT, input tax, credit/debit notes, reconciliation and filing preparation.</p>
          </div>
          <div className="flex gap-2">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => void exportReturn()}><Download className="mr-2 h-4 w-4" />Export VAT 3</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Output VAT" value={totals.salesStandardVat} />
          <Metric label="Input VAT" value={totals.purchasesVat} />
          <Metric label="Adjustments — Output" value={adjustmentTotals.outputVat} />
          <Metric label={totals.netVat >= 0 ? "VAT Payable" : "VAT Credit"} value={Math.abs(totals.netVat)} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Filing control</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filingCards.map(f => <div key={f.kind} className="rounded-lg border p-3">
              <div className="flex justify-between"><span className="font-semibold">{f.kind}</span><Badge variant="outline">Due {f.due}</Badge></div>
              <div className="mt-2 text-xs text-muted-foreground">{f.amount === null ? "Prepared from payroll / tax modules" : `VAT amount: ${fmt(Math.abs(f.amount))}`}</div>
            </div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Purchase VAT lines — mixed-rate control</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Supplier bill"><Select value={purchaseLine.bill_id} onValueChange={v => setPurchaseLine({...purchaseLine,bill_id:v})}><SelectTrigger><SelectValue placeholder="Select bill" /></SelectTrigger><SelectContent>{bills.slice(0,100).map(b => <SelectItem key={b.id} value={b.id}>{b.bill_number}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Tax category"><Select value={purchaseLine.tax_category} onValueChange={v => setPurchaseLine({...purchaseLine,tax_category:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="zero_rated">Zero-rated</SelectItem><SelectItem value="exempt">Exempt</SelectItem><SelectItem value="out_of_scope">Out of scope</SelectItem></SelectContent></Select></Field>
              <Field label="VAT rate %"><Input type="number" value={purchaseLine.vat_rate} onChange={e => setPurchaseLine({...purchaseLine,vat_rate:e.target.value})} /></Field>
              <Field label="Description"><Input value={purchaseLine.description} onChange={e => setPurchaseLine({...purchaseLine,description:e.target.value})} placeholder="Line / purchase category" /></Field>
              <Field label="Net amount"><Input type="number" value={purchaseLine.net_amount} onChange={e => setPurchaseLine({...purchaseLine,net_amount:e.target.value})} /></Field>
              <Field label="VAT amount"><Input type="number" value={purchaseLine.vat_amount} onChange={e => setPurchaseLine({...purchaseLine,vat_amount:e.target.value})} /></Field>
              <Field label="Business use %"><Input type="number" value={purchaseLine.business_use_percent} onChange={e => setPurchaseLine({...purchaseLine,business_use_percent:e.target.value})} /></Field>
              <Field label="Evidence"><Select value={purchaseLine.evidence_type} onValueChange={v => setPurchaseLine({...purchaseLine,evidence_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tax_invoice">Tax invoice</SelectItem><SelectItem value="import_ce20">Import CE20</SelectItem><SelectItem value="bank_statement">Bank statement</SelectItem><SelectItem value="credit_note">Credit note</SelectItem></SelectContent></Select></Field>
            </div>
            <Button onClick={async () => {
              const { data: user } = await supabase.auth.getUser();
              if (!user.user || !purchaseLine.bill_id || !purchaseLine.net_amount) return;
              const { error } = await supabase.from("bill_vat_lines").insert({
                user_id: user.user.id, bill_id: purchaseLine.bill_id, description: purchaseLine.description,
                tax_category: purchaseLine.tax_category, vat_rate: Number(purchaseLine.vat_rate) || 0,
                net_amount: Number(purchaseLine.net_amount) || 0, vat_amount: Number(purchaseLine.vat_amount) || 0,
                business_use_percent: Number(purchaseLine.business_use_percent) || 0, import_vat: Number(purchaseLine.import_vat) || 0,
                evidence_type: purchaseLine.evidence_type,
              });
              if (!error) { setPurchaseLine(p => ({...p,description:"",net_amount:"",vat_amount:""})); await load(); }
            }}>Add purchase VAT line</Button>
            <p className="text-xs text-muted-foreground">ZRA input VAT is restricted to business use, valid supporting evidence and the configured three-month claim window. citeturn2search0</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">VAT 3 preparation & reconciliation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {vat3.map(r => <div key={r.box} className="flex justify-between border-b py-2 text-sm"><span><b>{r.box}.</b> {r.description}</span><span className="font-mono">{fmt(r.amount)}</span></div>)}
              <div className="pt-2 text-xs text-muted-foreground">Sales source records: {invoices.length} · Purchase source records: {bills.length} · Tax adjustments: {adjustments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Add credit / debit note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type"><Select value={form.document_type} onValueChange={v => setForm({...form, document_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit_note">Credit note</SelectItem><SelectItem value="debit_note">Debit note</SelectItem></SelectContent></Select></Field>
                <Field label="Direction"><Select value={form.direction} onValueChange={v => setForm({...form, direction:v, original_id:""})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="issued">Issued to customer</SelectItem><SelectItem value="received">Received from supplier</SelectItem></SelectContent></Select></Field>
              </div>
              <Field label={form.direction === "issued" ? "Original invoice" : "Original supplier bill"}>
                <Select value={form.original_id} onValueChange={v => setForm({...form, original_id:v})}><SelectTrigger><SelectValue placeholder="Select original document" /></SelectTrigger><SelectContent>
                  {(form.direction === "issued" ? invoices : bills).slice(0,100).map(r => <SelectItem key={r.id} value={r.id}>{form.direction === "issued" ? r.number : r.bill_number}</SelectItem>)}
                </SelectContent></Select>
              </Field>
              <Field label="Reference"><Input value={form.reference} onChange={e => setForm({...form, reference:e.target.value})} placeholder="CN-0001 / DN-0001" /></Field>
              <Field label="Reason"><Input value={form.reason} onChange={e => setForm({...form, reason:e.target.value})} placeholder="Return, price adjustment, cancellation..." /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Net amount"><Input type="number" value={form.subtotal} onChange={e => setForm({...form, subtotal:e.target.value})} /></Field><Field label="VAT amount"><Input type="number" value={form.vat_amount} onChange={e => setForm({...form, vat_amount:e.target.value})} /></Field></div>
              <Button onClick={() => void saveAdjustment()}><Plus className="mr-2 h-4 w-4" />Post adjustment</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Tax adjustment audit register</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Direction</th><th className="p-2">Reference</th><th className="p-2">Reason</th><th className="p-2 text-right">VAT</th></tr></thead><tbody>
              {adjustments.map(a => <tr key={a.id} className="border-b"><td className="p-2">{a.adjustment_date}</td><td className="p-2">{a.document_type.replace("_"," ")}</td><td className="p-2">{a.direction}</td><td className="p-2 font-mono">{a.reference}</td><td className="p-2">{a.reason}</td><td className="p-2 text-right">{fmt(num(a.vat_amount) * (a.document_type === "credit_note" ? -1 : 1))}</td></tr>)}
              {!adjustments.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{loading ? "Loading…" : "No adjustments for this period."}</td></tr>}
            </tbody></table></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({label,value}:{label:string;value:number}) {
  return <Card><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold">{fmt(value)}</div></CardContent></Card>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">{label}</span>{children}</label>;
}
