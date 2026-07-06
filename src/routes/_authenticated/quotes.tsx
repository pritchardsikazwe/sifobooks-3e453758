import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, FileText, ArrowRightCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/quotes")({
  head: () => ({ meta: [{ title: "Quotes — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: QuotesPage,
});

const STATUSES = ["draft", "sent", "accepted", "declined", "converted"] as const;

function QuotesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("quotes").select("*, customers(name)").order("issue_date", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const convert = async (quote: any) => {
    if (quote.status === "converted") return toast.info("Already converted");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id);
    const nextNum = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const due = new Date(); due.setDate(due.getDate() + 30);
    const { data: inv, error } = await supabase.from("invoices").insert({
      user_id: u.user.id, customer_id: quote.customer_id, quote_id: quote.id,
      number: nextNum, issue_date: new Date().toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10), status: "sent", currency: quote.currency,
      subtotal: quote.subtotal, vat_amount: quote.vat_amount, total: quote.total,
      notes: quote.notes,
    }).select().single();
    if (error || !inv) return toast.error(error?.message ?? "Failed");
    if (items && items.length > 0) {
      await supabase.from("invoice_items").insert(items.map((it: any) => ({
        user_id: u.user.id, invoice_id: inv.id, stock_item_id: it.stock_item_id,
        description: it.description, hs_code: it.hs_code, quantity: it.quantity,
        unit_price: it.unit_price, vat_rate: it.vat_rate, line_total: it.line_total,
      })));
    }
    await supabase.from("quotes").update({ status: "converted", converted_invoice_id: inv.id }).eq("id", quote.id);
    toast.success(`Invoice ${nextNum} created from quote`);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText className="h-6 w-6 text-emerald-600" /> Quotations</h1>
          <p className="text-sm text-muted-foreground">Draft → send → accept → convert to invoice.</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700"><Link to="/quotes/new"><Plus className="h-4 w-4 mr-1" /> New quote</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All quotes</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading…</div> :
          rows.length === 0 ? <div className="py-12 text-center text-muted-foreground">No quotes yet.</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead>Issued</TableHead>
              <TableHead>Valid</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>{rows.map(q => (
              <TableRow key={q.id}>
                <TableCell className="font-mono text-xs">{q.number}</TableCell>
                <TableCell>{q.customers?.name ?? "—"}</TableCell>
                <TableCell className="text-xs">{q.issue_date}</TableCell>
                <TableCell className="text-xs">{q.valid_until ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">{fmtMoney(q.total, q.currency)}</TableCell>
                <TableCell>
                  <Select value={q.status} onValueChange={v => updateStatus(q.id, v)}>
                    <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} disabled={s === "converted"}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  {q.status === "converted" ? <Badge variant="outline">Converted</Badge> :
                    <Button size="sm" variant="outline" onClick={() => convert(q)} disabled={q.status === "declined"}><ArrowRightCircle className="h-3 w-3 mr-1" /> To invoice</Button>}
                  <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
}
