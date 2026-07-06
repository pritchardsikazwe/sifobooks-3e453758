import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, LogOut, Plus, Trash2, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppNav } from "@/components/AppNav";
import { STATUTORY_BODIES, bodyByCode } from "@/lib/compliance-bodies";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({
    meta: [
      { title: "Statutory Compliance — SifoBooks" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompliancePage,
});

type Obligation = {
  id: string; body: string; obligation_type: string; period: string;
  due_date: string; status: "upcoming" | "filed" | "overdue";
  amount: number | null; reference: string | null; notes: string | null;
};

const statusStyles: Record<Obligation["status"], string> = {
  upcoming: "bg-blue-100 text-blue-800 border-blue-200",
  filed:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  overdue:  "bg-red-100 text-red-800 border-red-200",
};

const statusIcon = { upcoming: <Clock className="h-3 w-3" />, filed: <CheckCircle2 className="h-3 w-3" />, overdue: <AlertCircle className="h-3 w-3" /> };

function CompliancePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [businessName, setBusinessName] = useState("");
  const [open, setOpen] = useState(false);

  const money = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = async () => {
    const { data, error } = await supabase.from("compliance_obligations").select("*").order("due_date", { ascending: true });
    if (error) return toast.error(error.message);
    setItems((data as Obligation[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("onboarded, currency, business_name").eq("id", u.user.id).maybeSingle();
      if (!prof?.onboarded) { navigate({ to: "/onboarding" }); return; }
      if (prof.currency) setCurrency(prof.currency);
      if (prof.business_name) setBusinessName(prof.business_name);
      await load();
      setLoading(false);
    })();
  }, [navigate]);

  // auto-mark overdue for display
  const today = new Date().toISOString().slice(0, 10);
  const withDerivedStatus = items.map(i => i.status !== "filed" && i.due_date < today ? { ...i, status: "overdue" as const } : i);

  const counts = useMemo(() => {
    const c = { upcoming: 0, filed: 0, overdue: 0, total: withDerivedStatus.length, amount: 0 };
    withDerivedStatus.forEach(i => { c[i.status]++; c.amount += Number(i.amount ?? 0); });
    return c;
  }, [withDerivedStatus]);

  const generateThisMonth = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth();
    const period = `${y}-${String(m + 1).padStart(2, "0")}`;
    const rows: {
      user_id: string; body: string; obligation_type: string;
      period: string; due_date: string; status: string;
    }[] = [];
    for (const b of STATUTORY_BODIES) {
      if (b.frequency !== "monthly") continue;
      const dd = new Date(y, m + 1, Math.min(b.dueDay, 28)).toISOString().slice(0, 10);
      for (const o of b.obligations) {
        rows.push({ user_id: u.user.id, body: b.code, obligation_type: o, period, due_date: dd, status: "upcoming" });
      }
    }
    const { error } = await supabase.from("compliance_obligations").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Generated ${rows.length} obligations for ${period}`);
    await load();
  };

  const markFiled = async (id: string) => {
    const { error } = await supabase.from("compliance_obligations").update({ status: "filed" }).eq("id", id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "filed" } : i));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("compliance_obligations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{businessName || "Statutory Compliance"}</h1>
              <p className="text-xs text-muted-foreground">Track filings across {STATUTORY_BODIES.length} statutory bodies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Upcoming" value={String(counts.upcoming)} tint="bg-blue-100 text-blue-700" icon={<Clock className="h-4 w-4" />} />
          <Stat label="Filed" value={String(counts.filed)} tint="bg-emerald-100 text-emerald-700" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Stat label="Overdue" value={String(counts.overdue)} tint="bg-red-100 text-red-700" icon={<AlertCircle className="h-4 w-4" />} />
          <Stat label="Est. liability" value={money(counts.amount)} tint="bg-primary/10 text-primary" icon={<ShieldCheck className="h-4 w-4" />} />
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Statutory bodies covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {STATUTORY_BODIES.map(b => (
                <Badge key={b.code} variant="outline" className={b.color} title={b.full}>{b.name} — {b.full}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Obligations</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={generateThisMonth}><Sparkles className="h-4 w-4" /> Auto-generate this month</Button>
              <NewObligationDialog open={open} setOpen={setOpen} onCreated={load} />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Body</TableHead>
                  <TableHead>Obligation</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-40 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : withDerivedStatus.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No obligations yet. Use "Auto-generate this month" to seed monthly filings.</TableCell></TableRow>
                ) : withDerivedStatus.map(i => {
                  const b = bodyByCode(i.body);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="pl-6"><Badge variant="outline" className={b?.color ?? ""}>{b?.name ?? i.body}</Badge></TableCell>
                      <TableCell className="font-medium">{i.obligation_type}</TableCell>
                      <TableCell className="text-muted-foreground">{i.period}</TableCell>
                      <TableCell className="text-muted-foreground">{i.due_date}</TableCell>
                      <TableCell><Badge variant="outline" className={statusStyles[i.status]}><span className="inline-flex items-center gap-1">{statusIcon[i.status]} {i.status}</span></Badge></TableCell>
                      <TableCell className="text-right font-medium">{i.amount != null ? money(Number(i.amount)) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {i.status !== "filed" && <Button variant="ghost" size="sm" onClick={() => markFiled(i.id)}>Mark filed</Button>}
                        <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${tint}`}>{icon}</span>
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewObligationDialog({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [body, setBody] = useState(STATUTORY_BODIES[0].code);
  const [obligation, setObligation] = useState(STATUTORY_BODIES[0].obligations[0]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [due, setDue] = useState(today);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const bodyObj = bodyByCode(body);

  const submit = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("compliance_obligations").insert({
      user_id: u.user.id, body, obligation_type: obligation, period, due_date: due, status: "upcoming",
      amount: amount ? Number(amount) : null, notes: notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Obligation added");
    setOpen(false); setAmount(""); setNotes("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add obligation</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New statutory obligation</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Statutory body</Label>
              <Select value={body} onValueChange={v => { setBody(v); const b = bodyByCode(v); if (b) setObligation(b.obligations[0]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTORY_BODIES.map(b => <SelectItem key={b.code} value={b.code}>{b.name} — {b.full}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Obligation</Label>
              <Select value={obligation} onValueChange={setObligation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{bodyObj?.obligations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Period</Label><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-07 or 2026-Q3" /></div>
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Amount (optional)</Label><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference, filing portal, etc." /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
