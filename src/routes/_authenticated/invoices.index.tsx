import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, Calendar, FileText, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { voidInvoiceLedger } from "@/lib/posting";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: [{ title: "Invoice Manager — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InvoicesPage,
});

type Tab = "all" | "normal" | "recurring" | "credit";

function InvoicesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<"new" | "old">("new");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("invoices").select("*, customers(name)").order("issue_date", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (i: any) => Number(i.balance_due) > 0 && i.due_date && i.due_date < today;

  const stats = useMemo(() => ({
    total: rows.length,
    paid: rows.filter(r => r.status === "paid").length,
    posted: rows.filter(r => r.status !== "draft").length,
    overdue: rows.filter(isOverdue).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    let list = rows.filter(i => {
      if (statusFilter !== "all") {
        if (statusFilter === "overdue" ? !isOverdue(i) : i.status !== statusFilter) return false;
      }
      if (!s) return true;
      return (i.number ?? "").toLowerCase().includes(s) || (i.customers?.name ?? "").toLowerCase().includes(s);
    });
    list = [...list].sort((a, b) => sort === "new" ? (b.issue_date > a.issue_date ? 1 : -1) : (a.issue_date > b.issue_date ? 1 : -1));
    return list;
  }, [rows, q, statusFilter, sort]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top action bar */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search for Invoices, purchase order, receipts etc" value={q} onChange={e => setQ(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <QuickAddCustomer trigger={
            <Button variant="outline" className="gap-2"><UserPlus className="h-4 w-4" /> New Customer</Button>
          } onCreated={() => { /* no-op */ }} />
          <Button asChild className="bg-[#0f4c5c] hover:bg-[#0c3f4c] text-white gap-2">
            <Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Invoice Manager</h1>
            <p className="text-sm text-muted-foreground">An intuitive way to see all your general invoices for quick access</p>
          </div>
          <Button variant="outline" className="gap-2"><Calendar className="h-4 w-4" /> Pick Date</Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total Invoices" value={stats.total} />
          <KPI label="Paid" value={stats.paid} />
          <KPI label="Posted" value={stats.posted} />
          <KPI label="Overdue" value={stats.overdue} accent={stats.overdue > 0 ? "text-red-600" : undefined} />
        </div>

        {/* Tabs & filters */}
        <div className="bg-white rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 flex-wrap gap-2">
            <div className="flex gap-1">
              {(["all", "normal", "recurring", "credit"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`py-3 px-3 text-sm capitalize border-b-2 -mb-px transition ${tab === t ? "border-[#0f4c5c] text-[#0f4c5c] font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {t === "credit" ? "Credit Notes" : t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 py-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Newest to Oldest</SelectItem>
                  <SelectItem value="old">Oldest to Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4">
            <div className="text-sm font-medium mb-3">Invoices</div>
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FileText className="h-9 w-9 text-slate-400" />
                </div>
                <div className="font-semibold">No invoices yet</div>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Create your first invoice to start getting paid by your clients.</p>
                <Button asChild className="mt-5 bg-[#0f4c5c] hover:bg-[#0c3f4c] gap-2">
                  <Link to="/invoices/new"><Plus className="h-4 w-4" /> Create Invoice</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left font-medium py-2 px-2">#</th>
                      <th className="text-left font-medium py-2 px-2">Customer</th>
                      <th className="text-left font-medium py-2 px-2">Issued</th>
                      <th className="text-left font-medium py-2 px-2">Due</th>
                      <th className="text-right font-medium py-2 px-2">Total</th>
                      <th className="text-right font-medium py-2 px-2">Balance</th>
                      <th className="text-left font-medium py-2 px-2">Status</th>
                      <th className="text-right font-medium py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(i => {
                      const overdue = isOverdue(i);
                      return (
                        <tr key={i.id} className={`border-b last:border-0 hover:bg-slate-50 ${i.status === "voided" ? "opacity-50" : ""}`}>
                          <td className="py-2 px-2 font-mono text-xs">{i.number}</td>
                          <td className="py-2 px-2">{i.customers?.name ?? "—"}</td>
                          <td className="py-2 px-2 text-xs">{i.issue_date}</td>
                          <td className="py-2 px-2 text-xs">{i.due_date ?? "—"}</td>
                          <td className="py-2 px-2 text-right">{fmtMoney(i.total, i.currency)}</td>
                          <td className="py-2 px-2 text-right font-medium">{fmtMoney(i.balance_due, i.currency)}</td>
                          <td className="py-2 px-2"><Status s={i.status === "voided" ? "voided" : overdue ? "overdue" : i.status} /></td>
                          <td className="py-2 px-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              <ShareDoc kind="invoice" id={i.id} docNumber={i.number} />
                              {i.status !== "voided" && <VoidInvoice invoice={i} onDone={load} />}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ?? ""}`}>{value}</div>
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

function VoidInvoice({ invoice, onDone }: { invoice: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const res = await voidInvoiceLedger({
      userId: u.user.id, invoiceId: invoice.id, number: invoice.number, reason,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Void failed");
    toast.success(`Invoice ${invoice.number} voided — stock restored, ledger reversed`);
    setOpen(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 gap-1"><Ban className="h-3.5 w-3.5" /> Void</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Void invoice {invoice.number}?</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            This will restore inventory quantities, create a reversing journal entry, and mark the invoice as voided. This action is auditable but not undoable.
          </div>
          <div className="space-y-1"><Label>Reason (optional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Duplicate entry, returned goods…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={run} disabled={busy} className="bg-red-600 hover:bg-red-700">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Void invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
