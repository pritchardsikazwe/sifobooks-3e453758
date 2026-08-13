import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/teaching-materials")({
  head: () => ({ meta: [{ title: "Teaching Materials — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><Page /></RequireModule>,
});

function Page() {
  const requestColumns: DTColumn<any>[] = [
    { key: "request_no", header: "Req #", cell: r => <span className="font-mono text-xs">{r.request_no}</span> },
    { key: "item_name", header: "Item", cell: r => <span className="font-medium">{r.item_name}</span> },
    { key: "category", header: "Category", cell: r => <Badge variant="outline">{r.category}</Badge> },
    { key: "quantity", header: "Qty", align: "right" },
    { key: "estimated_cost", header: "Est.", align: "right", cell: r => fmtMoney(Number(r.estimated_cost)) },
    { key: "status", header: "Status", cell: r => <Badge>{r.status}</Badge> },
    { key: "quotes", header: "Quotes", sortable: false, cell: r => {
        const qs = quotes[r.id] || [];
        return (
          <div className="flex flex-col gap-1">
            {qs.map((quote: any) => (
              <div key={quote.id} className="flex items-center gap-2 text-xs">
                <span>{quote.supplier_name}: {fmtMoney(Number(quote.quoted_amount))}</span>
                {quote.is_selected ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => selectQuote(quote.id, r.id, Number(quote.quoted_amount))}>Select</Button>}
              </div>
            ))}
            <Button size="sm" variant="outline" className="h-7 mt-1" onClick={() => setQOpen(r.id)}>+ Add Quote</Button>
          </div>
        );
      } },
  ];

  const [rows, setRows] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    request_no: `TM-${Date.now().toString().slice(-6)}`,
    category: "classroom", item_name: "", quantity: 1, estimated_cost: 0,
    requested_by: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
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
    for (const row of qs ?? []) { if (!row.request_id) continue; (grouped[row.request_id] ||= []).push(row); }
    setQuotes(grouped);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!f.item_name.trim()) return toast.error("Item is required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("teaching_material_requests").insert({
      user_id: u.user.id, ...f, quantity: Number(f.quantity), estimated_cost: Number(f.estimated_cost),
    });
    setSaving(false);
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

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="inventory"
          icon={BookOpen}
          title="Material Request"
          subtitle="Classroom materials & learning equipment"
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={saving}
          saveLabel="Submit for approval"
        >
          <SifoFormSection title="Request details">
            <SifoField label="Request #"><Input value={f.request_no} onChange={e => setF({ ...f, request_no: e.target.value })} /></SifoField>
            <SifoField label="Category">
              <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Classroom Materials</SelectItem>
                  <SelectItem value="equipment">Teaching Equipment</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Item" required wide><Input value={f.item_name} onChange={e => setF({ ...f, item_name: e.target.value })} placeholder="Exercise books, projector, ..." /></SifoField>
            <SifoField label="Quantity"><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></SifoField>
            <SifoField label="Estimated cost (K)"><Input type="number" value={f.estimated_cost} onChange={e => setF({ ...f, estimated_cost: e.target.value })} /></SifoField>
            <SifoField label="Requested by" wide><Input value={f.requested_by} onChange={e => setF({ ...f, requested_by: e.target.value })} placeholder="HOD / Teacher name" /></SifoField>
            <SifoField label="Notes" wide><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (qOpen) {
    const request = rows.find(r => r.id === qOpen);
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="inventory"
          icon={BookOpen}
          title="Add Supplier Quote"
          subtitle={request ? `For request ${request.request_no} — ${request.item_name}` : undefined}
          onCancel={() => setQOpen(null)}
          onSave={addQuote}
          saveLabel="Save quote"
        >
          <SifoFormSection title="Quote details">
            <SifoField label="Supplier name" wide><Input value={q.supplier_name} onChange={e => setQ({ ...q, supplier_name: e.target.value })} /></SifoField>
            <SifoField label="Quoted amount (K)"><Input type="number" value={q.quoted_amount} onChange={e => setQ({ ...q, quoted_amount: Number(e.target.value) })} /></SifoField>
            <SifoField label="Notes" wide><Textarea value={q.notes} onChange={e => setQ({ ...q, notes: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Teaching Materials</h1>
          <p className="text-sm text-muted-foreground">Classroom materials & learning equipment — 3-quote comparison before purchase.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="teaching-materials" title="Teaching Material Requests" />
          <Button size="sm" className="h-9" variant="save" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Request</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          tableId="teaching-materials"
          columns={requestColumns}
          data={rows}
          loading={loading}
          empty="No requests yet."
          totals={rs => ({ estimated_cost: fmtMoney(rs.reduce((s, r) => s + Number(r.estimated_cost || 0), 0)) })}
        />
      </Card>
    </div>
  );
}
