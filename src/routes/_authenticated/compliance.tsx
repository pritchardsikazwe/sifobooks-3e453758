import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, LogOut, Plus, Trash2, CheckCircle2, AlertCircle, Clock, Sparkles, ExternalLink, Calendar, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppNav } from "@/components/AppNav";
import { STATUTORY_BODIES, bodyByCode } from "@/lib/compliance-bodies";
import {
  PAYE_BANDS_MONTHLY, NAPSA, NHIMA, SDL, WCF, VAT, TURNOVER_TAX, WHT,
  INCOME_TAX, FILING_CALENDAR, PORTALS, ZAMBIA_TAX_YEAR,
} from "@/lib/zambia-tax";
import { toast } from "sonner";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

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

  const generateWholeYear = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const y = new Date().getFullYear();
    const rows: { user_id: string; body: string; obligation_type: string; period: string; due_date: string; status: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const period = `${y}-${String(m + 1).padStart(2, "0")}`;
      for (const b of STATUTORY_BODIES) {
        if (b.frequency !== "monthly") continue;
        const dd = new Date(y, m + 1, Math.min(b.dueDay, 28)).toISOString().slice(0, 10);
        for (const o of b.obligations) {
          rows.push({ user_id: u.user.id, body: b.code, obligation_type: o, period, due_date: dd, status: "upcoming" });
        }
      }
    }
    // Quarterly + annual
    for (const b of STATUTORY_BODIES) {
      if (b.frequency === "quarterly") {
        for (const q of [2, 5, 8, 11]) {
          const period = `${y}-Q${Math.floor(q / 3) + 1}`;
          const dd = new Date(y, q + 1, Math.min(b.dueDay, 28)).toISOString().slice(0, 10);
          for (const o of b.obligations) rows.push({ user_id: u.user.id, body: b.code, obligation_type: o, period, due_date: dd, status: "upcoming" });
        }
      } else if (b.frequency === "annual") {
        const dd = new Date(y, 11, Math.min(b.dueDay, 28)).toISOString().slice(0, 10);
        for (const o of b.obligations) rows.push({ user_id: u.user.id, body: b.code, obligation_type: o, period: String(y), due_date: dd, status: "upcoming" });
      }
    }
    const { error } = await supabase.from("compliance_obligations").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Generated ${rows.length} obligations for ${y}`);
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

  const obligationColumns: DTColumn<Obligation>[] = [
    { key: "body", header: "Body", cell: i => { const b = bodyByCode(i.body); return <Badge variant="outline" className={b?.color ?? ""}>{b?.name ?? i.body}</Badge>; } },
    { key: "obligation_type", header: "Obligation", cell: i => <span className="font-medium">{i.obligation_type}</span> },
    { key: "period", header: "Period", cell: i => <span className="text-muted-foreground">{i.period}</span> },
    { key: "due_date", header: "Due", cell: i => <span className="text-muted-foreground">{i.due_date}</span> },
    { key: "status", header: "Status", cell: i => (
        <Badge variant="outline" className={statusStyles[i.status]}>
          <span className="inline-flex items-center gap-1">{statusIcon[i.status]} {i.status}</span>
        </Badge>
      ) },
    { key: "amount", header: "Amount", align: "right", cell: i => i.amount != null ? <span className="font-medium">{money(Number(i.amount))}</span> : "—" },
    { key: "actions", header: "", sortable: false, cell: i => (
        <div className="text-right">
          {i.status !== "filed" && <Button variant="ghost" size="sm" onClick={() => markFiled(i.id)}>Mark filed</Button>}
          <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
        </div>
      ) },
  ];

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <NewObligationForm onCancel={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />
      </div>
    );
  }

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

        <Tabs defaultValue="obligations" className="mt-8">
          <TabsList>
            <TabsTrigger value="obligations">Obligations</TabsTrigger>
            <TabsTrigger value="rates">Zambia Rates ({ZAMBIA_TAX_YEAR})</TabsTrigger>
            <TabsTrigger value="calendar">Filing Calendar</TabsTrigger>
            <TabsTrigger value="portals">Filing Portals</TabsTrigger>
            <TabsTrigger value="bodies">Statutory Bodies</TabsTrigger>
          </TabsList>

          <TabsContent value="obligations">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Obligations</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={generateThisMonth}><Sparkles className="h-4 w-4" /> This month</Button>
                  <Button variant="outline" onClick={generateWholeYear}><Calendar className="h-4 w-4" /> Whole year</Button>
                  <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add obligation</Button>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <DataTable
                  tableId="compliance-obligations"
                  columns={obligationColumns}
                  data={withDerivedStatus}
                  loading={loading}
                  empty={'No obligations yet. Use "This month" or "Whole year" to seed filings.'}
                  totals={rows => ({ amount: money(rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)) })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-emerald-600" /> PAYE monthly bands</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Band</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {PAYE_BANDS_MONTHLY.map(b => (
                      <TableRow key={b.label}><TableCell>{b.label}</TableCell><TableCell className="text-right font-semibold">{(b.rate * 100).toFixed(0)}%</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <RateCard title="NAPSA (pension)" rows={[
                ["Employee", `${(NAPSA.employeeRate * 100).toFixed(1)}%`],
                ["Employer", `${(NAPSA.employerRate * 100).toFixed(1)}%`],
                ["Monthly ceiling", `K ${NAPSA.monthlyCeiling.toLocaleString()}`],
                ["Due", "10th of following month"],
              ]} />
              <RateCard title="NHIMA (health)" rows={[
                ["Employee", `${(NHIMA.employeeRate * 100).toFixed(1)}%`],
                ["Employer", `${(NHIMA.employerRate * 100).toFixed(1)}%`],
                ["Base", "Basic pay"],
                ["Due", "10th of following month"],
              ]} />
              <RateCard title="Skills Development Levy" rows={[
                ["Rate", `${(SDL.rate * 100).toFixed(2)}%`],
                ["Base", SDL.base],
                ["Body", "TEVETA / ZRA"],
                ["Due", "20th of following month"],
              ]} />
              <RateCard title="Workers' Compensation" rows={[
                ["Default rate", `${(WCF.rateDefault * 100).toFixed(1)}%`],
                ["Base", WCF.base],
                ["Note", WCF.note],
                ["Body", "WCFCB"],
              ]} />
              <RateCard title="VAT" rows={[
                ["Standard", `${(VAT.standard * 100).toFixed(0)}%`],
                ["Zero-rated", "0%"],
                ["Exempt", "N/A"],
                ["Return", "VAT 3 · monthly · 18th"],
              ]} />
              <RateCard title="Turnover Tax" rows={[
                ["Rate", `${(TURNOVER_TAX.rate * 100).toFixed(0)}%`],
                ["Annual threshold", `K ${TURNOVER_TAX.thresholdAnnual.toLocaleString()}`],
                ["Eligibility", TURNOVER_TAX.note],
                ["Due", "14th of following month"],
              ]} />
              <RateCard title="Withholding Tax" rows={[
                ["Rent", `${(WHT.rent * 100).toFixed(0)}%`],
                ["Dividends", `${(WHT.dividends * 100).toFixed(0)}%`],
                ["Interest / Mgmt / Royalties", `${(WHT.interest * 100).toFixed(0)}%`],
                ["Commissions / Public entertainers", `${(WHT.commissions * 100).toFixed(0)}%`],
              ]} />
              <RateCard title="Company Income Tax" rows={[
                ["Standard", `${(INCOME_TAX.companyStandard * 100).toFixed(0)}%`],
                ["Mining", `${(INCOME_TAX.mining * 100).toFixed(0)}%`],
                ["Mobile operators", `${(INCOME_TAX.mobileOperators * 100).toFixed(0)}%`],
                ["Farming / Non-trad. exports", `${(INCOME_TAX.farming * 100).toFixed(0)}% / ${(INCOME_TAX.exportOfNonTraditional * 100).toFixed(0)}%`],
              ]} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Rates are indicative and configurable. Always verify against current ZRA, NAPSA, NHIMA, TEVETA and WCFCB guidance.
            </p>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Statutory filing calendar</CardTitle></CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader><TableRow><TableHead className="pl-6">Body</TableHead><TableHead>Obligation</TableHead><TableHead>Frequency</TableHead><TableHead className="text-right">Due day</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {FILING_CALENDAR.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Badge variant="outline">{r.body}</Badge></TableCell>
                        <TableCell className="font-medium">{r.obligation}</TableCell>
                        <TableCell className="text-muted-foreground">{r.frequency}</TableCell>
                        <TableCell className="text-right">{r.dueDay}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portals">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PORTALS.map(p => (
                <Card key={p.name}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.purpose}</div>
                      </div>
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-800" aria-label={`Open ${p.name}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="mt-2 truncate text-[11px] text-muted-foreground">{p.url}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bodies">
            <Card>
              <CardHeader><CardTitle className="text-base">Statutory bodies covered</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {STATUTORY_BODIES.map(b => (
                    <Badge key={b.code} variant="outline" className={b.color} title={b.full}>{b.name} — {b.full}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function RateCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <dl className="text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b py-1.5 last:border-0">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
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

function NewObligationForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [body, setBody] = useState(STATUTORY_BODIES[0].code);
  const [obligation, setObligation] = useState(STATUTORY_BODIES[0].obligations[0]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [due, setDue] = useState(today);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyObj = bodyByCode(body);

  const submit = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("compliance_obligations").insert({
      user_id: u.user.id, body, obligation_type: obligation, period, due_date: due, status: "upcoming",
      amount: amount ? Number(amount) : null, notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Obligation added");
    onCreated();
  };

  return (
    <SifoFormPage
      module="compliance"
      icon={ShieldCheck}
      title="New statutory obligation"
      subtitle="Track a filing across a statutory body"
      onCancel={onCancel}
      onSave={submit}
      saving={saving}
      saveLabel="Add"
    >
      <SifoFormSection title="Obligation details">
        <SifoField label="Statutory body" wide>
          <Select value={body} onValueChange={v => { setBody(v); const b = bodyByCode(v); if (b) setObligation(b.obligations[0]); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUTORY_BODIES.map(b => <SelectItem key={b.code} value={b.code}>{b.name} — {b.full}</SelectItem>)}</SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Obligation" wide>
          <Select value={obligation} onValueChange={setObligation}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{bodyObj?.obligations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </SifoField>
        <SifoField label="Period"><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-07 or 2026-Q3" /></SifoField>
        <SifoField label="Due date"><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></SifoField>
        <SifoField label="Amount (optional)"><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></SifoField>
        <SifoField label="Notes" wide><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference, filing portal, etc." /></SifoField>
      </SifoFormSection>
    </SifoFormPage>
  );
}
