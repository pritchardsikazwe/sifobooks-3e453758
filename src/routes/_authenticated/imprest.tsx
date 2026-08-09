import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/imprest")({
  head: () => ({ meta: [{ title: "Imprest Register — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><Page /></RequireModule>,
});

type Mode = "new" | "retire" | null;

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [saving, setSaving] = useState(false);
  const [retireId, setRetireId] = useState<string | null>(null);
  const [retire, setRetire] = useState({ amount_spent: 0, retirement_date: new Date().toISOString().slice(0, 10) });
  const [f, setF] = useState<any>({
    imprest_no: `IMP-${Date.now().toString().slice(-6)}`,
    officer_name: "", purpose: "", amount_issued: 0,
    date_issued: new Date().toISOString().slice(0, 10), notes: "",
  });

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("imprest_register").select("*").eq("user_id", u.user.id).order("date_issued", { ascending: false });
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("imprest_register").insert({
      user_id: u.user.id, ...f, amount_issued: Number(f.amount_issued),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Imprest issued — posted to Advances / Bank");
    setMode(null); load();
  };

  const doRetire = async () => {
    if (!retireId) return;
    const row = rows.find(r => r.id === retireId);
    if (!row) return;
    const spent = Number(retire.amount_spent);
    const returned = Number(row.amount_issued) - spent;
    setSaving(true);
    const { error } = await supabase.from("imprest_register").update({
      amount_spent: spent, amount_returned: returned,
      retirement_date: retire.retirement_date, status: "retired",
    }).eq("id", retireId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Retired — K${returned.toFixed(2)} returned`);
    setMode(null); setRetireId(null); load();
  };

  const exportRows = rows.map(r => ({
    ImprestNo: r.imprest_no, Officer: r.officer_name, Purpose: r.purpose ?? "",
    Issued: r.amount_issued, Spent: r.amount_spent, Returned: r.amount_returned,
    DateIssued: r.date_issued, RetirementDate: r.retirement_date ?? "", Status: r.status,
  }));

  const retiringRow = rows.find(r => r.id === retireId);

  if (mode === "new") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="banking" icon={Wallet} title="Issue Imprest" subtitle="Petty cash issued to an officer."
          onCancel={() => setMode(null)} onSave={save} saving={saving} saveLabel="Issue & post">
          <SifoFormSection title="Details">
            <SifoField label="Imprest #"><Input value={f.imprest_no} onChange={e => setF({ ...f, imprest_no: e.target.value })} /></SifoField>
            <SifoField label="Date issued"><Input type="date" value={f.date_issued} onChange={e => setF({ ...f, date_issued: e.target.value })} /></SifoField>
            <SifoField label="Officer" wide><Input value={f.officer_name} onChange={e => setF({ ...f, officer_name: e.target.value })} /></SifoField>
            <SifoField label="Purpose" wide><Textarea value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></SifoField>
            <SifoField label="Amount (K)"><Input type="number" value={f.amount_issued} onChange={e => setF({ ...f, amount_issued: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (mode === "retire") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="banking" icon={Wallet} title="Retire Imprest" subtitle={retiringRow ? `${retiringRow.imprest_no} — ${retiringRow.officer_name}` : undefined}
          onCancel={() => { setMode(null); setRetireId(null); }} onSave={doRetire} saving={saving} saveLabel="Retire">
          <SifoFormSection title="Details">
            <SifoField label="Amount spent (K)"><Input type="number" value={retire.amount_spent} onChange={e => setRetire({ ...retire, amount_spent: Number(e.target.value) })} /></SifoField>
            <SifoField label="Retirement date"><Input type="date" value={retire.retirement_date} onChange={e => setRetire({ ...retire, retirement_date: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> Imprest Register</h1>
          <p className="text-sm text-muted-foreground">Petty cash issued to officers with retirement tracking.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="imprest-register" title="Imprest Register" />
          <Button size="sm" className="h-9" onClick={() => setMode("new")}><Plus className="h-4 w-4 mr-1" /> Issue Imprest</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>Officer</TableHead><TableHead>Purpose</TableHead>
              <TableHead className="text-right">Issued</TableHead><TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Returned</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.imprest_no}</TableCell>
                  <TableCell className="font-medium">{r.officer_name}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{r.purpose ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmtMoney(Number(r.amount_issued))}</TableCell>
                  <TableCell className="text-right">{fmtMoney(Number(r.amount_spent))}</TableCell>
                  <TableCell className="text-right">{fmtMoney(Number(r.amount_returned))}</TableCell>
                  <TableCell><Badge variant={r.status === "retired" ? "outline" : "default"}>{r.status}</Badge></TableCell>
                  <TableCell>{r.status !== "retired" && <Button size="sm" variant="outline" onClick={() => { setRetireId(r.id); setRetire({ amount_spent: r.amount_issued, retirement_date: new Date().toISOString().slice(0, 10) }); setMode("retire"); }}>Retire</Button>}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No imprest issued yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        }
      </Card>
    </div>
  );
}
