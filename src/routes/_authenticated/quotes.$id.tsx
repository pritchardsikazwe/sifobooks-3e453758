import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, ReceiptText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { SifoDocumentLayout, type SifoDocumentLine } from "@/components/sifo/SifoDocumentLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quotes/$id")({
  head: () => ({ meta: [{ title: "Quotation Detail — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: QuoteDetailPage,
});

function QuoteDetailPage() {
  const { id } = Route.useParams();
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: q, error: qe }, { data: lines }] = await Promise.all([
      supabase.from("quotes").select("*, customers(name, email, phone, tpin)").eq("id", id).maybeSingle(),
      supabase.from("quote_items").select("*").eq("quote_id", id),
    ]);
    if (qe) toast.error(qe.message);
    setQuote(q); setItems(lines ?? []); setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const total = useMemo(() => Number(quote?.total ?? 0), [quote]);
  const subtotal = Number(quote?.subtotal ?? 0);
  const vat = Number(quote?.vat_amount ?? 0);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading quotation…</div>;
  if (!quote) return <div className="p-6 space-y-3"><Button asChild variant="outline"><Link to="/quotes"><ArrowLeft className="mr-2 h-4 w-4" />Back to Quotes</Link></Button><p>Quotation not found.</p></div>;

  const lines: SifoDocumentLine[] = items.map((it, index) => ({
    id: it.id ?? String(index),
    cells: [
      <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>,
      <div><div className="font-medium">{it.description || "—"}</div>{it.stock_item_id && <div className="text-xs text-muted-foreground">Stock item linked</div>}</div>,
      <span className="text-right tabular-nums">{Number(it.quantity ?? 0).toLocaleString()}</span>,
      <span className="text-right tabular-nums">{fmtMoney(it.unit_price, quote.currency)}</span>,
      <span className="text-right tabular-nums">{Number(it.vat_rate ?? 0)}%</span>,
      <span className="text-right font-medium tabular-nums">{fmtMoney(it.line_total, quote.currency)}</span>,
    ],
  }));

  return (
    <SifoDocumentLayout
      title="Quotation"
      number={quote.number}
      status={quote.status}
      description="Complete quotation record with customer, line items, totals and downstream transaction links."
      back={<Button asChild variant="ghost" size="sm"><Link to="/quotes"><ArrowLeft className="mr-1.5 h-4 w-4" />Quotes</Link></Button>}
      actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh</Button>}
      party={<div className="space-y-1"><div className="text-xs uppercase tracking-wide text-muted-foreground">Customer</div><div className="font-semibold">{quote.customers?.name ?? "—"}</div><div className="text-sm text-muted-foreground">{quote.customers?.email ?? ""}{quote.customers?.phone ? ` · ${quote.customers.phone}` : ""}</div>{quote.customers?.tpin && <div className="text-xs">TPIN: {quote.customers.tpin}</div>}</div>}
      metadata={<div className="space-y-1 text-sm"><div><span className="text-muted-foreground">Issued:</span> {quote.issue_date}</div><div><span className="text-muted-foreground">Valid until:</span> {quote.valid_until ?? "—"}</div><div><span className="text-muted-foreground">Currency:</span> {quote.currency}</div></div>}
      lineHeaders={["#", "Description", "Qty", "Unit price", "VAT", "Line total"]}
      lines={lines}
      impact={<div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Accounting</div><div className="mt-1 font-medium">No GL posting from quotation</div><div className="text-xs text-muted-foreground mt-1">Posting occurs when the downstream invoice is posted.</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Inventory</div><div className="mt-1 font-medium">No stock movement</div><div className="text-xs text-muted-foreground mt-1">A quotation reserves no stock by itself.</div></CardContent></Card><Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Lifecycle</div><div className="mt-1"><Badge variant="secondary" className="capitalize">{quote.status}</Badge></div></CardContent></Card></div>}
      footer={<div className="space-y-4"><div><div className="text-sm font-semibold">Notes</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes || "No notes recorded."}</p></div><Separator /><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/quotes"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Quote Manager</Link></Button>{quote.status === "converted" ? <Button asChild><Link to="/invoices">Open Sales Invoices</Link></Button> : <Button asChild><Link to="/quotes/new"><FileText className="mr-1.5 h-4 w-4" />Create New Quote</Link></Button>}</div></div>}
      totals={<div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(subtotal, quote.currency)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>{fmtMoney(vat, quote.currency)}</span></div><Separator /><div className="flex justify-between text-base font-semibold"><span>Total</span><span>{fmtMoney(total, quote.currency)}</span></div><div className="pt-2"><Button asChild className="w-full" variant="outline"><Link to="/invoices"><ReceiptText className="mr-1.5 h-4 w-4" />Sales Invoices</Link></Button></div></div>}
    />
  );
}
