import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/tuckshop")({
  head: () => ({ meta: [{ title: "Tuckshop POS — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><Page /></RequireModule>,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    const { error } = await supabase.from("tuckshop_transactions").insert({
      user_id: u.user.id, ...f, quantity: Number(f.quantity), amount: Number(f.amount),
    });
    setSaving(false);
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

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="inventory"
          icon={ShoppingBag}
          title="Record Transaction"
          subtitle="Daily tuckshop sales, purchases and profit — auto-posted to GL"
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={saving}
          saveLabel="Save & post"
        >
          <SifoFormSection title="Transaction details">
            <SifoField label="Date"><Input type="date" value={f.txn_date} onChange={e => setF({ ...f, txn_date: e.target.value })} /></SifoField>
            <SifoField label="Type">
              <Select value={f.txn_type} onValueChange={v => setF({ ...f, txn_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Description" wide><Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></SifoField>
            <SifoField label="Quantity"><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></SifoField>
            <SifoField label="Amount (K)"><Input type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  const tuckshopColumns: DTColumn<any>[] = [
    { key: "txn_date", header: "Date", sticky: true },
    { key: "txn_type", header: "Type", cell: (r) => <Badge variant={r.txn_type === "sale" ? "default" : "outline"}>{r.txn_type}</Badge> },
    { key: "description", header: "Description", cell: (r) => r.description ?? "—" },
    { key: "quantity", header: "Qty", align: "right" },
    { key: "amount", header: "Amount", align: "right", cell: (r) => <span className={r.txn_type === "sale" ? "font-semibold text-emerald-700" : "font-semibold"}>{fmtMoney(Number(r.amount))}</span> },
    { key: "payment_method", header: "Method" },
  ];

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-primary" /> Tuckshop POS</h1>
          <p className="text-sm text-muted-foreground">Daily tuckshop sales, purchases and profit — auto-posted.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="tuckshop" title="Tuckshop Transactions" />
          <Button size="sm" className="h-9" variant="save" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Record</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Sales</div><div className="text-xl font-bold text-emerald-700">{fmtMoney(summary.sales)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Purchases + Expenses</div><div className="text-xl font-bold">{fmtMoney(summary.purchases)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Profit</div><div className="text-xl font-bold text-blue-700">{fmtMoney(summary.profit)}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          tableId="tuckshop-transactions"
          columns={tuckshopColumns}
          data={rows}
          loading={loading}
          empty="No transactions yet."
          searchPlaceholder="Search transactions…"
          totals={(list) => ({
            quantity: list.reduce((s, r) => s + Number(r.quantity || 0), 0),
            amount: fmtMoney(list.reduce((s, r) => s + Number(r.amount || 0), 0)),
          })}
        />
      </Card>
    </div>
  );
}
