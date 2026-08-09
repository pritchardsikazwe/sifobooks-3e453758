import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Landmark } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";

export const Route = createFileRoute("/_authenticated/bank-accounts")({
  head: () => ({ meta: [{ title: "Bank Accounts — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const CURRENCIES = ["ZMW", "USD", "EUR", "GBP", "ZAR"];

type Row = {
  id: string; name: string; bank_name: string | null; account_number: string | null;
  currency: string; opening_balance: number; opening_date: string | null; notes: string | null;
  is_active: boolean;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [drawer, setDrawer] = useState<Row | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
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
    setRows(((accs ?? []) as unknown) as Row[]);
    const map: Record<string, any> = {};
    (rb ?? []).forEach((r: any) => { map[r.bank_account_id] = r; });
    setBalances(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!drawer) { setRecent([]); return; }
    (async () => {
      const { data } = await supabase.from("bank_transactions" as any)
        .select("id, txn_date, description, amount, reference, reconciled")
        .eq("bank_account_id", drawer.id).order("txn_date", { ascending: false }).limit(15);
      setRecent(data ?? []);
    })();
  }, [drawer]);

  const openNew = () => {
    setEdit(null);
    setF({ name: "", bank_name: "", account_number: "", currency: "ZMW",
      opening_balance: 0, opening_date: new Date().toISOString().slice(0, 10), notes: "" });
    setOpen(true);
  };
  const openEdit = (r: Row) => {
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

  const toggle = async (r: Row) => {
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

  const columns: DTColumn<Row>[] = useMemo(() => [
    { key: "name", header: "Name", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "bank_name", header: "Bank", cell: (r) => r.bank_name ?? "—" },
    { key: "account_number", header: "Account #", cell: (r) => <span className="font-mono text-xs">{r.account_number ?? "—"}</span> },
    { key: "currency", header: "Currency" },
    { key: "opening_balance", header: "Opening", align: "right",
      accessor: (r) => Number(r.opening_balance ?? 0), cell: (r) => fmtMoney(Number(r.opening_balance ?? 0)) },
    { key: "current", header: "Current Balance", align: "right",
      accessor: (r) => Number(balances[r.id]?.current_balance ?? r.opening_balance ?? 0),
      cell: (r) => <span className="font-medium">{fmtMoney(Number(balances[r.id]?.current_balance ?? r.opening_balance ?? 0))}</span> },
    { key: "unreconciled", header: "Unreconciled", align: "right",
      accessor: (r) => Number(balances[r.id]?.unreconciled_count ?? 0),
      cell: (r) => balances[r.id]?.unreconciled_count ?? 0 },
    { key: "is_active", header: "Status",
      accessor: (r) => r.is_active ? "Active" : "Inactive",
      cell: (r) => <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge> },
  ], [balances]);

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="banking"
          icon={Landmark}
          title={edit ? "Edit Bank Account" : "New Bank Account"}
          subtitle="Manage multiple bank accounts, currencies, and opening balances."
          onCancel={() => setOpen(false)}
          onSave={save}
          saveLabel={edit ? "Save changes" : "Create account"}
        >
          <SifoFormSection title="Account details">
            <SifoField label="Account name" required wide htmlFor="ba-name">
              <Input id="ba-name" className="h-11" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Zanaco Main Operating" />
            </SifoField>
            <SifoField label="Bank" htmlFor="ba-bank">
              <Input id="ba-bank" className="h-11" value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value })} placeholder="Zanaco" />
            </SifoField>
            <SifoField label="Account number" htmlFor="ba-acct">
              <Input id="ba-acct" className="h-11" value={f.account_number} onChange={e => setF({ ...f, account_number: e.target.value })} />
            </SifoField>
            <SifoField label="Currency" htmlFor="ba-currency">
              <Select value={f.currency} onValueChange={v => setF({ ...f, currency: v })}>
                <SelectTrigger id="ba-currency" className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Opening balance" htmlFor="ba-opening">
              <Input id="ba-opening" className="h-11" type="number" step="0.01" value={f.opening_balance} onChange={e => setF({ ...f, opening_balance: e.target.value })} />
            </SifoField>
            <SifoField label="Opening date" htmlFor="ba-date">
              <Input id="ba-date" className="h-11" type="date" value={f.opening_date} onChange={e => setF({ ...f, opening_date: e.target.value })} />
            </SifoField>
            <SifoField label="Notes" wide htmlFor="ba-notes">
              <Textarea id="ba-notes" rows={3} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
            </SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6 text-emerald-700" /> Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage multiple bank accounts, currencies, and opening balances.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="bank-accounts" title="Bank Accounts" />
          <Button onClick={openNew} variant="save" size="sm" className="h-9"><Plus className="h-4 w-4 mr-1.5" /> New Account</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading…</div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          onRowClick={setDrawer}
          empty="No bank accounts yet."
        />
      )}

      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer?.name ?? ""}
        subtitle={drawer ? `${drawer.bank_name ?? "—"} • ${drawer.account_number ?? "—"} • ${drawer.currency}` : ""}
        meta={drawer && <Badge variant={drawer.is_active ? "default" : "outline"}>{drawer.is_active ? "Active" : "Inactive"}</Badge>}
        footer={drawer && (
          <>
            <Button variant="ghost" onClick={() => toggle(drawer)}>{drawer.is_active ? "Deactivate" : "Activate"}</Button>
            <Button onClick={() => { openEdit(drawer); setDrawer(null); }}>Edit</Button>
          </>
        )}
      >
        {drawer && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Kpi label="Opening" value={fmtMoney(Number(drawer.opening_balance ?? 0))} />
              <Kpi label="Current" value={fmtMoney(Number(balances[drawer.id]?.current_balance ?? drawer.opening_balance ?? 0))} accent />
              <Kpi label="Unreconciled" value={String(balances[drawer.id]?.unreconciled_count ?? 0)} />
            </div>
            <DrawerSection title="Details">
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Currency">{drawer.currency}</DrawerField>
                <DrawerField label="Opening date">{drawer.opening_date ?? "—"}</DrawerField>
                {drawer.notes && <DrawerField label="Notes" className="col-span-2">{drawer.notes}</DrawerField>}
              </div>
            </DrawerSection>
            <DrawerSection title="Recent transactions">
              {recent.length === 0 ? (
                <div className="text-xs text-muted-foreground">No transactions yet.</div>
              ) : (
                <div className="space-y-1">
                  {recent.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/60 last:border-0">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.description ?? "—"}</div>
                        <div className="text-muted-foreground">{t.txn_date} {t.reference && `• ${t.reference}`}</div>
                      </div>
                      <div className={`tabular-nums ${Number(t.amount) < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                        {fmtMoney(Number(t.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DrawerSection>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${accent ? "text-emerald-700" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
