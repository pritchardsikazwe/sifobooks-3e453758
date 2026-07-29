import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus, FileText, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { voidInvoiceLedger } from "@/lib/posting";
import { ShareDoc } from "@/components/ShareDoc";
import { toast } from "sonner";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: [{ title: "Invoice Manager — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InvoicesPage,
});

type Tab = "all" | "normal" | "recurring" | "credit";

function InvoicesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [drawer, setDrawer] = useState<any | null>(null);

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

  const filtered = useMemo(() => rows.filter(i => {
    if (!inRange(i.issue_date, range)) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "overdue" ? !isOverdue(i) : i.status !== statusFilter) return false;
    }
    return true;
  }), [rows, statusFilter, range]);

  const columns: DTColumn<any>[] = useMemo(() => [
    { key: "number", header: "#", accessor: r => r.number, cell: r => <span className="font-mono text-xs">{r.number}</span> },
    { key: "customer", header: "Customer", accessor: r => r.customers?.name ?? "", cell: r => r.customers?.name ?? "—" },
    { key: "issue_date", header: "Issued", accessor: r => r.issue_date, cell: r => <span className="text-xs tabular-nums">{r.issue_date}</span> },
    { key: "due_date", header: "Due", accessor: r => r.due_date, cell: r => <span className="text-xs tabular-nums">{r.due_date ?? "—"}</span> },
    { key: "total", header: "Total", align: "right", accessor: r => Number(r.total), cell: r => <span className="tabular-nums">{fmtMoney(r.total, r.currency)}</span> },
    { key: "balance_due", header: "Balance", align: "right", accessor: r => Number(r.balance_due), cell: r => <span className="tabular-nums font-medium">{fmtMoney(r.balance_due, r.currency)}</span> },
    { key: "status", header: "Status", accessor: r => r.status, cell: r => <Status s={r.status === "voided" ? "voided" : isOverdue(r) ? "overdue" : r.status} /> },
  ], []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Invoice Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">An intuitive way to see all your invoices for quick access.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter value={range} onChange={setRange} compact />
          <ExportMenu filename="invoices" title="Invoices" rows={filtered.map(i => ({ Number: i.number, Customer: i.customers?.name ?? "", Issued: i.issue_date, Due: i.due_date ?? "", Total: i.total, Balance: i.balance_due, Status: i.status, Currency: i.currency ?? "ZMW" }))} />
          <QuickAddCustomer trigger={<Button variant="outline" size="sm" className="h-9"><UserPlus className="h-4 w-4 mr-1.5" /> Customer</Button>} onCreated={() => {}} />
          <Button asChild size="sm" className="h-9"><Link to="/invoices/new"><Plus className="h-4 w-4 mr-1.5" /> New invoice</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total invoices" value={stats.total} />
        <KPI label="Paid" value={stats.paid} />
        <KPI label="Posted" value={stats.posted} />
        <KPI label="Overdue" value={stats.overdue} accent={stats.overdue > 0 ? "text-red-600" : undefined} />
      </div>

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {(["all", "normal", "recurring", "credit"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2.5 px-3 text-sm capitalize border-b-2 -mb-px transition ${tab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "credit" ? "Credit notes" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search invoices, customers…"
          onRowClick={setDrawer}
          toolbarLeft={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          }
          empty={<div className="py-6"><FileText className="h-10 w-10 mx-auto mb-3 opacity-40" /><div>No invoices in this range.</div></div>}
        />
      )}

      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer ? `Invoice ${drawer.number}` : ""}
        subtitle={drawer?.customers?.name}
        meta={drawer && <Status s={drawer.status === "voided" ? "voided" : isOverdue(drawer) ? "overdue" : drawer.status} />}
        toolbar={drawer && <ShareDoc kind="invoice" id={drawer.id} docNumber={drawer.number} />}
        footer={drawer && (
          <>
            {drawer.status !== "voided" && <VoidInvoice invoice={drawer} onDone={() => { setDrawer(null); load(); }} />}
            <Button size="sm" onClick={() => navigate({ to: "/invoices/new" })}>Duplicate</Button>
          </>
        )}
      >
        {drawer && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Total" value={fmtMoney(drawer.total, drawer.currency)} />
              <StatTile label="Paid" value={fmtMoney(drawer.amount_paid, drawer.currency)} />
              <StatTile label="Balance" value={fmtMoney(drawer.balance_due, drawer.currency)} accent={Number(drawer.balance_due) > 0 ? "text-red-600" : undefined} />
            </div>
            <DrawerSection title="Details">
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Issue date">{drawer.issue_date}</DrawerField>
                <DrawerField label="Due date">{drawer.due_date ?? "—"}</DrawerField>
                <DrawerField label="Currency">{drawer.currency ?? "ZMW"}</DrawerField>
                <DrawerField label="Status">{drawer.status}</DrawerField>
                {drawer.reference && <DrawerField label="Reference" className="col-span-2">{drawer.reference}</DrawerField>}
              </div>
            </DrawerSection>
            {drawer.notes && (
              <DrawerSection title="Notes"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{drawer.notes}</p></DrawerSection>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Status({ s }: { s: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700", partial: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700", sent: "bg-blue-100 text-blue-700",
    draft: "bg-slate-100 text-slate-700", cancelled: "bg-slate-100 text-slate-500",
    voided: "bg-slate-200 text-slate-500",
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
    const res = await voidInvoiceLedger({ userId: u.user.id, invoiceId: invoice.id, number: invoice.number, reason });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Void failed");
    toast.success(`Invoice ${invoice.number} voided — stock restored, ledger reversed`);
    setOpen(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50"><Ban className="h-3.5 w-3.5 mr-1" /> Void</Button>
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
