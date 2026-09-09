import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { SifoDocumentLayout, BackToDocumentList, type SifoDocumentLine } from "@/components/sifo/SifoDocumentLayout";
import { DocumentImpact } from "@/components/accounting/LedgerImpactSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bill-payment-detail/$id")({
  head: () => ({ meta: [{ title: "Supplier Payment Detail — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BillPaymentDetailPage,
});

function BillPaymentDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("bill_payments").select("*").eq("id", id).maybeSingle();
      if (error) toast.error(error.message);
      setPayment(data);
      if (data) {
        const row = data as Record<string, any>;
        const candidates = ["bill_id", "invoice_id"].filter(k => row[k]);
        if (candidates.length) {
          const key = candidates[0];
          const { data: linked } = await supabase.from("bills").select("id,bill_number,supplier_invoice_number,bill_date,due_date,total,amount_paid,balance_due,status").eq("id", row[key!]);
          setBills(linked ?? []);
        } else {
          const { data: linked } = await supabase.from("bills").select("id,bill_number,supplier_invoice_number,bill_date,due_date,total,amount_paid,balance_due,status").eq("bill_number", row.reference ?? "");
          setBills(linked ?? []);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!payment) return <div className="p-8 space-y-4"><Button variant="ghost" onClick={() => navigate({ to: "/bill-payments" })}><ArrowLeft className="mr-2 h-4 w-4" />Back to supplier payments</Button><p>Supplier payment not found.</p></div>;

  const lineRows: SifoDocumentLine[] = bills.map(b => ({ id: b.id, cells: [<span className="font-mono text-xs">{b.bill_number ?? "—"}</span>, <span>{b.supplier_invoice_number ?? "—"}</span>, <span>{b.bill_date ?? "—"}</span>, <span>{fmtMoney(b.total ?? 0)}</span>, <span>{fmtMoney(b.balance_due ?? 0)}</span>] }));
  const amount = Number(payment.amount ?? 0);

  return <SifoDocumentLayout
    title="Supplier Payment"
    number={payment.payment_number}
    status={payment.status ?? "Posted"}
    description="Supplier settlement with allocation, cash/bank account and accounting impact."
    back={<BackToDocumentList onClick={() => navigate({ to: "/bill-payments" })} label="Supplier Payments" />}
    actions={<Button size="sm" variant="outline" onClick={() => navigate({ to: "/bill-payments" })}><ArrowLeft className="mr-1.5 h-4 w-4" />Payment list</Button>}
    party={<div><div className="text-xs uppercase tracking-wide text-muted-foreground">Supplier settlement</div><div className="font-semibold">{bills.length ? `Supplier bill ${bills[0].bill_number}` : "Supplier payment"}</div><div className="text-sm text-muted-foreground">Reference: {payment.reference ?? "—"}</div></div>}
    metadata={<div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm"><div><span className="text-muted-foreground">Payment date:</span> {payment.payment_date ?? "—"}</div><div><span className="text-muted-foreground">Method:</span> <span className="capitalize">{String(payment.payment_method ?? "—").replace(/_/g, " ")}</span></div><div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{payment.status ?? "—"}</Badge></div><div><span className="text-muted-foreground">Amount:</span> {fmtMoney(amount)}</div></div>}
    lines={lineRows}
    lineHeaders={["Bill", "Supplier Inv #", "Bill date", "Bill total", "Balance before/remaining"]}
    totals={<div className="space-y-3 text-sm"><div className="flex justify-between"><span>Payment amount</span><span className="font-bold">{fmtMoney(amount)}</span></div>{bills.length > 0 && <div className="flex justify-between"><span>Bill balance after payment</span><span>{fmtMoney(Math.max(Number(bills[0].balance_due ?? 0) - amount, 0))}</span></div>}</div>}
    impact={<div className="space-y-4"><DocumentImpact kind="bill" reference={payment.id ? `PAY:${payment.id}` : null} /><div className="rounded-md border p-3 text-sm"><div className="font-semibold">Expected accounting flow</div><div className="mt-1 text-muted-foreground">Debit supplier payable → Credit cash / bank / mobile-money account.</div></div></div>}
    footer={<div className="space-y-4"><div><div className="text-sm font-semibold">Payment audit metadata</div><div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm"><div><span className="text-muted-foreground">Created:</span> {payment.created_at ? new Date(payment.created_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">Updated:</span> {payment.updated_at ? new Date(payment.updated_at).toLocaleString() : "—"}</div><div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{payment.id}</span></div></div></div>{payment.notes && <div><div className="text-sm font-semibold">Notes</div><p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{payment.notes}</p></div>}</div>}
  />;
}
