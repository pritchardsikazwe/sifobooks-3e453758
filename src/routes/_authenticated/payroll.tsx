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
import { DataTable, type DTColumn } from "@/components/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { AccountSelector } from "@/components/selectors/AccountSelector";
import { PostingPreview, isBalanced } from "@/components/PostingPreview";
import { payrollJournalLines } from "@/lib/posting-lines";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";
import { Badge } from "@/components/ui/badge";
import { Banknote, Loader2, Plus, FileText, Download, Wand2, Calculator, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, monthName } from "@/lib/format";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import {
  computePayslip, calcPaye, DEFAULT_PAYE_BANDS, calcGratuity, calcLeavePay, calcNoticePay,
  calcRepatriation, hourlyRate, STD_HOURS_PER_MONTH, OVERTIME_WEEKDAY, OVERTIME_WEEKEND,
  OVERTIME_HOLIDAY, type EarningLine, type DeductionLine,
} from "@/lib/payroll";
import { downloadPayslipPdf } from "@/lib/payslip-pdf";
import {
  downloadCsv, exportZraPaye, exportNapsaICare, exportNhima,
  exportBankSchedule, exportMobileMoney, type PayrollExportRow,
} from "@/lib/payroll-exports";

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

    const runColumns: DTColumn<any>[] = [
    { key: "run_number", header: "Run #", cell: r => <span className="font-mono text-xs">{r.run_number}</span> },
    { key: "period", header: "Period", accessor: r => `${monthName(r.period_month)} ${r.period_year}`, cell: r => <>{monthName(r.period_month)} {r.period_year}</> },
    { key: "pay_date", header: "Pay date", cell: r => r.pay_date ?? "—" },
    { key: "status", header: "Status", cell: r => <Badge variant={r.status === "paid" ? "default" : r.status === "approved" ? "secondary" : "outline"}>{r.status}</Badge> },
    { key: "total_gross", header: "Gross", align: "right", cell: r => fmtMoney(r.total_gross ?? 0) },
    { key: "total_paye", header: "PAYE", align: "right", cell: r => fmtMoney(r.total_paye ?? 0) },
    { key: "total_napsa", header: "NAPSA", align: "right", cell: r => fmtMoney(r.total_napsa ?? 0) },
    { key: "total_net", header: "Net", align: "right", cell: r => <span className="font-semibold">{fmtMoney(r.total_net ?? 0)}</span> },
    { key: "actions", header: "", sortable: false, cell: r => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedRun(r); }}>Open</Button> },
  ];

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
          <TabsTrigger value="benefits"><Calculator className="h-3.5 w-3.5 mr-1" /> Gratuity, Overtime & Backpay</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Payroll runs</CardTitle><CardDescription>All monthly payroll runs.</CardDescription></CardHeader>
            <CardContent>
              <DataTable
                tableId="payroll-runs"
                columns={runColumns}
                data={runs}
                loading={loading}
                searchPlaceholder={null}
                empty="No runs yet. Use the Generate tab to create your first monthly run."
                onRowClick={r => setSelectedRun(r)}
                totals={rows => ({
                  total_gross: fmtMoney(rows.reduce((s, r) => s + Number(r.total_gross ?? 0), 0)),
                  total_paye: fmtMoney(rows.reduce((s, r) => s + Number(r.total_paye ?? 0), 0)),
                  total_napsa: fmtMoney(rows.reduce((s, r) => s + Number(r.total_napsa ?? 0), 0)),
                  total_net: fmtMoney(rows.reduce((s, r) => s + Number(r.total_net ?? 0), 0)),
                })}
              />
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

        <TabsContent value="benefits" className="mt-4">
          <BenefitsCalculator />
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
  const [bankFormat, setBankFormat] = useState<"zanaco" | "stanbic" | "fnb" | "absa" | "generic">("generic");

  const { accounts, defaultFor } = useCoaAccounts();
  const [jl, setJl] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (accounts.length === 0) return;
    setJl(prev => ({
      wages: prev.wages ?? defaultFor("6200", "5100", "5000")?.id ?? null,
      employer: prev.employer ?? defaultFor("6210", "6200")?.id ?? null,
      paye: prev.paye ?? defaultFor("2300", "2200")?.id ?? null,
      napsa: prev.napsa ?? defaultFor("2310")?.id ?? null,
      nhima: prev.nhima ?? defaultFor("2320")?.id ?? null,
      other: prev.other ?? defaultFor("2390")?.id ?? null,
      net: prev.net ?? defaultFor("1000")?.id ?? null,
    }));
  }, [accounts]);
  const acc = (k: string) => accounts.find(a => a.id === jl[k]) ?? null;

  const journalLines = useMemo(() => {
    const n = (v: any) => Number(v) || 0;
    const t = slips.reduce((a, s: any) => ({
      grossPay: a.grossPay + n(s.gross_pay),
      paye: a.paye + n(s.paye),
      napsaEmployee: a.napsaEmployee + n(s.napsa),
      napsaEmployer: a.napsaEmployer + n(s.napsa_employer ?? s.napsa),
      nhimaEmployee: a.nhimaEmployee + n(s.nhima),
      nhimaEmployer: a.nhimaEmployer + n(s.nhima_employer ?? s.nhima),
      otherDeductions: a.otherDeductions + n(s.other_deductions) + n(s.loan_deduction),
      netPay: a.netPay + n(s.net_pay),
    }), { grossPay: 0, paye: 0, napsaEmployee: 0, napsaEmployer: 0, nhimaEmployee: 0, nhimaEmployer: 0, otherDeductions: 0, netPay: 0 });
    return payrollJournalLines({
      ...t,
      wagesExpense: acc("wages"),
      employerContribExpense: acc("employer"),
      payePayable: acc("paye"),
      napsaPayable: acc("napsa"),
      nhimaPayable: acc("nhima"),
      otherPayable: acc("other"),
      netPayable: acc("net"),
      periodLabel: `${monthName(run.period_month)} ${run.period_year}`,
    });
  }, [slips, jl, accounts, run.period_month, run.period_year]);
  const journalBalanced = isBalanced(journalLines);

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

  const ledgerLines = (): PayrollJournalLine[] => {
    const n = (v: any) => Number(v) || 0;
    const t = slips.reduce((a, s: any) => ({
      gross: a.gross + n(s.gross_pay),
      paye: a.paye + n(s.paye),
      napsaEe: a.napsaEe + n(s.napsa),
      napsaEr: a.napsaEr + n(s.napsa_employer ?? s.napsa),
      nhimaEe: a.nhimaEe + n(s.nhima),
      nhimaEr: a.nhimaEr + n(s.nhima_employer ?? s.nhima),
      other: a.other + n(s.other_deductions) + n(s.loan_deduction),
      net: a.net + n(s.net_pay),
    }), { gross: 0, paye: 0, napsaEe: 0, napsaEr: 0, nhimaEe: 0, nhimaEr: 0, other: 0, net: 0 });
    const p = `${monthName(run.period_month)} ${run.period_year}`;
    const employer = t.napsaEr + t.nhimaEr;
    return [
      { accountId: jl.wages ?? "", debit: t.gross, credit: 0, description: `Gross pay — ${p}` },
      { accountId: jl.employer ?? jl.wages ?? "", debit: employer, credit: 0, description: `Employer NAPSA + NHIMA — ${p}` },
      { accountId: jl.paye ?? "", debit: 0, credit: t.paye, description: "PAYE due to ZRA" },
      { accountId: jl.napsa ?? "", debit: 0, credit: t.napsaEe + t.napsaEr, description: "NAPSA (employee + employer)" },
      { accountId: jl.nhima ?? "", debit: 0, credit: t.nhimaEe + t.nhimaEr, description: "NHIMA (employee + employer)" },
      { accountId: jl.other ?? "", debit: 0, credit: t.other, description: "Loans, unions & other deductions" },
      { accountId: jl.net ?? "", debit: 0, credit: t.net, description: `Net pay to staff — ${p}` },
    ];
  };

  const [posting, setPosting] = useState(false);
  const markPaidAndPost = async () => {
    setPosting(true);
    try {
      const res = await postPayrollRunLedger({
        userId,
        runNumber: run.run_number,
        payDate: run.pay_date ?? new Date().toISOString().slice(0, 10),
        periodLabel: `${monthName(run.period_month)} ${run.period_year}`,
        lines: ledgerLines(),
      });
      if (!res.ok) { toast.error(res.error ?? "Could not post the payroll journal"); return; }
      const { error } = await supabase.from("payroll_runs").update({ status: "paid" }).eq("id", run.id);
      if (error) { toast.error(error.message); return; }
      toast.success(res.alreadyPosted ? "Run marked paid — journal already existed" : "Run marked paid and posted to the ledger");
      setLedgerKey(k => k + 1);
      onChanged();
    } finally { setPosting(false); }
  };

  const reopen = async () => {
    if (run.status === "paid") {
      const reason = window.prompt("Reopening a paid run reverses its payroll journal. Reason?");
      if (!reason) return;
      const res = await reversePayrollRunLedger(userId, run.run_number, reason);
      if (!res.ok) { toast.error(res.error ?? "Could not reverse the payroll journal"); return; }
      if (!res.nothingToReverse) toast.success("Payroll journal reversed");
      setLedgerKey(k => k + 1);
    }
    await setStatus("draft");
  };
  const [ledgerKey, setLedgerKey] = useState(0);
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

  const slipColumns: DTColumn<Slip & { employee: Employee }>[] = [
    {
      key: "employee", header: "Employee", sticky: true,
      accessor: s => `${s.employee.first_name} ${s.employee.last_name}`,
      cell: s => (
        <div>
          <div className="font-medium">{s.employee.first_name} {s.employee.last_name}</div>
          <div className="text-xs text-slate-400">{s.employee.employee_code ?? ""}</div>
        </div>
      ),
    },
    { key: "basic_salary", header: "Basic", align: "right", cell: s => fmtMoney(s.basic_salary ?? 0) },
    { key: "gross_pay", header: "Gross", align: "right", cell: s => fmtMoney(s.gross_pay ?? 0) },
    { key: "paye", header: "PAYE", align: "right", cell: s => fmtMoney(s.paye ?? 0) },
    { key: "napsa", header: "NAPSA", align: "right", cell: s => fmtMoney(s.napsa ?? 0) },
    { key: "nhima", header: "NHIMA", align: "right", cell: s => fmtMoney(s.nhima ?? 0) },
    { key: "net_pay", header: "Net", align: "right", cell: s => <span className="font-semibold">{fmtMoney(s.net_pay ?? 0)}</span> },
    {
      key: "actions", header: "", sortable: false, sticky: true,
      cell: s => (
        <div className="whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><FileText className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => downloadSlip(s)}><Download className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  if (editing) {
    return (
      <EditSlipForm
        slip={editing}
        run={run}
        userId={userId}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); onChanged(); }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Run {run.run_number} — {monthName(run.period_month)} {run.period_year}</CardTitle>
            <CardDescription>Payslips generated for this period.</CardDescription>
          </div>
          <div className="flex gap-2">
            {run.status === "draft" && (
              <Button size="sm" variant="outline" disabled={!journalBalanced}
                title={journalBalanced ? undefined : "The payroll journal must balance before approval"}
                onClick={() => setStatus("approved")}>Approve</Button>
            )}
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
        <DataTable
          tableId="payroll-payslips"
          columns={slipColumns}
          data={slips}
          loading={loading}
          searchPlaceholder="Search employee…"
          empty="No payslips."
          onRowClick={s => setEditing(s)}
          totals={rows => ({
            basic_salary: fmtMoney(rows.reduce((sum, s) => sum + Number(s.basic_salary ?? 0), 0)),
            gross_pay: fmtMoney(rows.reduce((sum, s) => sum + Number(s.gross_pay ?? 0), 0)),
            paye: fmtMoney(rows.reduce((sum, s) => sum + Number(s.paye ?? 0), 0)),
            napsa: fmtMoney(rows.reduce((sum, s) => sum + Number(s.napsa ?? 0), 0)),
            nhima: fmtMoney(rows.reduce((sum, s) => sum + Number(s.nhima ?? 0), 0)),
            net_pay: fmtMoney(rows.reduce((sum, s) => sum + Number(s.net_pay ?? 0), 0)),
          })}
        />
      </CardContent>

      <CardContent className="pt-0">
        <div className="rounded-lg border bg-slate-50/60 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll journal accounts</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AccountSelector label="Salaries & wages expense" required accounts={accounts} types={["expense"]} recentKey="pr-wages" value={jl.wages ?? null} onChange={v => setJl(s2 => ({ ...s2, wages: v }))} help="Gross pay charged to the profit & loss." />
            <AccountSelector label="Employer contributions expense" required accounts={accounts} types={["expense"]} recentKey="pr-employer" value={jl.employer ?? null} onChange={v => setJl(s2 => ({ ...s2, employer: v }))} help="Employer NAPSA and NHIMA cost." />
            <AccountSelector label="PAYE payable" required accounts={accounts} types={["liability"]} recentKey="pr-paye" value={jl.paye ?? null} onChange={v => setJl(s2 => ({ ...s2, paye: v }))} help="Owed to ZRA until remitted." />
            <AccountSelector label="NAPSA payable" required accounts={accounts} types={["liability"]} recentKey="pr-napsa" value={jl.napsa ?? null} onChange={v => setJl(s2 => ({ ...s2, napsa: v }))} help="Employee plus employer NAPSA." />
            <AccountSelector label="NHIMA payable" required accounts={accounts} types={["liability"]} recentKey="pr-nhima" value={jl.nhima ?? null} onChange={v => setJl(s2 => ({ ...s2, nhima: v }))} help="Employee plus employer NHIMA." />
            <AccountSelector label="Other payroll deductions" accounts={accounts} types={["liability"]} recentKey="pr-other" value={jl.other ?? null} onChange={v => setJl(s2 => ({ ...s2, other: v }))} help="Loans, unions and similar deductions." />
            <AccountSelector label="Net pay — cash / bank" required accounts={accounts} types={["asset"]} cashBankOnly recentKey="pr-net" value={jl.net ?? null} onChange={v => setJl(s2 => ({ ...s2, net: v }))} help="Account the salaries are paid from." />
          </div>
          <PostingPreview lines={journalLines} title="Payroll journal for this run" />
          {!journalBalanced && (
            <p className="text-xs text-rose-600">Approval is blocked until every account is chosen and the journal balances.</p>
          )}
        </div>
      </CardContent>

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
            <Button variant="save" onClick={save} disabled={saving || preview.length === 0} >
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

function EditSlipForm({ slip, run, userId, onClose, onSaved }: { slip: Slip & { employee: Employee }; run: Run; userId: string; onClose: () => void; onSaved: () => void }) {
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
    <div className="p-4 sm:p-6">
      <SifoFormPage
        module="payroll"
        icon={Banknote}
        title={`Edit payslip — ${slip.employee.first_name} ${slip.employee.last_name}`}
        subtitle={`Run ${run.run_number}`}
        onCancel={onClose}
        onSave={save}
        saving={saving}
        saveLabel="Save"
      >
        <SifoFormSection title="Payslip">
          <SifoField label="Basic salary"><Input type="number" value={basic} onChange={e => setBasic(Number(e.target.value))} /></SifoField>
          <SifoField label="Loan balance"><Input type="number" value={loanBalance} onChange={e => setLoanBalance(Number(e.target.value))} /></SifoField>
          <SifoField label="Notes" wide help="To recompute earnings/deductions from scratch, delete this run and regenerate. Individual figures on the payslip come from the run.">
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </SifoField>
        </SifoFormSection>
      </SifoFormPage>
    </div>
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

/* ================= Gratuity, overtime & backpay calculator ================= */

const round2 = (n: number) => Math.round(n * 100) / 100;

function BenefitsCalculator() {
  const [basic, setBasic] = useState(10000);
  const [months, setMonths] = useState(24);
  const [pct, setPct] = useState(25);
  const [leaveDays, setLeaveDays] = useState(0);
  const [noticeMonths, setNoticeMonths] = useState(1);
  const [yearsService, setYearsService] = useState(2);

  const [otWeekday, setOtWeekday] = useState(0);
  const [otWeekend, setOtWeekend] = useState(0);
  const [otHoliday, setOtHoliday] = useState(0);

  const [backOld, setBackOld] = useState(10000);
  const [backNew, setBackNew] = useState(12000);
  const [backMonths, setBackMonths] = useState(3);

  const rate = hourlyRate(basic);
  const otPay = round2(
    otWeekday * rate * OVERTIME_WEEKDAY +
    otWeekend * rate * OVERTIME_WEEKEND +
    otHoliday * rate * OVERTIME_HOLIDAY
  );
  const gratuity = calcGratuity(basic, months, pct / 100);
  const leavePay = calcLeavePay(basic, leaveDays);
  const noticePay = calcNoticePay(basic, noticeMonths);
  const repatriation = calcRepatriation(basic / 22, yearsService);
  const terminalTotal = round2(gratuity + leavePay + noticePay + repatriation);
  const backpay = round2(Math.max(0, backNew - backOld) * backMonths);
  const backpayPaye = calcPaye(backpay);

  const Row = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
    <div className={`flex items-center justify-between py-1.5 text-sm ${strong ? "font-semibold border-t mt-1 pt-2" : ""}`}>
      <span className="text-slate-600">{label}</span><span className="tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
  const Num = ({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={e => onChange(Number(e.target.value) || 0)} />
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Terminal benefits</CardTitle>
          <CardDescription>Gratuity, leave pay, notice and repatriation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Num label="Monthly basic (ZMW)" value={basic} onChange={setBasic} step={100} />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Months served" value={months} onChange={setMonths} />
            <Num label="Gratuity %" value={pct} onChange={setPct} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Num label="Leave days" value={leaveDays} onChange={setLeaveDays} />
            <Num label="Notice mths" value={noticeMonths} onChange={setNoticeMonths} />
            <Num label="Yrs service" value={yearsService} onChange={setYearsService} />
          </div>
          <div className="rounded-lg border bg-slate-50 p-3">
            <Row label="Gratuity" value={gratuity} />
            <Row label="Leave pay" value={leavePay} />
            <Row label="Notice pay" value={noticePay} />
            <Row label="Repatriation" value={repatriation} />
            <Row label="Total terminal benefits" value={terminalTotal} strong />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overtime</CardTitle>
          <CardDescription>1.5× weekday, 2× weekend & public holiday.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-slate-500">Hourly rate: <span className="font-semibold tabular-nums">{fmtMoney(rate)}</span> ({STD_HOURS_PER_MONTH} hrs/month)</div>
          <Num label="Weekday hours (1.5×)" value={otWeekday} onChange={setOtWeekday} step={0.5} />
          <Num label="Weekend hours (2×)" value={otWeekend} onChange={setOtWeekend} step={0.5} />
          <Num label="Public holiday hours (2×)" value={otHoliday} onChange={setOtHoliday} step={0.5} />
          <div className="rounded-lg border bg-slate-50 p-3">
            <Row label="Weekday" value={round2(otWeekday * rate * OVERTIME_WEEKDAY)} />
            <Row label="Weekend" value={round2(otWeekend * rate * OVERTIME_WEEKEND)} />
            <Row label="Holiday" value={round2(otHoliday * rate * OVERTIME_HOLIDAY)} />
            <Row label="Total overtime (taxable)" value={otPay} strong />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Backpay</CardTitle>
          <CardDescription>Arrears from a salary revision.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Num label="Old monthly salary" value={backOld} onChange={setBackOld} step={100} />
          <Num label="New monthly salary" value={backNew} onChange={setBackNew} step={100} />
          <Num label="Months in arrears" value={backMonths} onChange={setBackMonths} />
          <div className="rounded-lg border bg-slate-50 p-3">
            <Row label="Monthly difference" value={round2(Math.max(0, backNew - backOld))} />
            <Row label="Gross backpay" value={backpay} />
            <Row label="PAYE on backpay" value={backpayPaye} />
            <Row label="Net backpay" value={round2(backpay - backpayPaye)} strong />
          </div>
          <p className="text-xs text-slate-500">Add these amounts as earning lines on the employee's payslip so PAYE, NAPSA and NHIMA recompute on the full gross.</p>
        </CardContent>
      </Card>
    </div>
  );
}
