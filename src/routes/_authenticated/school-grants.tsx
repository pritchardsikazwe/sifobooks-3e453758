import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";

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
    const { error } = await supabase.from("school_grants").insert({
      user_id: u.user.id, ...f,
      approved_amount: Number(f.approved_amount) || 0,
      received_amount: Number(f.received_amount) || 0,
    });
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

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6 text-emerald-600" /> School Grants</h1>
          <p className="text-sm text-muted-foreground">Ministry, CDF, donor and project grants — auto-posted to bank & Grant Income.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="school-grants" title="School Grants" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New Grant</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Record a Grant</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Grant name</Label><Input value={f.grant_name} onChange={e => setF({ ...f, grant_name: e.target.value })} /></div>
                <div><Label>Reference #</Label><Input value={f.grant_ref} onChange={e => setF({ ...f, grant_ref: e.target.value })} /></div>
                <div>
                  <Label>Source</Label>
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
                </div>
                <div><Label>Funding institution</Label><Input value={f.funding_institution} onChange={e => setF({ ...f, funding_institution: e.target.value })} /></div>
                <div><Label>Approved amount (K)</Label><Input type="number" value={f.approved_amount} onChange={e => setF({ ...f, approved_amount: e.target.value })} /></div>
                <div><Label>Received amount (K)</Label><Input type="number" value={f.received_amount} onChange={e => setF({ ...f, received_amount: e.target.value })} /></div>
                <div>
                  <Label>Quarter</Label>
                  <Select value={f.quarter} onValueChange={v => setF({ ...f, quarter: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Q1","Q2","Q3","Q4"].map(q=><SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Fiscal year</Label><Input type="number" value={f.fiscal_year} onChange={e => setF({ ...f, fiscal_year: Number(e.target.value) })} /></div>
                <div><Label>Date received</Label><Input type="date" value={f.date_received} onChange={e => setF({ ...f, date_received: e.target.value })} /></div>
                <div className="col-span-2"><Label>Purpose</Label><Textarea value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></div>
              </div>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Save & Post to Cashbook</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ref</TableHead><TableHead>Name</TableHead><TableHead>Source</TableHead>
              <TableHead>Quarter</TableHead><TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Received</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.grant_ref ?? "—"}</TableCell>
                  <TableCell className="font-medium">{r.grant_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                  <TableCell>{r.quarter} {r.fiscal_year}</TableCell>
                  <TableCell className="text-right">{fmtMoney(Number(r.approved_amount))}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">{fmtMoney(Number(r.received_amount))}</TableCell>
                  <TableCell>{r.date_received ?? "—"}</TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No grants recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        }
      </Card>
    </div>
  );
}
