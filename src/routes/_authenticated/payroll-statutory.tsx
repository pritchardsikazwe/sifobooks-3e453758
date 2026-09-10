import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Landmark, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, monthName } from "@/lib/format";
import {
  derivedStatus, filingExceptions, filingFigures, reconcileFiling, statusReason,
  FILING_LABELS, FILING_STATUS_LABELS,
  type EmployeeRow, type FilingStatus, type FilingType, type SlipRow,
} from "@/lib/payroll-statutory";
import { downloadCsv, exportNapsaICare, exportNhima, exportZraPaye, type PayrollExportRow } from "@/lib/payroll-exports";

export const Route = createFileRoute("/_authenticated/payroll-statutory")({
  head: () => ({
    meta: [
      { title: "Statutory Centre — SifoBooks Payroll" },
      { name: "description", content: "PAYE, NAPSA and NHIMA totals per payroll run, reconciled against payslips, with export files and filing status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatutoryCentre,
});

const db = supabase as any;
const TYPES: FilingType[] = ["paye", "napsa", "nhima"];

type Run = {
  id: string; run_number: string; period_year: number; period_month: number;
  status: string; total_paye: number | null; total_napsa: number | null; total_nhima: number | null;
};
type Filing = {
  filing_type: FilingType; status: FilingStatus; file_name: string | null;
  submission_reference: string | null; submitted_at: string | null; notes: string | null;
};

function StatutoryCentre() {
  const [userId, setUserId] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const run = runs.find((r) => r.id === runId) ?? null;

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await db.from("payroll_runs")
        .select("id,run_number,period_year,period_month,status,total_paye,total_napsa,total_nhima")
        .eq("user_id", u.user.id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(36);
      const rs = (data ?? []) as Run[];
      setRuns(rs);
      if (rs.length) setRunId(rs[0]!.id);
    })();
  }, []);

  const loadRun = useCallback(async () => {
    if (!runId || !userId) return;
    const [{ data: ps }, { data: fl }] = await Promise.all([
      db.from("payslips").select("employee_id,basic_salary,gross_pay,paye,napsa,nhima,net_pay").eq("payroll_run_id", runId),
      db.from("payroll_statutory_filings").select("filing_type,status,file_name,submission_reference,submitted_at,notes").eq("payroll_run_id", runId),
    ]);
    const rows = (ps ?? []) as SlipRow[];
    setSlips(rows);
    setFilings((fl ?? []) as Filing[]);
    const ids = Array.from(new Set(rows.map((s) => s.employee_id)));
    if (ids.length) {
      const { data: emps } = await db.from("employees")
        .select("id,first_name,last_name,employee_code,national_id,tpin,napsa_number,nhima_number,bank_account")
        .in("id", ids);
      setEmployees((emps ?? []) as EmployeeRow[]);
    } else setEmployees([]);
  }, [runId, userId]);

  useEffect(() => { void loadRun(); }, [loadRun]);

  const cards = useMemo(() => TYPES.map((type) => {
    const figures = filingFigures(slips, type);
    const runTotal = type === "paye" ? run?.total_paye : type === "napsa" ? run?.total_napsa : run?.total_nhima;
    const rec = reconcileFiling(figures, runTotal);
    const exceptions = filingExceptions(slips, employees, type);
    const recorded = filings.find((f) => f.filing_type === type) ?? null;
    const status = derivedStatus({ figures, reconciled: rec.reconciled, exceptions: exceptions.length, recorded: recorded?.status ?? null });
    const reason = statusReason({ figures, reconciled: rec.reconciled, difference: rec.difference, exceptions: exceptions.length });
    return { type, figures, rec, exceptions, recorded, status, reason };
  }), [slips, employees, filings, run]);

  const exportRows = useMemo<PayrollExportRow[]>(() => {
    const byId = new Map(employees.map((e) => [e.id, e]));
    return slips.map((s) => {
      const e = byId.get(s.employee_id);
      return {
        employee_code: e?.employee_code ?? null,
        first_name: e?.first_name ?? "",
        last_name: e?.last_name ?? "",
        national_id: e?.national_id ?? null,
        tpin: e?.tpin ?? null,
        napsa_number: e?.napsa_number ?? null,
        nhima_number: e?.nhima_number ?? null,
        bank_account: e?.bank_account ?? null,
        basic: Number(s.basic_salary ?? 0),
        gross: Number(s.gross_pay ?? 0),
        taxable: Number(s.gross_pay ?? 0),
        paye: Number(s.paye ?? 0),
        napsa: Number(s.napsa ?? 0),
        nhima: Number(s.nhima ?? 0),
        net: Number(s.net_pay ?? 0),
      };
    });
  }, [slips, employees]);

  const record = async (type: FilingType, patch: Record<string, unknown>, action: string) => {
    if (!run || !userId) return;
    const card = cards.find((c) => c.type === type)!;
    setBusy(true);
    const { error } = await db.from("payroll_statutory_filings").upsert({
      user_id: userId,
      payroll_run_id: run.id,
      filing_type: type,
      period_year: run.period_year,
      period_month: run.period_month,
      employees_count: card.figures.employees,
      employee_amount: card.figures.employeeAmount,
      employer_amount: card.figures.employerAmount,
      total_amount: card.figures.total,
      payroll_amount: card.rec.payroll,
      difference: card.rec.difference,
      acted_by: userId,
      ...patch,
    }, { onConflict: "user_id,payroll_run_id,filing_type" });
    setBusy(false);
    if (error) return toast.error(error.message);
    await db.from("audit_logs").insert({
      user_id: userId,
      action,
      entity_type: "payroll_statutory_filing",
      entity_id: run.id,
      details: { run: run.run_number, filing: type, period: `${run.period_month}/${run.period_year}`, ...patch },
    });
    void loadRun();
  };

  const period = run ? `${monthName(run.period_month)} ${run.period_year}` : "";

  const download = async (type: FilingType) => {
    if (!run) return;
    const label = `${run.period_month}/${run.period_year}`;
    const contents =
      type === "paye" ? exportZraPaye(exportRows, label)
      : type === "napsa" ? exportNapsaICare(exportRows, label)
      : exportNhima(exportRows, label);
    const file = `${type}-${run.run_number}.csv`;
    downloadCsv(file, contents);
    await record(type, { status: "exported", file_name: file }, "payroll.statutory.exported");
    toast.success(`${FILING_LABELS[type]} file downloaded`);
  };

  return (
    <div className="max-w-6xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-emerald-600" /> Statutory centre
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            PAYE, NAPSA and NHIMA rebuilt from the payslips on a run, reconciled against the run totals before you file.
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
          No payroll run yet. Calculate a run in Payroll and its statutory figures will appear here.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {cards.map((c) => (
              <Card key={c.type} className="rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{FILING_LABELS[c.type]}</CardTitle>
                      <CardDescription>{period} · {c.figures.employees} employee(s)</CardDescription>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Employee side" value={c.figures.employeeAmount} />
                  {c.figures.employerAmount > 0 && <Row label="Employer side" value={c.figures.employerAmount} />}
                  <Row label="Total payable" value={c.figures.total} bold />
                  <div className="rounded-lg border bg-muted/30 p-2 text-xs">
                    <div className="flex justify-between">
                      <span>Payroll run total</span>
                      <span className="tabular-nums">{fmtMoney(c.rec.payroll)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Difference</span>
                      <span className={`tabular-nums ${c.rec.reconciled ? "" : "font-semibold text-destructive"}`}>
                        {fmtMoney(c.rec.difference)}
                      </span>
                    </div>
                  </div>
                  {c.reason && (
                    <p className="flex gap-2 text-xs text-amber-600">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c.reason}
                    </p>
                  )}
                  {c.exceptions.length > 0 && (
                    <ul className="max-h-32 space-y-1 overflow-auto text-xs">
                      {c.exceptions.map((e) => (
                        <li key={e.employeeId} className="flex justify-between gap-2 rounded border bg-background px-2 py-1">
                          <span className="truncate">{e.name}</span>
                          <span className="shrink-0 text-muted-foreground">missing {e.missing.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={busy || c.figures.employees === 0} onClick={() => void download(c.type)}>
                      <Download className="mr-1 h-3.5 w-3.5" /> Download file
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy}
                      onClick={() => void record(c.type, { status: "failed", notes: "Marked failed from the statutory centre." }, "payroll.statutory.failed")}>
                      Mark failed
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Portal reference"
                      value={refs[c.type] ?? c.recorded?.submission_reference ?? ""}
                      onChange={(e) => setRefs((p) => ({ ...p, [c.type]: e.target.value }))}
                    />
                    <Button size="sm" disabled={busy || !(refs[c.type] ?? "").trim()}
                      onClick={() => void record(c.type, {
                        status: "submitted",
                        submission_reference: (refs[c.type] ?? "").trim(),
                        submitted_at: new Date().toISOString(),
                      }, "payroll.statutory.submitted")}>
                      Mark submitted
                    </Button>
                  </div>
                  {c.recorded?.submitted_at && (
                    <p className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Recorded {new Date(c.recorded.submitted_at).toLocaleString()}
                      {c.recorded.submission_reference ? ` · ${c.recorded.submission_reference}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> NAPSA iCARE and ZRA TaxOnline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                SifoBooks prepares the contribution and PAYE schedules and keeps a record of what you filed and when.
                It does not transmit anything to NAPSA or ZRA — there is no certified connection configured on this account,
                so upload the downloaded file on the iCARE and TaxOnline portals and paste the portal reference back here.
              </p>
              <p className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Files follow the iCARE bulk contribution and ZRA PAYE schedule column order and can be opened in Excel before upload.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: FilingStatus }) {
  const variant =
    status === "submitted" ? "default"
    : status === "failed" ? "destructive"
    : status === "needs_configuration" ? "outline"
    : "secondary";
  return <Badge variant={variant as never}>{FILING_STATUS_LABELS[status]}</Badge>;
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t pt-1 font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
}
