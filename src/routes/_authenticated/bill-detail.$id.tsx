import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileBox, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { SifoDocumentLayout, BackToDocumentList, type SifoDocumentLine } from "@/components/sifo/SifoDocumentLayout";
import { DocumentImpact } from "@/components/accounting/LedgerImpactSheet";
import { toast } from "sonner";
import { SifoCompletionPanel } from "@/components/sifo/SifoNextActionPanel";
import { DOCUMENT_GUIDANCE } from "@/lib/document-guidance";

export const Route = createFileRoute("/_authenticated/bill-detail/$id")({
  head: () => ({ meta: [{ title: "Supplier Bill Detail — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BillDetailPage,
});

function BillDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data, error }, { data: pays }] = await Promise.all([
        supabase.from("bills").select("*").eq("id", id).maybeSingle(),
        supabase.from("bill_payments").select("id, payment_number, payment_date, payment_method, reference, amount").eq("bill_id", id).order("payment_date", { ascending: false }),
      ]);
      if (error) toast.error(error.message);
      setBill(data); setPayments(pays ?? []); setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!bill) return <div className="p-8 space-y-4"><Button variant="ghost" onClick={() => navigate({ to: "/bills" })}><ArrowLeft className="mr-2 h-4 w-4" />Back to bills</Button><p>Supplier bill not found.</p></div>;

  const paid = Number(bill.amount_paid ?? 0);
  const balance = Number(bill.balance_due ?? Math.max(Number(bill.total ?? 0) - paid, 0));
  const line: SifoDocumentLine = { id: bill.id, cells: [<span className="font-medium">Supplier bill {bill.bill_number}</span>, <span>{fmtMoney(bill.subtotal ?? 0, bill.currency)}</span>, <span>{fmtMoney(bill.tax_amount ?? 0, bill.currency)}</span>, <span className="font-semibold">{fmtMoney(bill.total ?? 0, bill.currency)}</span>] };

  return <SifoDocumentLayout
    title="Supplier Bill"
    number={bill.bill_number}
    status={String(bill.status ?? "draft")}
    description="Supplier liability, settlement and accounting transaction view."
    back={<BackToDocumentList onClick={() => navigate({ to: "/bills" })} label="Supplier Bills" />}
    actions={<Button asChild size="sm" variant="outline"><a href="/bills"><ArrowLeft className="mr-1.5 h-4 w-4" />Bill list</a></Button>}
    party={<div><div className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</div><div className="font-semibold">{bill.supplier_name ?? bill.vendor_name ?? "—"}</div><div className="text-sm text-muted-foreground">Supplier invoice: {bill.supplier_invoice_number ?? "—"}</div></div>}
    metadata={<div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm"><div><span className="text-muted-foreground">Bill date:</span> {bill.bill_date}</div><div><span className="text-muted-foreground">Due:</span> {bill.due_date ?? "—"}</div><div><span className="text-muted-foreground">Currency:</span> {bill.currency ?? "ZMW"}</div><div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className="capitalize">{bill.status ?? "draft"}</Badge></div></div>}
    lines={[line]}
    lineHeaders={["Transaction", "Subtotal", "VAT", "Total"]}
    totals={<div className="space-y-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(bill.subtotal ?? 0, bill.currency)}</span></div><div className="flex justify-between"><span>VAT / Tax</span><span>{fmtMoney(bill.tax_amount ?? 0, bill.currency)}</span></div><div className="border-t pt-3 flex justify-between text-base font-bold"><span>Total</span><span>{fmtMoney(bill.total ?? 0, bill.currency)}</span></div><div className="flex justify-between text-emerald-700"><span>Paid</span><span>{fmtMoney(paid, bill.currency)}</span></div><div className={`flex justify-between font-semibold ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}><span>Balance payable</span><span>{fmtMoney(balance, bill.currency)}</span></div></div>}
    impact={<div className="space-y-3"><SifoCompletionPanel
      title={`Bill ${bill.bill_number ?? ""} ${balance > 0 ? "is posted and unpaid" : "is settled"}`.trim()}
      statusLabel={String(bill.status ?? "posted")}
      lifecycle={DOCUMENT_GUIDANCE.bill.lifecycle}
      currentStage={balance > 0 ? (paid > 0 ? 2 : 1) : 3}
      impact={DOCUMENT_GUIDANCE.bill.impact({
        amount: fmtMoney(bill.total ?? 0, bill.currency),
        net: fmtMoney(bill.subtotal ?? 0, bill.currency),
        tax: Number(bill.tax_amount ?? 0) > 0 ? fmtMoney(bill.tax_amount ?? 0, bill.currency) : undefined,
        party: bill.supplier_name ?? bill.vendor_name ?? "the supplier",
      })}
      steps={DOCUMENT_GUIDANCE.bill.steps({ id: bill.id, reference: bill.bill_number })}
    /><DocumentImpact kind="bill" reference={bill.bill_number ? `BILL:${bill.bill_number}` : null} /><div className="rounded-md border p-3 text-sm"><div className="font-semibold">Accounting treatment</div><div className="mt-1 text-muted-foreground">Expense / purchase and recoverable VAT are debited; supplier payable is credited. Supplier payments reduce the payable.</div></div></div>}
    footer={<div className="space-y-5"><div><div className="text-sm font-semibold mb-2">Supplier payment allocation</div>{payments.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Payment #</th><th className="py-2">Date</th><th className="py-2">Method</th><th className="py-2">Reference</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{payments.map(p => <tr key={p.id} className="border-b"><td className="py-2 font-mono text-xs">{p.payment_number ?? "—"}</td><td className="py-2">{p.payment_date ?? "—"}</td><td className="py-2 capitalize">{String(p.payment_method ?? "—").replace(/_/g, " ")}</td><td className="py-2">{p.reference ?? "—"}</td><td className="py-2 text-right font-medium">{fmtMoney(p.amount ?? 0, bill.currency)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No supplier payments allocated to this bill.</p>}</div><div className="grid gap-2 sm:grid-cols-3 text-sm"><div><span className="text-muted-foreground">Created:</span> {bill.created_at ? new Date(bill.created_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">Updated:</span> {bill.updated_at ? new Date(bill.updated_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">Supplier invoice:</span> {bill.supplier_invoice_number ?? "—"}</div></div></div>}
  />;
}
