import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/tuckshop")({
  head: () => ({ meta: [{ title: "Tuckshop POS — SifoBooks" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    txn_date: new Date().toISOString().slice(0, 10),
    txn_type: "sale", description: "", quantity: 1, amount: 0, payment_method: "cash",
  });

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("tuckshop_transactions").select("*").eq("user_id", u.user.id).order("txn_date", { ascending: false });
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("tuckshop_transactions").insert({
      user_id: u.user.id, ...f, quantity: Number(f.quantity), amount: Number(f.amount),
    });
    if (error) return toast.error(error.message);
    toast.success(`${f.txn_type === "sale" ? "Sale" : "Cost"} recorded — posted to GL`);
    setOpen(false); setF({ ...f, description: "", amount: 0 }); load();
  };

  const summary = useMemo(() => {
    const s = { sales: 0, purchases: 0 };
    for (const r of rows) {
      if (r.txn_type === "sale") s.sales += Number(r.amount);
      else s.purchases += Number(r.amount);
    }
    return { ...s, profit: s.sales - s.purchases };
  }, [rows]);

  const exportRows = rows.map(r => ({
    Date: r.txn_date, Type: r.txn_type, Description: r.description ?? "",
    Qty: r.quantity, Amount: r.amount, Method: r.payment_method,
  }));

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-emerald-600" /> Tuckshop POS</h1>
          <p className="text-sm text-muted-foreground">Daily tuckshop sales, purchases and profit — auto-posted.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="tuckshop" title="Tuckshop Transactions" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Record</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={f.txn_date} onChange={e => setF({ ...f, txn_date: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={f.txn_type} onValueChange={v => setF({ ...f, txn_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Description</Label><Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
                <div><Label>Quantity</Label><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></div>
                <div><Label>Amount (K)</Label><Input type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
              </div>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Save & Post</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Sales</div><div className="text-xl font-bold text-emerald-700">{fmtMoney(summary.sales)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Purchases + Expenses</div><div className="text-xl font-bold">{fmtMoney(summary.purchases)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Profit</div><div className="text-xl font-bold text-blue-700">{fmtMoney(summary.profit)}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.txn_date}</TableCell>
                  <TableCell><Badge variant={r.txn_type === "sale" ? "default" : "outline"}>{r.txn_type}</Badge></TableCell>
                  <TableCell>{r.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.txn_type === "sale" ? "text-emerald-700" : ""}`}>{fmtMoney(Number(r.amount))}</TableCell>
                  <TableCell>{r.payment_method}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        }
      </Card>
    </div>
  );
}
