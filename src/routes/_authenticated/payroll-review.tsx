import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, monthName } from "@/lib/format";
import {
  blockers, reviewPayroll, runTotals, varianceRows,
  type ReviewEmployee, type ReviewIssue, type ReviewSlip,
} from "@/lib/payroll-review";

export const Route = createFileRoute("/_authenticated/payroll-review")({
  head: () => ({
    meta: [
      { title: "Review & Approve Payroll — SifoBooks" },
      { name: "description", content: "Employee-by-employee payroll review with prior-period variance, exceptions and approval controls before posting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollReview,
});

const db = supabase as any;

type Run = {
  id: string; run_number: string; period_year: number; period_month: number;
  status: string; pay_date: string | null; prepared_by?: string | null;
  total_gross: number | null; total_net: number | null;
};

function PayrollReview() {
  const [userId, setUserId] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [slips, setSlips] = useState<ReviewSlip[]>([]);
  const [prevSlips, setPrevSlips] = useState<ReviewSlip[]>([]);
  const [employees, setEmployees] = useState<ReviewEmployee[]>([]);
  const [busy, setBusy] = useState(false);

  const run = runs.find((r) => r.id === runId) ?? null;
  const previous = useMemo(() => {
    if (!run) return null;
    return runs.find((r) =>
      r.period_year * 12 + r.period_month === run.period_year * 12 + run.period_month - 1) ?? null;
  }, [runs, run]);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await db.from("payroll_runs")
        .select("id,run_number,period_year,period_month,status,pay_date,prepared_by,total_gross,total_net")
        .eq("user_id", u.user.id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(36);
      const rs = (data ?? []) as Run[];
      setRuns(rs);
      if (rs.length) setRunId(rs[0]!.id);
    })();
  }, []);

  const mapSlip = (s: any): ReviewSlip => ({
    id: s.id,
    employee_id: s.employee_id,
    basic_salary: s.basic_salary,
    allowances: s.allowances,
    overtime: s.overtime,
    gross_pay: s.gross_pay,
    paye: s.paye,
    napsa: s.napsa,
    nhima: s.nhima,
    other_deductions: s.other_deductions,
    loan_deduction: Number(s.loan_recovery ?? 0) + Number(s.advances ?? 0),
    net_pay: s.net_pay,
  });

  const load = useCallback(async () => {
    if (!runId) return;
    const cols = "id,employee_id,basic_salary,allowances,overtime,gross_pay,paye,napsa,nhima,other_deductions,loan_recovery,advances,net_pay";
    const [{ data: cur }, prevRes] = await Promise.all([
      db.from("payslips").select(cols).eq("payroll_run_id", runId),
      previous ? db.from("payslips").select(cols).eq("payroll_run_id", previous.id) : Promise.resolve({ data: [] }),
    ]);
    const rows = (cur ?? []).map(mapSlip) as ReviewSlip[];
    setSlips(rows);
    setPrevSlips(((prevRes as any).data ?? []).map(mapSlip) as ReviewSlip[]);
    const ids = Array.from(new Set(rows.map((s) => s.employee_id)));
    if (ids.length) {
      const { data: emps } = await db.from("employees")
        .select("id,first_name,last_name,employee_code,national_id,tpin,napsa_number,nhima_number,bank_name,bank_account,status")
        .in("id", ids);
      setEmployees((emps ?? []) as ReviewEmployee[]);
    } else setEmployees([]);
  }, [runId, previous]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => runTotals(slips), [slips]);
  const prevTotals = useMemo(() => runTotals(prevSlips), [prevSlips]);
  const issues = useMemo(() => reviewPayroll(slips, employees, prevSlips), [slips, employees, prevSlips]);
  const stops = blockers(issues);
  const rows = useMemo(() => varianceRows(slips, prevSlips, employees), [slips, prevSlips, employees]);

  const preparedByMe = !!run?.prepared_by && run.prepared_by === userId;
  const reviewable = run?.status === "draft" || run?.status === "calculated";

  const markReviewed = async () => {
    if (!run) return;
    setBusy(true);
    const { error } = await db.from("payroll_runs")
      .update({ status: "reviewed", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", run.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await db.from("audit_logs").insert({
      user_id: userId, action: "payroll.reviewed", entity_type: "payroll_runs", entity_id: run.id,
      details: { run: run.run_number, employees: totals.employees, gross: totals.gross, net: totals.net, warnings: issues.length },
    });
    setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, status: "reviewed" } : r)));
    toast.success("Run marked reviewed — it can now go for approval.");
  };

  return (
    <div className="max-w-6xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" /> Review &amp; approve
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every payslip on the run, compared with last period, with the problems that would break a payment or a statutory file.
            Figures are read-only here — corrections are made on the run itself.
          </p>
        </div>
        <div className="w-72">
          <Label className="text-xs">Payroll run</Label>
          <Select value={runId} onValueChange={setRunId}>
            <SelectTrigger><SelectValue placeholder="Choose a payroll run…" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.run_number} · {monthName(r.period_month)} {r.period_year} · {r.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!run ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          No payroll run to review yet.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Stat label="Employees" value={String(totals.employees)} prev={String(prevTotals.employees)} />
            <Stat label="Gross" value={fmtMoney(totals.gross)} prev={fmtMoney(prevTotals.gross)} />
            <Stat label="PAYE" value={fmtMoney(totals.paye)} prev={fmtMoney(prevTotals.paye)} />
            <Stat label="NAPSA" value={fmtMoney(totals.napsa)} prev={fmtMoney(prevTotals.napsa)} />
            <Stat label="Deductions" value={fmtMoney(totals.deductions)} prev={fmtMoney(prevTotals.deductions)} />
            <Stat label="Net pay" value={fmtMoney(totals.net)} prev={fmtMoney(prevTotals.net)} />
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Exceptions</CardTitle>
                <CardDescription>
                  {stops.length > 0
                    ? `${stops.length} must be fixed before approval · ${issues.length - stops.length} to check`
                    : issues.length > 0 ? `${issues.length} item(s) to check` : "Nothing flagged on this run."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase">{run.status}</Badge>
                {reviewable && (
                  <Button size="sm" disabled={busy || stops.length > 0 || totals.employees === 0}
                    title={stops.length > 0 ? "Clear the blocking exceptions first" : undefined}
                    onClick={() => void markReviewed()}>
                    Mark reviewed
                  </Button>
                )}
                <Button asChild size="sm" variant="outline"><Link to="/payroll">Open run</Link></Button>
              </div>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> No negative net pay, duplicates, missing identifiers or unusual movements.
                </p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-auto">
                  {issues.map((i, idx) => <IssueRow key={`${i.code}-${i.employeeId}-${idx}`} issue={i} />)}
                </ul>
              )}
              {preparedByMe && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> You prepared this run, so approval must come from someone else.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Employee by employee</CardTitle>
              <CardDescription>
                {previous ? `Compared with ${monthName(previous.period_month)} ${previous.period_year}` : "No previous run to compare with"} · largest movements first
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Last period</TableHead>
                    <TableHead className="text-right">Movement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.employeeId}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        {r.code && <div className="text-xs text-muted-foreground">{r.code}</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(r.gross)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(r.deductions)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtMoney(r.net)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMoney(r.previousNet)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${Math.abs(r.diff) < 0.005 ? "text-muted-foreground" : r.diff > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {Math.abs(r.diff) < 0.005 ? "—" : `${r.diff > 0 ? "+" : ""}${fmtMoney(r.diff)}${r.pct !== null ? ` (${r.pct.toFixed(1)}%)` : ""}`}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      This run has no payslips yet. Calculate it in Run Payroll first.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: ReviewIssue }) {
  const blocking = issue.severity === "blocker";
  return (
    <li className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${blocking ? "border-rose-200 bg-rose-50/60" : "bg-background"}`}>
      {blocking ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
      <div>
        <div className="font-medium">{issue.name}</div>
        <div className="text-muted-foreground">{issue.message}</div>
      </div>
    </li>
  );
}

function Stat({ label, value, prev }: { label: string; value: string; prev: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">was {prev}</div>
    </Card>
  );
}
