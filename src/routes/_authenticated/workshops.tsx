import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, GraduationCap, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/workshops")({
  head: () => ({ meta: [{ title: "Workshops & Allowances — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><Page /></RequireModule>,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [aOpen, setAOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    workshop_name: "", start_date: new Date().toISOString().slice(0, 10), end_date: "",
    venue: "", participants_count: 0, budget: 0, notes: "",
  });
  const [a, setA] = useState<any>({
    recipient_name: "", role: "participant", allowance_type: "lunch", amount: 0,
    paid: true, paid_date: new Date().toISOString().slice(0, 10), payment_method: "bank",
  });

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("workshops").select("*").eq("user_id", u.user.id).order("start_date", { ascending: false });
    setRows((data ?? []) as any);
    const { data: al } = await supabase.from("workshop_allowances").select("*").eq("user_id", u.user.id);
    const grouped: Record<string, any[]> = {};
    for (const row of al ?? []) { if (!row.workshop_id) continue; (grouped[row.workshop_id] ||= []).push(row); }
    setAllowances(grouped);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = { user_id: u.user.id, ...f, budget: Number(f.budget), participants_count: Number(f.participants_count) };
    if (!payload.end_date) delete (payload as any).end_date;
    setSaving(true);
    const { error } = await supabase.from("workshops").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Workshop created"); setOpen(false); load();
  };

  const addAllowance = async () => {
    if (!aOpen) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("workshop_allowances").insert({
      user_id: u.user.id, workshop_id: aOpen, ...a, amount: Number(a.amount),
    });
    if (error) return toast.error(error.message);
    toast.success("Allowance recorded — posted to GL");
    setA({ ...a, recipient_name: "", amount: 0 });
    setAOpen(null);
    load();
  };

  const exportRows = rows.map(r => ({
    Workshop: r.workshop_name, Start: r.start_date, End: r.end_date ?? "",
    Venue: r.venue ?? "", Participants: r.participants_count, Budget: r.budget,
    Spent: r.actual_spent, Status: r.status,
  }));

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="inventory"
          icon={GraduationCap}
          title="Workshop"
          subtitle="Training register with per-recipient allowance payments"
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={saving}
          saveLabel="Save workshop"
        >
          <SifoFormSection title="Workshop details">
            <SifoField label="Name" wide><Input value={f.workshop_name} onChange={e => setF({ ...f, workshop_name: e.target.value })} /></SifoField>
            <SifoField label="Start"><Input type="date" value={f.start_date} onChange={e => setF({ ...f, start_date: e.target.value })} /></SifoField>
            <SifoField label="End"><Input type="date" value={f.end_date} onChange={e => setF({ ...f, end_date: e.target.value })} /></SifoField>
            <SifoField label="Venue" wide><Input value={f.venue} onChange={e => setF({ ...f, venue: e.target.value })} /></SifoField>
            <SifoField label="Participants"><Input type="number" value={f.participants_count} onChange={e => setF({ ...f, participants_count: e.target.value })} /></SifoField>
            <SifoField label="Budget (K)"><Input type="number" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (aOpen) {
    const workshop = rows.find(r => r.id === aOpen);
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="inventory"
          icon={Users}
          title="Pay Allowance"
          subtitle={workshop ? `For ${workshop.workshop_name}` : undefined}
          onCancel={() => setAOpen(null)}
          onSave={addAllowance}
          saveLabel="Pay & post"
        >
          <SifoFormSection title="Allowance details">
            <SifoField label="Recipient" wide><Input value={a.recipient_name} onChange={e => setA({ ...a, recipient_name: e.target.value })} /></SifoField>
            <SifoField label="Role">
              <Select value={a.role} onValueChange={v => setA({ ...a, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facilitator">Facilitator</SelectItem>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="coordinator">Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Allowance type">
              <Select value={a.allowance_type} onValueChange={v => setA({ ...a, allowance_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="facilitation">Facilitation fee</SelectItem>
                  <SelectItem value="sitting">Sitting</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Amount (K)"><Input type="number" value={a.amount} onChange={e => setA({ ...a, amount: e.target.value })} /></SifoField>
            <SifoField label="Payment method">
              <Select value={a.payment_method} onValueChange={v => setA({ ...a, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile">Mobile money</SelectItem>
                </SelectContent>
              </Select>
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" /> Workshops & Allowances</h1>
          <p className="text-sm text-muted-foreground">Training register with per-recipient allowance payments auto-posted to GL.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="workshops" title="Workshops" />
          <Button size="sm" className="h-9" variant="save" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Workshop</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Workshop</TableHead><TableHead>Dates</TableHead><TableHead>Venue</TableHead>
              <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spent</TableHead>
              <TableHead>Allowances</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => {
                const al = allowances[r.id] || [];
                const paidTotal = al.filter(x => x.paid).reduce((s, x) => s + Number(x.amount), 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.workshop_name}<div className="text-xs text-muted-foreground">{r.participants_count} participants</div></TableCell>
                    <TableCell className="text-xs">{r.start_date} → {r.end_date ?? "—"}</TableCell>
                    <TableCell>{r.venue ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(r.budget))}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(paidTotal)}</TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground mb-1"><Users className="h-3 w-3 inline" /> {al.length} recipients</div>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setAOpen(r.id)}>+ Add Allowance</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No workshops yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        }
      </Card>
    </div>
  );
}
