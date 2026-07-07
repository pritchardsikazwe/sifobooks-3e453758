import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users, Loader2, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

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
  const [rows, setRows] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, Balance>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "with_balance" | "overdue">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
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

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s) ||
      (r.tpin ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const openNew = () => { setEditing(null); setForm({ name: "", payment_terms_days: 30, active: true, country: "Zambia" }); setOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm(c); setOpen(true); };

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
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Users className="h-6 w-6 text-emerald-600" /> Customers</h1>
          <p className="text-sm text-muted-foreground">Manage clients, credit terms, balances and communication history.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New customer</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2"><Label>Name *</Label><Input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Contact person</Label><Input value={form.contact_person ?? ""} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>TPIN</Label><Input value={form.tpin ?? ""} onChange={e => setForm({ ...form, tpin: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="space-y-1"><Label>City</Label><Input value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1"><Label>Country</Label><Input value={form.country ?? ""} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              <div className="space-y-1"><Label>Credit limit (ZMW)</Label><Input type="number" value={form.credit_limit ?? ""} onChange={e => setForm({ ...form, credit_limit: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="space-y-1"><Label>Payment terms (days)</Label><Input type="number" value={form.payment_terms_days ?? 30} onChange={e => setForm({ ...form, payment_terms_days: Number(e.target.value) })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Notes</Label><Input value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Add"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, phone, TPIN…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> :
          filtered.length === 0 ? <div className="py-12 text-center text-muted-foreground">No customers yet. Add your first one.</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Terms</TableHead>
              <TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Overdue</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => {
                const b = balances[c.id];
                return (
                  <TableRow key={c.id}>
                    <TableCell><Link to="/customers/$id" params={{ id: c.id }} className="font-medium text-emerald-700 hover:underline">{c.name}</Link>{c.tpin && <div className="text-xs text-muted-foreground">TPIN {c.tpin}</div>}</TableCell>
                    <TableCell><div className="text-sm">{c.email ?? "—"}</div><div className="text-xs text-muted-foreground">{c.phone ?? ""}</div></TableCell>
                    <TableCell>{c.payment_terms_days}d</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(b?.balance ?? 0)}</TableCell>
                    <TableCell className="text-right">{b?.overdue ? <span className="text-red-600 font-medium">{fmtMoney(b.overdue)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
}
