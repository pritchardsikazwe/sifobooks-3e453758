import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/teaching-materials")({
  head: () => ({ meta: [{ title: "Teaching Materials — SifoBooks" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    request_no: `TM-${Date.now().toString().slice(-6)}`,
    category: "classroom", item_name: "", quantity: 1, estimated_cost: 0,
    requested_by: "", notes: "",
  });
  const [qOpen, setQOpen] = useState<string | null>(null);
  const [q, setQ] = useState({ supplier_name: "", quoted_amount: 0, notes: "" });

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("teaching_material_requests").select("*").eq("user_id", u.user.id).order("request_date", { ascending: false });
    setRows((data ?? []) as any);
    const { data: qs } = await supabase.from("supplier_quotations").select("*").eq("user_id", u.user.id);
    const grouped: Record<string, any[]> = {};
    for (const row of qs ?? []) { (grouped[row.request_id] ||= []).push(row); }
    setQuotes(grouped);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("teaching_material_requests").insert({
      user_id: u.user.id, ...f, quantity: Number(f.quantity), estimated_cost: Number(f.estimated_cost),
    });
    if (error) return toast.error(error.message);
    toast.success("Request created"); setOpen(false); load();
  };

  const addQuote = async () => {
    if (!qOpen) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("supplier_quotations").insert({
      user_id: u.user.id, request_id: qOpen, ...q, quoted_amount: Number(q.quoted_amount),
    });
    if (error) return toast.error(error.message);
    setQ({ supplier_name: "", quoted_amount: 0, notes: "" });
    toast.success("Quote added"); load();
  };

  const selectQuote = async (quoteId: string, requestId: string, amount: number) => {
    await supabase.from("supplier_quotations").update({ is_selected: false }).eq("request_id", requestId);
    await supabase.from("supplier_quotations").update({ is_selected: true }).eq("id", quoteId);
    await supabase.from("teaching_material_requests").update({ status: "approved", actual_cost: amount }).eq("id", requestId);
    toast.success("Supplier selected"); load();
  };

  const exportRows = rows.map(r => ({
    RequestNo: r.request_no, Date: r.request_date, Category: r.category,
    Item: r.item_name, Qty: r.quantity, Estimated: r.estimated_cost,
    Actual: r.actual_cost ?? "", By: r.requested_by ?? "", Status: r.status,
  }));

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-emerald-600" /> Teaching Materials</h1>
          <p className="text-sm text-muted-foreground">Classroom materials & learning equipment — 3-quote comparison before purchase.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="teaching-materials" title="Teaching Material Requests" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New Request</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Material Request</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Request #</Label><Input value={f.request_no} onChange={e => setF({ ...f, request_no: e.target.value })} /></div>
                <div><Label>Category</Label>
                  <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classroom">Classroom Materials</SelectItem>
                      <SelectItem value="equipment">Teaching Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Item</Label><Input value={f.item_name} onChange={e => setF({ ...f, item_name: e.target.value })} placeholder="Exercise books, projector, ..." /></div>
                <div><Label>Quantity</Label><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></div>
                <div><Label>Estimated cost (K)</Label><Input type="number" value={f.estimated_cost} onChange={e => setF({ ...f, estimated_cost: e.target.value })} /></div>
                <div className="col-span-2"><Label>Requested by</Label><Input value={f.requested_by} onChange={e => setF({ ...f, requested_by: e.target.value })} placeholder="HOD / Teacher name" /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
              </div>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Submit for Approval</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Req #</TableHead><TableHead>Item</TableHead><TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Est.</TableHead>
              <TableHead>Status</TableHead><TableHead>Quotes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => {
                const qs = quotes[r.id] || [];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                    <TableCell className="font-medium">{r.item_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(r.estimated_cost))}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {qs.map(quote => (
                          <div key={quote.id} className="flex items-center gap-2 text-xs">
                            <span>{quote.supplier_name}: {fmtMoney(Number(quote.quoted_amount))}</span>
                            {quote.is_selected ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => selectQuote(quote.id, r.id, Number(quote.quoted_amount))}>Select</Button>}
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="h-7 mt-1" onClick={() => setQOpen(r.id)}>+ Add Quote</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requests yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        }
      </Card>

      <Dialog open={!!qOpen} onOpenChange={() => setQOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier Quote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Supplier name</Label><Input value={q.supplier_name} onChange={e => setQ({ ...q, supplier_name: e.target.value })} /></div>
            <div><Label>Quoted amount (K)</Label><Input type="number" value={q.quoted_amount} onChange={e => setQ({ ...q, quoted_amount: Number(e.target.value) })} /></div>
            <div><Label>Notes</Label><Textarea value={q.notes} onChange={e => setQ({ ...q, notes: e.target.value })} /></div>
            <Button onClick={addQuote} className="bg-emerald-600 hover:bg-emerald-700">Save Quote</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
