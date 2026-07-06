import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "unpaid" | "paid">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("invoices").select("*, customers(name)").order("issue_date", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (i: any) => i.balance_due > 0 && i.due_date && i.due_date < today;

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter(i => {
      if (filter === "overdue" && !isOverdue(i)) return false;
      if (filter === "unpaid" && Number(i.balance_due) <= 0) return false;
      if (filter === "paid" && i.status !== "paid") return false;
      if (!s) return true;
      return i.number.toLowerCase().includes(s) || (i.customers?.name ?? "").toLowerCase().includes(s);
    });
  }, [rows, q, filter]);

  const overdueCount = rows.filter(isOverdue).length;
  const overdueAmount = rows.filter(isOverdue).reduce((s, i) => s + Number(i.balance_due || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ReceiptText className="h-6 w-6 text-emerald-600" /> Sales invoices</h1>
          <p className="text-sm text-muted-foreground">Track billing, VAT and outstanding balances.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/receipts"><Plus className="h-4 w-4 mr-1" /> Receive payment</Link></Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700"><Link to="/invoices/new"><Plus className="h-4 w-4 mr-1" /> New invoice</Link></Button>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span><strong>{overdueCount}</strong> overdue invoice{overdueCount === 1 ? "" : "s"} totalling <strong>{fmtMoney(overdueAmount)}</strong></span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setFilter("overdue")}>Review</Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search # or customer" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1">
            {(["all", "unpaid", "overdue", "paid"] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading…</div> :
          filtered.length === 0 ? <div className="py-12 text-center text-muted-foreground">No invoices.</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead>Issued</TableHead>
              <TableHead>Due</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>{filtered.map(i => {
              const overdue = isOverdue(i);
              return (
                <TableRow key={i.id} className={overdue ? "bg-red-50/50" : ""}>
                  <TableCell className="font-mono text-xs">{i.number}</TableCell>
                  <TableCell>{i.customers?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{i.issue_date}</TableCell>
                  <TableCell className="text-xs">{i.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmtMoney(i.total, i.currency)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{fmtMoney(i.amount_paid, i.currency)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(i.balance_due, i.currency)}</TableCell>
                  <TableCell><Status s={overdue ? "overdue" : i.status} /></TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
}

function Status({ s }: { s: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700", partial: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700", sent: "bg-blue-100 text-blue-700",
    draft: "bg-slate-100 text-slate-700", cancelled: "bg-slate-100 text-slate-500",
  };
  return <span className={`px-2 py-0.5 rounded text-xs capitalize ${map[s] ?? "bg-slate-100"}`}>{s}</span>;
}
