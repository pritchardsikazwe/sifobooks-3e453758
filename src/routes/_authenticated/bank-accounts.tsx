import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/bank-accounts")({
  head: () => ({ meta: [{ title: "Bank Accounts — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const CURRENCIES = ["ZMW", "USD", "EUR", "GBP", "ZAR"];

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [f, setF] = useState<any>({
    name: "", bank_name: "", account_number: "", currency: "ZMW",
    opening_balance: 0, opening_date: new Date().toISOString().slice(0, 10), notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: accs }, { data: rb }] = await Promise.all([
      supabase.from("bank_accounts" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("bank_running_balance" as any).select("*"),
    ]);
    setRows((accs ?? []) as any);
    const map: Record<string, any> = {};
    (rb ?? []).forEach((r: any) => { map[r.bank_account_id] = r; });
    setBalances(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEdit(null);
    setF({ name: "", bank_name: "", account_number: "", currency: "ZMW",
      opening_balance: 0, opening_date: new Date().toISOString().slice(0, 10), notes: "" });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEdit(r);
    setF({
      name: r.name, bank_name: r.bank_name ?? "", account_number: r.account_number ?? "",
      currency: r.currency ?? "ZMW", opening_balance: r.opening_balance ?? 0,
      opening_date: r.opening_date ?? new Date().toISOString().slice(0, 10),
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!f.name.trim()) return toast.error("Name required");
    const payload = { ...f, opening_balance: Number(f.opening_balance) };
    const { error } = edit
      ? await supabase.from("bank_accounts" as any).update(payload).eq("id", edit.id)
      : await supabase.from("bank_accounts" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Updated" : "Bank account added");
    setOpen(false); load();
  };

  const toggle = async (r: any) => {
    const { error } = await supabase.from("bank_accounts" as any).update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const exportRows = rows.map(r => ({
    Name: r.name, Bank: r.bank_name ?? "", Account: r.account_number ?? "",
    Currency: r.currency, Opening: r.opening_balance,
    Current: balances[r.id]?.current_balance ?? r.opening_balance,
    Unreconciled: balances[r.id]?.unreconciled_count ?? 0,
    Status: r.is_active ? "Active" : "Inactive",
  }));

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6 text-emerald-600" /> Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage multiple bank accounts, currencies, and opening balances.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="bank-accounts" title="Bank Accounts" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New Account</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} Bank Account</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Account name *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Zanaco Main Operating" /></div>
                <div><Label>Bank</Label><Input value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value })} placeholder="Zanaco" /></div>
                <div><Label>Account number</Label><Input value={f.account_number} onChange={e => setF({ ...f, account_number: e.target.value })} /></div>
                <div><Label>Currency</Label>
                  <Select value={f.currency} onValueChange={v => setF({ ...f, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Opening balance</Label><Input type="number" step="0.01" value={f.opening_balance} onChange={e => setF({ ...f, opening_balance: e.target.value })} /></div>
                <div><Label>Opening date</Label><Input type="date" value={f.opening_date} onChange={e => setF({ ...f, opening_date: e.target.value })} /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
              </div>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">{edit ? "Save" : "Create"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Bank</TableHead><TableHead>Account #</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Current balance</TableHead>
              <TableHead className="text-right">Unreconciled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => {
                const b = balances[r.id];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.bank_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.account_number ?? "—"}</TableCell>
                    <TableCell>{r.currency}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(r.opening_balance ?? 0))}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(b?.current_balance ?? r.opening_balance ?? 0))}</TableCell>
                    <TableCell className="text-right">{b?.unreconciled_count ?? 0}</TableCell>
                    <TableCell><Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(r)}>{r.is_active ? "Deactivate" : "Activate"}</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bank accounts yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
