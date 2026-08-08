import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Users, Loader2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";
import { ExportMenu } from "@/lib/exports";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({ meta: [{ title: "Customers — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CustomersPage,
});

type Customer = {
  id: string; name: string; contact_person: string | null; email: string | null;
  phone: string | null; tpin: string | null; address: string | null; city: string | null;
  country: string | null; credit_limit: number | null; payment_terms_days: number;
  active: boolean; notes: string | null;
};

type Balance = { customer_id: string; total: number; paid: number; balance: number; overdue: number };

function CustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "with_balance" | "overdue">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [drawer, setDrawer] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({ name: "", payment_terms_days: 30, active: true, country: "Zambia" });

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase.from("customers").select("*").order("name");
    setRows((cs ?? []) as Customer[]);
    const { data: invs } = await supabase.from("invoices").select("customer_id, total, amount_paid, balance_due, due_date, status");
    const map: Record<string, Balance> = {};
    const today = new Date().toISOString().slice(0, 10);
    (invs ?? []).forEach((i: any) => {
      if (!i.customer_id) return;
      const b = map[i.customer_id] ??= { customer_id: i.customer_id, total: 0, paid: 0, balance: 0, overdue: 0 };
      b.total += Number(i.total || 0);
      b.paid += Number(i.amount_paid || 0);
      b.balance += Number(i.balance_due || 0);
      if (i.balance_due > 0 && i.due_date && i.due_date < today) b.overdue += Number(i.balance_due || 0);
    });
    setBalances(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter === "active" && !r.active) return false;
    if (statusFilter === "inactive" && r.active) return false;
    const b = balances[r.id];
    if (balanceFilter === "with_balance" && !(b && b.balance > 0)) return false;
    if (balanceFilter === "overdue" && !(b && b.overdue > 0)) return false;
    return true;
  }), [rows, statusFilter, balanceFilter, balances]);

  const openNew = () => { setEditing(null); setForm({ name: "", payment_terms_days: 30, active: true, country: "Zambia" }); setFormOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm(c); setFormOpen(true); setDrawer(null); };

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id,
      name: form.name!.trim(),
      contact_person: form.contact_person || null,
      email: form.email || null,
      phone: form.phone || null,
      tpin: form.tpin || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || "Zambia",
      credit_limit: form.credit_limit ?? null,
      payment_terms_days: form.payment_terms_days ?? 30,
      active: form.active ?? true,
      notes: form.notes || null,
    };
    const res = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Customer updated" : "Customer added");
    setFormOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setDrawer(null);
    load();
  };

  const columns: DTColumn<Customer>[] = useMemo(() => [
    {
      key: "name", header: "Customer", accessor: (r) => r.name,
      cell: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.name}</div>
          {r.tpin && <div className="text-[11px] text-muted-foreground">TPIN {r.tpin}</div>}
        </div>
      ),
    },
    { key: "contact", header: "Contact", accessor: (r) => r.email ?? r.phone ?? "",
      cell: (r) => (
        <div>
          <div className="text-sm">{r.email ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground">{r.phone ?? ""}</div>
        </div>
      ),
    },
    { key: "terms", header: "Terms", align: "right", accessor: (r) => r.payment_terms_days, cell: (r) => <span className="tabular-nums">{r.payment_terms_days}d</span> },
    { key: "balance", header: "Balance", align: "right",
      accessor: (r) => balances[r.id]?.balance ?? 0,
      cell: (r) => <span className="tabular-nums font-medium">{fmtMoney(balances[r.id]?.balance ?? 0)}</span> },
    { key: "overdue", header: "Overdue", align: "right",
      accessor: (r) => balances[r.id]?.overdue ?? 0,
      cell: (r) => {
        const v = balances[r.id]?.overdue ?? 0;
        return v > 0 ? <span className="tabular-nums font-medium text-red-600">{fmtMoney(v)}</span> : <span className="text-muted-foreground">—</span>;
      } },
    { key: "active", header: "Status", accessor: (r) => (r.active ? "Active" : "Inactive"),
      cell: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Inactive"}</Badge> },
  ], [balances]);

  const b = drawer ? balances[drawer.id] : null;

  if (formOpen) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="sales"
          icon={Users}
          title={editing ? "Edit customer" : "New customer"}
          subtitle="Client details, credit terms and contact information."
          onCancel={() => setFormOpen(false)}
          onSave={save}
          saveLabel={editing ? "Save changes" : "Create customer"}
        >
          <SifoFormSection title="Identity">
            <SifoField label="Name" required wide htmlFor="cust-name">
              <Input id="cust-name" className="h-11" value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            </SifoField>
            <SifoField label="Contact person" htmlFor="cust-contact">
              <Input id="cust-contact" className="h-11" value={form.contact_person ?? ""} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
            </SifoField>
            <SifoField label="TPIN" htmlFor="cust-tpin">
              <Input id="cust-tpin" className="h-11" value={form.tpin ?? ""} onChange={e => setForm({ ...form, tpin: e.target.value })} />
            </SifoField>
          </SifoFormSection>

          <SifoFormSection title="Contact">
            <SifoField label="Email" htmlFor="cust-email">
              <Input id="cust-email" type="email" className="h-11" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} />
            </SifoField>
            <SifoField label="Phone" htmlFor="cust-phone">
              <Input id="cust-phone" className="h-11" value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </SifoField>
            <SifoField label="Address" wide htmlFor="cust-address">
              <Input id="cust-address" className="h-11" value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} />
            </SifoField>
            <SifoField label="City" htmlFor="cust-city">
              <Input id="cust-city" className="h-11" value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} />
            </SifoField>
            <SifoField label="Country" htmlFor="cust-country">
              <Input id="cust-country" className="h-11" value={form.country ?? ""} onChange={e => setForm({ ...form, country: e.target.value })} />
            </SifoField>
          </SifoFormSection>

          <SifoFormSection title="Credit terms">
            <SifoField label="Credit limit (ZMW)" htmlFor="cust-limit">
              <Input id="cust-limit" type="number" className="h-11" value={form.credit_limit ?? ""} onChange={e => setForm({ ...form, credit_limit: e.target.value ? Number(e.target.value) : null })} />
            </SifoField>
            <SifoField label="Payment terms (days)" htmlFor="cust-terms">
              <Input id="cust-terms" type="number" className="h-11" value={form.payment_terms_days ?? 30} onChange={e => setForm({ ...form, payment_terms_days: Number(e.target.value) })} />
            </SifoField>
            <SifoField label="Notes" wide htmlFor="cust-notes">
              <Input id="cust-notes" className="h-11" value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">

      <SifoModuleHeader
        module="sales"
        icon={Users}
        title="Customers"
        description="Manage clients, credit terms, balances and communication history."
        breadcrumbs={[{ label: "Sales", to: "/invoices" }, { label: "Customers" }]}
        actions={<>
          <ExportMenu rows={filtered.map(c => ({
            Name: c.name, Contact: c.contact_person ?? "", Email: c.email ?? "", Phone: c.phone ?? "",
            TPIN: c.tpin ?? "", Terms: c.payment_terms_days, Balance: balances[c.id]?.balance ?? 0,
            Overdue: balances[c.id]?.overdue ?? 0, Status: c.active ? "Active" : "Inactive",
          }))} filename="customers" title="Customers" />
          <Button onClick={openNew} size="sm" className="h-9"><Plus className="h-4 w-4 mr-1.5" /> New customer</Button>
        </>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search name, email, phone, TPIN…"
          onRowClick={setDrawer}
          selectable
          bulkActions={(sel, clear) => (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={async () => {
                  if (!confirm(`Delete ${sel.length} customer(s)?`)) return;
                  const { error } = await supabase.from("customers").delete().in("id", sel.map(r => r.id));
                  if (error) return toast.error(error.message);
                  toast.success(`Deleted ${sel.length}`); clear(); load();
                }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </>
          )}
          toolbarLeft={
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={balanceFilter} onValueChange={v => setBalanceFilter(v as any)}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All balances</SelectItem>
                  <SelectItem value="with_balance">With balance</SelectItem>
                  <SelectItem value="overdue">Overdue only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          empty={<div className="py-6"><Users className="h-10 w-10 mx-auto mb-3 opacity-40" /><div>No customers match your filters.</div></div>}
        />
      )}

      {/* Detail drawer */}
      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer?.name ?? ""}
        subtitle={drawer?.contact_person ?? undefined}
        meta={drawer && (
          <>
            <Badge variant={drawer.active ? "default" : "secondary"}>{drawer.active ? "Active" : "Inactive"}</Badge>
            {drawer.tpin && <span className="text-xs text-muted-foreground">TPIN {drawer.tpin}</span>}
          </>
        )}
        toolbar={drawer && (
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
            <Link to="/customers/$id" params={{ id: drawer.id }}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</Link>
          </Button>
        )}
        footer={drawer && (
          <>
            <Button variant="outline" size="sm" onClick={() => remove(drawer.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            <Button size="sm" onClick={() => openEdit(drawer)}>Edit</Button>
          </>
        )}
      >
        {drawer && (
          <div className="space-y-5">
            <DrawerSection title="Balances">
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Invoiced" value={fmtMoney(b?.total ?? 0)} />
                <StatTile label="Paid" value={fmtMoney(b?.paid ?? 0)} />
                <StatTile label="Outstanding" value={fmtMoney(b?.balance ?? 0)} accent={b?.overdue ? "text-red-600" : undefined} />
              </div>
            </DrawerSection>
            <DrawerSection title="Contact">
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Email">{drawer.email ?? "—"}</DrawerField>
                <DrawerField label="Phone">{drawer.phone ?? "—"}</DrawerField>
                <DrawerField label="Contact person">{drawer.contact_person ?? "—"}</DrawerField>
                <DrawerField label="Payment terms">{drawer.payment_terms_days} days</DrawerField>
                <DrawerField label="Credit limit">{drawer.credit_limit != null ? fmtMoney(drawer.credit_limit) : "—"}</DrawerField>
                <DrawerField label="Country">{drawer.country ?? "—"}</DrawerField>
                <DrawerField label="City">{drawer.city ?? "—"}</DrawerField>
                <DrawerField label="Address" className="col-span-2">{drawer.address ?? "—"}</DrawerField>
              </div>
            </DrawerSection>
            {drawer.notes && (
              <DrawerSection title="Notes"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{drawer.notes}</p></DrawerSection>
            )}
            <DrawerSection title="Actions">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/invoices/new" })}>New invoice</Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/receipts" })}>Record payment</Button>
              </div>
            </DrawerSection>
          </div>
        )}
      </DetailDrawer>

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
