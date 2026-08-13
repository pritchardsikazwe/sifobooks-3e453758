import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/school-grants")({
  head: () => ({ meta: [{ title: "School Grants — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><Page /></RequireModule>,
});

type Grant = any;

function Page() {
  const [rows, setRows] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    grant_name: "", grant_ref: "", source: "ministry", funding_institution: "",
    approved_amount: 0, received_amount: 0, quarter: "Q1", fiscal_year: new Date().getFullYear(),
    date_received: new Date().toISOString().slice(0, 10), purpose: "", notes: "",
  });

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("school_grants").select("*").eq("user_id", u.user.id).order("date_received", { ascending: false });
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("school_grants").insert({
      user_id: u.user.id, ...f,
      approved_amount: Number(f.approved_amount) || 0,
      received_amount: Number(f.received_amount) || 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Grant recorded — cashbook updated");
    setOpen(false); load();
  };

  const exportRows = rows.map(r => ({
    Ref: r.grant_ref ?? "", Name: r.grant_name, Source: r.source,
    Institution: r.funding_institution ?? "", Approved: r.approved_amount,
    Received: r.received_amount, Quarter: r.quarter, Year: r.fiscal_year,
    Date: r.date_received, Purpose: r.purpose ?? "", Status: r.status,
  }));

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="accounting" icon={Landmark} title="Record a Grant" subtitle="Ministry, CDF, donor and project grants — auto-posted to bank & Grant Income."
          onCancel={() => setOpen(false)} onSave={save} saving={saving} saveLabel="Save & post to cashbook">
          <SifoFormSection title="Details">
            <SifoField label="Grant name"><Input value={f.grant_name} onChange={e => setF({ ...f, grant_name: e.target.value })} /></SifoField>
            <SifoField label="Reference #"><Input value={f.grant_ref} onChange={e => setF({ ...f, grant_ref: e.target.value })} /></SifoField>
            <SifoField label="Source">
              <Select value={f.source} onValueChange={v => setF({ ...f, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ministry">Ministry of Education</SelectItem>
                  <SelectItem value="finance">Ministry of Finance</SelectItem>
                  <SelectItem value="cdf">CDF</SelectItem>
                  <SelectItem value="donor">Donor</SelectItem>
                  <SelectItem value="ngo">NGO</SelectItem>
                  <SelectItem value="project">School Project</SelectItem>
                  <SelectItem value="tuckshop">Tuckshop</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Funding institution"><Input value={f.funding_institution} onChange={e => setF({ ...f, funding_institution: e.target.value })} /></SifoField>
            <SifoField label="Approved amount (K)"><Input type="number" value={f.approved_amount} onChange={e => setF({ ...f, approved_amount: e.target.value })} /></SifoField>
            <SifoField label="Received amount (K)"><Input type="number" value={f.received_amount} onChange={e => setF({ ...f, received_amount: e.target.value })} /></SifoField>
            <SifoField label="Quarter">
              <Select value={f.quarter} onValueChange={v => setF({ ...f, quarter: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Q1", "Q2", "Q3", "Q4"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Fiscal year"><Input type="number" value={f.fiscal_year} onChange={e => setF({ ...f, fiscal_year: Number(e.target.value) })} /></SifoField>
            <SifoField label="Date received"><Input type="date" value={f.date_received} onChange={e => setF({ ...f, date_received: e.target.value })} /></SifoField>
            <SifoField label="Purpose" wide><Textarea value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  const grantColumns: DTColumn<Grant>[] = [
    { key: "grant_ref", header: "Ref", sticky: true, cell: (r) => <span className="font-mono text-xs">{r.grant_ref ?? "—"}</span> },
    { key: "grant_name", header: "Name", cell: (r) => <span className="font-medium">{r.grant_name}</span> },
    { key: "source", header: "Source", cell: (r) => <Badge variant="outline">{r.source}</Badge> },
    { key: "quarter", header: "Quarter", cell: (r) => `${r.quarter} ${r.fiscal_year}` },
    { key: "approved_amount", header: "Approved", align: "right", cell: (r) => fmtMoney(Number(r.approved_amount)) },
    { key: "received_amount", header: "Received", align: "right", cell: (r) => <span className="font-semibold text-emerald-700">{fmtMoney(Number(r.received_amount))}</span> },
    { key: "date_received", header: "Date", cell: (r) => r.date_received ?? "—" },
    { key: "status", header: "Status", cell: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6 text-primary" /> School Grants</h1>
          <p className="text-sm text-muted-foreground">Ministry, CDF, donor and project grants — auto-posted to bank & Grant Income.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="school-grants" title="School Grants" />
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Grant</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          tableId="school-grants"
          columns={grantColumns}
          data={rows}
          loading={loading}
          empty="No grants recorded yet."
          searchPlaceholder="Search grants…"
          totals={(list) => ({
            approved_amount: fmtMoney(list.reduce((s, r) => s + Number(r.approved_amount || 0), 0)),
            received_amount: fmtMoney(list.reduce((s, r) => s + Number(r.received_amount || 0), 0)),
          })}
        />
      </Card>
    </div>
  );
}
