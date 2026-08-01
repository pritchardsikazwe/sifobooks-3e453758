import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Banknote, Loader2, Plus, FileText, Download, Wand2, Calculator, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, monthName } from "@/lib/format";
import { computePayslip, calcPaye, DEFAULT_PAYE_BANDS, type EarningLine, type DeductionLine } from "@/lib/payroll";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({ meta: [{ title: "Payroll — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PayrollPage,
});

type Run = {
  id: string; user_id: string; run_number: string;
  period_month: number; period_year: number; pay_date: string | null; status: string;
  total_gross: number | null; total_paye: number | null; total_napsa: number | null;
  total_nhima: number | null; total_net: number | null; notes: string | null;
};
type Employee = {
  id: string; first_name: string; last_name: string; employee_code: string | null;
  basic_salary: number | null; napsa_number: string | null; national_id: string | null;
  bank_name: string | null; bank_account: string | null; status: string | null;
  position_id: string | null;
};
type Slip = {
  id: string; user_id: string; payroll_run_id: string; employee_id: string;
  basic_salary: number | null; allowances: number | null; overtime: number | null;
  gross_pay: number | null; paye: number | null; napsa: number | null; nhima: number | null;
  other_deductions: number | null; net_pay: number | null;
  earnings: EarningLine[]; deductions: DeductionLine[];
  ytd_taxable: number | null; ytd_paye: number | null; ytd_napsa: number | null;
  loan_balance: number | null; days_worked: number | null; overtime_hours: number | null;
  notes: string | null;
};
type Company = {
  name: string; address: string | null; city: string | null; country: string | null;
  phone: string | null; email: string | null; logo_url: string | null; base_currency: string;
  tpin: string | null; payslip_header: string | null; payslip_footer: string | null;
};

function PayrollPage() {
  const [userId, setUserId] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("runs");
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    setUserId(u.user.id);
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("companies").select("name,address,city,country,phone,email,logo_url,base_currency,tpin,payslip_header,payslip_footer").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("payroll_runs").select("*").eq("user_id", u.user.id).order("period_year", { ascending: false }).order("period_month", { ascending: false }),
    ]);
    if (c) setCompany(c as Company);
    setRuns((r ?? []) as Run[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2"><Banknote className="h-6 w-6 text-emerald-600" /> Payroll</h1>
          <p className="text-sm text-slate-500 mt-1">Zambian PAYE, NAPSA and NHIMA computed automatically. Generate a monthly run and issue payslips per employee.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="generate"><Wand2 className="h-3.5 w-3.5 mr-1" /> Generate</TabsTrigger>
          <TabsTrigger value="calc"><Calculator className="h-3.5 w-3.5 mr-1" /> PAYE Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Payroll runs</CardTitle><CardDescription>All monthly payroll runs.</CardDescription></CardHeader>
            <CardContent>
              {loading ? <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                : runs.length === 0 ? <div className="py-8 text-center text-slate-400">No runs yet. Use the Generate tab to create your first monthly run.</div>
                : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Run #</TableHead><TableHead>Period</TableHead><TableHead>Pay date</TableHead><TableHead>Status</TableHead>
                        <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">PAYE</TableHead>
                        <TableHead className="text-right">NAPSA</TableHead><TableHead className="text-right">Net</TableHead><TableHead />
                      </TableRow></TableHeader>
                      <TableBody>
                        {runs.map(r => (
                          <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedRun(r)}>
                            <TableCell className="font-mono text-xs">{r.run_number}</TableCell>
                            <TableCell>{monthName(r.period_month)} {r.period_year}</TableCell>
                            <TableCell>{r.pay_date ?? "—"}</TableCell>
                            <TableCell><Badge variant={r.status === "paid" ? "default" : r.status === "approved" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                            <TableCell className="text-right">{fmtMoney(r.total_gross ?? 0)}</TableCell>
                            <TableCell className="text-right">{fmtMoney(r.total_paye ?? 0)}</TableCell>
                            <TableCell className="text-right">{fmtMoney(r.total_napsa ?? 0)}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtMoney(r.total_net ?? 0)}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedRun(r); }}>Open</Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </CardContent>
          </Card>

          {selectedRun && <RunDetail run={selectedRun} company={company} userId={userId} onClose={() => setSelectedRun(null)} onChanged={load} />}
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <GenerateRun userId={userId} onDone={() => { setTab("runs"); load(); }} />
        </TabsContent>

        <TabsContent value="calc" className="mt-4">
          <PayeCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================= Run detail with payslips ================= */

function RunDetail({ run, company, userId, onClose, onChanged }: { run: Run; company: Company | null; userId: string; onClose: () => void; onChanged: () => void }) {
  const [slips, setSlips] = useState<(Slip & { employee: Employee })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Slip & { employee: Employee }) | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payslips")
      .select("*, employee:employees(*)")
      .eq("payroll_run_id", run.id)
      .order("created_at", { ascending: true });
    setSlips((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [run.id]);

  const setStatus = async (status: string) => {
    const { error } = await supabase.from("payroll_runs").update({ status }).eq("id", run.id);
    if (error) toast.error(error.message);
    else { toast.success(`Run ${status}`); onChanged(); }
  };
  const remove = async () => {
    if (!confirm(`Delete run ${run.run_number} and all its payslips?`)) return;
    await supabase.from("payslips").delete().eq("payroll_run_id", run.id);
    const { error } = await supabase.from("payroll_runs").delete().eq("id", run.id);
    if (error) toast.error(error.message);
    else { toast.success("Run deleted"); onClose(); onChanged(); }
  };

  const downloadSlip = async (s: Slip & { employee: Employee }) => {
    const basic = Number(s.basic_salary ?? 0);
    const allowances = Number(s.allowances ?? 0);
    const gross = Number(s.gross_pay ?? 0);
    // Taxable ≈ gross minus non-taxable allowances (utility + housing exempt portion + transport)
    const nonTax = Number((s as any).utility_allowance ?? 0)
      + Number((s as any).transport_allowance ?? 0)
      + Math.min(Number((s as any).housing_allowance ?? 0), basic * 0.3);
    const taxable = Math.max(0, gross - nonTax);
    // Resolve logo storage path to a short-lived signed URL for the PDF fetcher
    let logoUrl: string | null = company?.logo_url ?? null;
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      const { data: signed } = await supabase.storage.from("company-logos").createSignedUrl(logoUrl, 300);
      logoUrl = signed?.signedUrl ?? null;
    }
    await downloadPayslipPdf({
      company: company ? { ...company, logo_url: logoUrl } : null,
      employee: {
        name: `${s.employee.first_name} ${s.employee.last_name}`,
        title: null, employee_code: s.employee.employee_code,
        napsa_number: s.employee.napsa_number, national_id: s.employee.national_id,
        tpin: (s.employee as any).tpin ?? null,
        bank_name: s.employee.bank_name, bank_account: s.employee.bank_account,
        hire_date: (s.employee as any).hire_date ?? null,
        department: null,
      },
      period: { monthName: monthName(run.period_month), year: run.period_year, payDate: run.pay_date },
      earnings: s.earnings ?? [], deductions: s.deductions ?? [],
      gross, taxable, net: Number(s.net_pay ?? 0),
      ytd: { taxable: Number(s.ytd_taxable ?? 0), paye: Number(s.ytd_paye ?? 0), napsa: Number(s.ytd_napsa ?? 0) },
      loan_balance: Number(s.loan_balance ?? 0),
      leave_balance: Number((s.employee as any).leave_days_entitlement ?? 0) - Number((s as any).leave_days_taken ?? 0),
      notes: s.notes,
      currency: company?.base_currency ?? "ZMW",
    }, `payslip-${run.run_number}-${s.employee.first_name}-${s.employee.last_name}.pdf`);
  };

  const exportRows = (): PayrollExportRow[] => slips.map(s => {
    const basic = Number(s.basic_salary ?? 0);
    const gross = Number(s.gross_pay ?? 0);
    const nonTax = Number((s as any).utility_allowance ?? 0)
      + Number((s as any).transport_allowance ?? 0)
      + Math.min(Number((s as any).housing_allowance ?? 0), basic * 0.3);
    return {
      employee_code: s.employee.employee_code,
      first_name: s.employee.first_name,
      last_name: s.employee.last_name,
      national_id: s.employee.national_id,
      tpin: (s.employee as any).tpin ?? null,
      napsa_number: s.employee.napsa_number,
      nhima_number: (s.employee as any).nhima_number ?? null,
      bank_name: s.employee.bank_name,
      bank_branch: (s.employee as any).bank_branch ?? null,
      bank_account: s.employee.bank_account,
      mobile_money_provider: (s.employee as any).mobile_money_provider ?? null,
      mobile_money_number: (s.employee as any).mobile_money_number ?? null,
      basic,
      gross,
      taxable: Math.max(0, gross - nonTax),
      paye: Number(s.paye ?? 0),
      napsa: Number(s.napsa ?? 0),
      nhima: Number(s.nhima ?? 0),
      net: Number(s.net_pay ?? 0),
    };
  });

  const period = `${String(run.period_month).padStart(2, "0")}/${run.period_year}`;
  const stem = `${run.run_number}-${run.period_year}-${String(run.period_month).padStart(2, "0")}`;
  const doExport = (kind: "paye" | "napsa" | "nhima" | "bank" | "momo") => {
    const rows = exportRows();
    if (!rows.length) return toast.error("No payslips to export");
    if (kind === "paye") downloadCsv(`ZRA-PAYE-${stem}.csv`, exportZraPaye(rows, period));
    if (kind === "napsa") downloadCsv(`NAPSA-iCare-${stem}.csv`, exportNapsaICare(rows, period));
    if (kind === "nhima") downloadCsv(`NHIMA-${stem}.csv`, exportNhima(rows, period));
    if (kind === "bank") downloadCsv(`Bank-Schedule-${stem}.csv`, exportBankSchedule(rows, {
      format: bankFormat, valueDate: run.pay_date ?? new Date().toISOString().slice(0, 10),
      narration: `SALARY ${period}`,
    }));
    if (kind === "momo") downloadCsv(`MobileMoney-${stem}.csv`, exportMobileMoney(rows, { provider: "mtn", reference: `SALARY ${period}` }));
    toast.success("Export downloaded");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Run {run.run_number} — {monthName(run.period_month)} {run.period_year}</CardTitle>
            <CardDescription>Payslips generated for this period.</CardDescription>
          </div>
          <div className="flex gap-2">
            {run.status === "draft" && <Button size="sm" variant="outline" onClick={() => setStatus("approved")}>Approve</Button>}
            {run.status === "approved" && <Button size="sm" onClick={() => setStatus("paid")}>Mark Paid</Button>}
            {run.status !== "draft" && <Button size="sm" variant="outline" onClick={() => setStatus("draft")}>Reopen</Button>}
            <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
            <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">Statutory returns</span>
          <Button size="sm" variant="outline" onClick={() => doExport("paye")}><Download className="h-3.5 w-3.5 mr-1" /> ZRA PAYE</Button>
          <Button size="sm" variant="outline" onClick={() => doExport("napsa")}><Download className="h-3.5 w-3.5 mr-1" /> NAPSA iCare</Button>
          <Button size="sm" variant="outline" onClick={() => doExport("nhima")}><Download className="h-3.5 w-3.5 mr-1" /> NHIMA</Button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <Select value={bankFormat} onValueChange={(v) => setBankFormat(v as any)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="generic">Generic bank</SelectItem>
              <SelectItem value="zanaco">Zanaco</SelectItem>
              <SelectItem value="stanbic">Stanbic</SelectItem>
              <SelectItem value="fnb">FNB</SelectItem>
              <SelectItem value="absa">Absa</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => doExport("bank")}><Download className="h-3.5 w-3.5 mr-1" /> Bank schedule</Button>
          <Button size="sm" variant="outline" onClick={() => doExport("momo")}><Download className="h-3.5 w-3.5 mr-1" /> Mobile money</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading payslips…</div>
          : slips.length === 0 ? <div className="py-6 text-center text-slate-400">No payslips.</div>
          : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead><TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">NAPSA</TableHead><TableHead className="text-right">NHIMA</TableHead>
                  <TableHead className="text-right">Net</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {slips.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.employee.first_name} {s.employee.last_name}</div>
                        <div className="text-xs text-slate-400">{s.employee.employee_code ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-right">{fmtMoney(s.basic_salary ?? 0)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(s.gross_pay ?? 0)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(s.paye ?? 0)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(s.napsa ?? 0)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(s.nhima ?? 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtMoney(s.net_pay ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><FileText className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadSlip(s)}><Download className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </CardContent>

      {editing && <EditSlipDialog slip={editing} run={run} userId={userId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChanged(); }} />}
    </Card>
  );
}

/* ================= Generate wizard ================= */

function GenerateRun({ userId, onDone }: { userId: string; onDone: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payDate, setPayDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [runNumber, setRunNumber] = useState(`PR-${year}-${String(month).padStart(2, "0")}`);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { basic: number; utility: number; housing: number; transport: number; overtime: number; shift: number; bonus: number; loan: number; advances: number; other_ded: number; include: boolean }>>({});

  useEffect(() => {
    setRunNumber(`PR-${year}-${String(month).padStart(2, "0")}`);
  }, [month, year]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("employees").select("*").eq("user_id", userId).eq("status", "active").order("first_name");
      const emps = (data ?? []) as Employee[];
      setEmployees(emps);

      // Pull timesheet / attendance for the selected month so overtime & bonus
      // auto-fill from live data. Standard hours per month assumed 176.
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
      const [{ data: timeRows }, { data: attRows }] = await Promise.all([
        supabase.from("time_entries").select("employee_id,hours,work_date,billable")
          .eq("user_id", userId).gte("work_date", monthStart).lte("work_date", monthEnd),
        supabase.from("attendance").select("employee_id,attendance_date,hours_worked,status")
          .eq("user_id", userId).gte("attendance_date", monthStart).lte("attendance_date", monthEnd),
      ]);
      const otHours: Record<string, number> = {};
      const holHours: Record<string, number> = {};
      const absent: Record<string, number> = {};
      const daysWorked: Record<string, number> = {};
      const STD_HOURS_PER_DAY = 8;
      const hourlyOf = (basic: number) => basic / 176;
      for (const t of timeRows ?? []) {
        const h = Number((t as any).hours ?? 0);
        const overtime = Math.max(0, h - STD_HOURS_PER_DAY);
        if (overtime > 0) otHours[(t as any).employee_id] = (otHours[(t as any).employee_id] ?? 0) + overtime;
      }
      for (const a of attRows ?? []) {
        const eid = (a as any).employee_id; if (!eid) continue;
        if ((a as any).status === "absent") absent[eid] = (absent[eid] ?? 0) + 1;
        else if ((a as any).status === "holiday") holHours[eid] = (holHours[eid] ?? 0) + Number((a as any).hours_worked ?? STD_HOURS_PER_DAY);
        else if ((a as any).status === "present" || (a as any).status === "late") daysWorked[eid] = (daysWorked[eid] ?? 0) + 1;
      }

      const seed: typeof overrides = {};
      for (const e of emps) {
        const basic = Number(e.basic_salary ?? 0);
        const hr = hourlyOf(basic);
        const ot = (otHours[e.id] ?? 0) * hr * 1.5;   // 1.5× for overtime
        const hol = (holHours[e.id] ?? 0) * hr * 2;    // 2× for holidays
        const absDays = absent[e.id] ?? 0;
        const absDeduction = absDays * STD_HOURS_PER_DAY * hr;
        seed[e.id] = {
          basic, utility: 0, housing: 0, transport: 0,
          overtime: +ot.toFixed(2), shift: +hol.toFixed(2), bonus: 0,
          loan: 0, advances: 0, other_ded: +absDeduction.toFixed(2), include: true,
        };
      }
      setOverrides(seed);
      setLoading(false);
    })();
  }, [userId, year, month]);

  const preview = useMemo(() => {
    return employees.map(e => {
      const o = overrides[e.id];
      if (!o?.include) return null;
      const c = computePayslip({
        basic: o.basic, utility_allowance: o.utility, housing_allowance: o.housing, transport_allowance: o.transport,
        overtime: o.overtime, shift_differential: o.shift, bonus: o.bonus,
        loan_recovery: o.loan, advances: o.advances,
        other_deductions: o.other_ded ? [{ label: "Other", amount: o.other_ded }] : [],
      });
      return { emp: e, o, c };
    }).filter(Boolean) as { emp: Employee; o: any; c: ReturnType<typeof computePayslip> }[];
  }, [employees, overrides]);

  const totals = preview.reduce((t, p) => {
    t.gross += p.c.gross; t.paye += p.c.paye; t.napsa += p.c.napsa; t.nhima += p.c.nhima; t.net += p.c.net;
    return t;
  }, { gross: 0, paye: 0, napsa: 0, nhima: 0, net: 0 });

  const setO = (id: string, patch: Partial<(typeof overrides)[string]>) =>
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const save = async () => {
    if (preview.length === 0) { toast.error("No employees selected"); return; }
    setSaving(true);
    try {
      // fetch YTD before this month for each employee in same year
      const empIds = preview.map(p => p.emp.id);
      const { data: prior } = await supabase
        .from("payslips")
        .select("employee_id, gross_pay, paye, napsa, payroll_run_id")
        .in("employee_id", empIds);
      const priorRunIds = Array.from(new Set((prior ?? []).map(r => r.payroll_run_id).filter(Boolean)));
      const { data: priorRuns } = priorRunIds.length ? await supabase.from("payroll_runs").select("id, period_month, period_year").in("id", priorRunIds) : { data: [] as any[] };
      const runMap = new Map((priorRuns ?? []).map((r: any) => [r.id, r]));
      const ytd = new Map<string, { taxable: number; paye: number; napsa: number }>();
      for (const p of preview) ytd.set(p.emp.id, { taxable: 0, paye: 0, napsa: 0 });
      for (const s of prior ?? []) {
        const r: any = runMap.get(s.payroll_run_id);
        if (!r) continue;
        if (r.period_year !== year) continue;
        if (r.period_month > month) continue;
        const cur = ytd.get(s.employee_id); if (!cur) continue;
        cur.taxable += Number(s.gross_pay ?? 0);
        cur.paye += Number(s.paye ?? 0);
        cur.napsa += Number(s.napsa ?? 0);
      }

      const { data: run, error } = await supabase.from("payroll_runs").insert({
        user_id: userId, run_number: runNumber, period_month: month, period_year: year,
        pay_date: payDate, status: "draft",
        total_gross: totals.gross, total_paye: totals.paye, total_napsa: totals.napsa,
        total_nhima: totals.nhima, total_net: totals.net,
      }).select().single();
      if (error) throw error;

      const rows = preview.map(p => {
        const y = ytd.get(p.emp.id) ?? { taxable: 0, paye: 0, napsa: 0 };
        const allowances = p.o.utility + p.o.housing + p.o.transport + p.o.shift + p.o.bonus;
        return {
          user_id: userId, payroll_run_id: run.id, employee_id: p.emp.id,
          basic_salary: p.o.basic, allowances, overtime: p.o.overtime,
          gross_pay: p.c.gross, paye: p.c.paye, napsa: p.c.napsa, nhima: p.c.nhima,
          other_deductions: p.o.loan + p.o.advances + p.o.other_ded, net_pay: p.c.net,
          earnings: p.c.earnings, deductions: p.c.deductions,
          ytd_taxable: y.taxable + p.c.gross, ytd_paye: y.paye + p.c.paye, ytd_napsa: y.napsa + p.c.napsa,
          loan_balance: 0,
        };
      });
      const { error: e2 } = await supabase.from("payslips").insert(rows as any);
      if (e2) throw e2;
      toast.success(`Run ${runNumber} generated with ${rows.length} payslip(s)`);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save run");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle>New Payroll Run</CardTitle><CardDescription>Pick the period, review each employee, then save.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div><Label>Run Number</Label><Input value={runNumber} onChange={e => setRunNumber(e.target.value)} /></div>
          <div><Label>Month</Label>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Year</Label><Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></div>
          <div><Label>Pay Date</Label><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div><CardTitle>Employees</CardTitle><CardDescription>Edit any figure — PAYE, NAPSA, NHIMA recompute live.</CardDescription></div>
          <div className="text-xs text-slate-500">{preview.length} of {employees.length} included</div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading employees…</div>
            : employees.length === 0 ? <div className="py-6 text-center text-slate-400">No active employees. Add employees under HR & Payroll → Employees.</div>
            : (
              <div className="overflow-auto max-h-[520px] border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10"><TableRow>
                    <TableHead className="w-6"></TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right w-24">Basic</TableHead>
                    <TableHead className="text-right w-20">Utility</TableHead>
                    <TableHead className="text-right w-20">Housing</TableHead>
                    <TableHead className="text-right w-20">Transp.</TableHead>
                    <TableHead className="text-right w-20">O/T</TableHead>
                    <TableHead className="text-right w-20">Shift</TableHead>
                    <TableHead className="text-right w-20">Bonus</TableHead>
                    <TableHead className="text-right w-20">Loan</TableHead>
                    <TableHead className="text-right w-24">Gross</TableHead>
                    <TableHead className="text-right w-24">PAYE</TableHead>
                    <TableHead className="text-right w-24">NAPSA</TableHead>
                    <TableHead className="text-right w-24">Net</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {employees.map(e => {
                      const o = overrides[e.id]; if (!o) return null;
                      const c = computePayslip({
                        basic: o.basic, utility_allowance: o.utility, housing_allowance: o.housing, transport_allowance: o.transport,
                        overtime: o.overtime, shift_differential: o.shift, bonus: o.bonus,
                        loan_recovery: o.loan, advances: o.advances,
                      });
                      const numCell = (v: number, patch: (n: number) => any) => (
                        <Input type="number" step="0.01" value={v} onChange={ev => setO(e.id, patch(Number(ev.target.value)))} className="h-8 text-right px-1 py-1 text-xs" />
                      );
                      return (
                        <TableRow key={e.id} className={o.include ? "" : "opacity-40"}>
                          <TableCell><input type="checkbox" checked={o.include} onChange={ev => setO(e.id, { include: ev.target.checked })} /></TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{e.first_name} {e.last_name}</div>
                            <div className="text-[10px] text-slate-400">{e.employee_code ?? ""}</div>
                          </TableCell>
                          <TableCell>{numCell(o.basic, n => ({ basic: n }))}</TableCell>
                          <TableCell>{numCell(o.utility, n => ({ utility: n }))}</TableCell>
                          <TableCell>{numCell(o.housing, n => ({ housing: n }))}</TableCell>
                          <TableCell>{numCell(o.transport, n => ({ transport: n }))}</TableCell>
                          <TableCell>{numCell(o.overtime, n => ({ overtime: n }))}</TableCell>
                          <TableCell>{numCell(o.shift, n => ({ shift: n }))}</TableCell>
                          <TableCell>{numCell(o.bonus, n => ({ bonus: n }))}</TableCell>
                          <TableCell>{numCell(o.loan, n => ({ loan: n }))}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(c.gross)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(c.paye)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(c.napsa)}</TableCell>
                          <TableCell className="text-right font-semibold text-xs">{fmtMoney(c.net)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-4">
          <Totals label="Gross" value={totals.gross} />
          <Totals label="PAYE" value={totals.paye} />
          <Totals label="NAPSA" value={totals.napsa} />
          <Totals label="NHIMA" value={totals.nhima} />
          <Totals label="Net" value={totals.net} accent />
          <div className="ml-auto">
            <Button onClick={save} disabled={saving || preview.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save Run & Payslips
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Totals({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-emerald-600" : "text-slate-900"}`}>{fmtMoney(value)}</div>
    </div>
  );
}

/* ================= Edit slip dialog ================= */

function EditSlipDialog({ slip, run, userId, onClose, onSaved }: { slip: Slip & { employee: Employee }; run: Run; userId: string; onClose: () => void; onSaved: () => void }) {
  const [basic, setBasic] = useState(Number(slip.basic_salary ?? 0));
  const [notes, setNotes] = useState(slip.notes ?? "");
  const [loanBalance, setLoanBalance] = useState(Number(slip.loan_balance ?? 0));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("payslips").update({
      basic_salary: basic, notes, loan_balance: loanBalance,
    }).eq("id", slip.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Payslip updated"); onSaved(); }
    void userId;
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit payslip — {slip.employee.first_name} {slip.employee.last_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Basic Salary</Label><Input type="number" value={basic} onChange={e => setBasic(Number(e.target.value))} /></div>
            <div><Label>Loan Balance</Label><Input type="number" value={loanBalance} onChange={e => setLoanBalance(Number(e.target.value))} /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="text-xs text-slate-500">To recompute earnings/deductions from scratch, delete this run and regenerate. Individual figures on the payslip come from the run.</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
          </div>
        </div>
        <div className="text-[10px] text-slate-400">Run {run.run_number}</div>
      </DialogContent>
    </Dialog>
  );
}

/* ================= PAYE calculator ================= */

function PayeCalculator() {
  const [gross, setGross] = useState(10000);
  const paye = calcPaye(gross);
  const napsa = Math.min(gross * 0.05, 1342.40);
  const nhima = gross * 0.01;
  const net = gross - paye - napsa - nhima;
  return (
    <Card>
      <CardHeader><CardTitle>Zambia PAYE Calculator</CardTitle><CardDescription>Monthly bands as configured. Change the gross to see the split.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div><Label>Gross Pay (ZMW / month)</Label><Input type="number" value={gross} onChange={e => setGross(Number(e.target.value))} /></div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-2">Band</th><th className="text-right p-2">Rate</th></tr></thead>
              <tbody>
                {DEFAULT_PAYE_BANDS.map((b, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{i === 0 ? "0" : (DEFAULT_PAYE_BANDS[i-1].upTo ?? 0).toLocaleString()} – {b.upTo ? b.upTo.toLocaleString() : "above"}</td>
                    <td className="p-2 text-right">{(b.rate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-2">
          <Row k="Gross" v={gross} />
          <Row k="PAYE" v={-paye} />
          <Row k="NAPSA (5% capped)" v={-napsa} />
          <Row k="NHIMA (1%)" v={-nhima} />
          <div className="border-t pt-2"><Row k="Net Pay" v={net} bold /></div>
        </div>
      </CardContent>
    </Card>
  );
}
function Row({ k, v, bold }: { k: string; v: number; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "text-emerald-700 font-bold text-lg" : "text-slate-700"}`}><span>{k}</span><span>{fmtMoney(v)}</span></div>;
}
