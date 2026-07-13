import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { fmt, num, exportCsv } from "@/lib/reports";
import { monthName } from "@/lib/format";
import { exportSchedulePdf } from "@/lib/payroll-schedules-pdf";

export const Route = createFileRoute("/_authenticated/reports/payroll-schedules")({
  head: () => ({ meta: [{ title: "Payroll Schedules — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PayrollSchedulesPage,
});

type Run = {
  id: string; run_number: string; period_year: number; period_month: number;
  pay_date: string | null; status: string;
};
type Slip = any;
type Emp = {
  id: string; first_name: string; last_name: string; employee_code: string | null;
  napsa_number: string | null; nhima_number: string | null; national_id: string | null; tpin: string | null;
  bank_name: string | null; bank_account: string | null;
  marital_status: string | null; num_children: number | null;
  leave_days_entitlement: number | null;
  hire_date: string | null; contract_end_date: string | null;
};

const fullName = (e?: Emp) => e ? `${e.first_name} ${e.last_name}` : "—";

function PayrollSchedulesPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [slips, setSlips] = useState<Slip[]>([]);
  const [emps, setEmps] = useState<Record<string, Emp>>({});
  const [overtime, setOvertime] = useState<Record<string, number>>({});
  const [leaveDays, setLeaveDays] = useState<Record<string, number>>({});

  useEffect(() => { (async () => {
    setLoading(true);
    const { data } = await supabase.from("payroll_runs")
      .select("id,run_number,period_year,period_month,pay_date,status")
      .order("period_year", { ascending: false }).order("period_month", { ascending: false });
    setRuns((data ?? []) as Run[]);
    if (data?.[0]) setSelectedRunId((data[0] as any).id);
    setLoading(false);
  })(); }, []);

  useEffect(() => { (async () => {
    if (!selectedRunId) return;
    const run = runs.find(r => r.id === selectedRunId);
    if (!run) return;
    const { data: ss } = await supabase.from("payslips").select("*").eq("payroll_run_id", selectedRunId);
    const list = (ss ?? []) as Slip[];
    setSlips(list);
    const empIds = Array.from(new Set(list.map((s: any) => s.employee_id)));
    if (empIds.length) {
      const { data: es } = await supabase.from("employees")
        .select("id,first_name,last_name,employee_code,napsa_number,nhima_number,national_id,tpin,bank_name,bank_account,marital_status,num_children,leave_days_entitlement,hire_date,contract_end_date")
        .in("id", empIds);
      const map: Record<string, Emp> = {};
      (es ?? []).forEach((e: any) => { map[e.id] = e; });
      setEmps(map);
    }
    // Aggregate overtime hours / leave days for the run month from time_entries + leave_requests
    const from = new Date(Date.UTC(run.period_year, run.period_month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(run.period_year, run.period_month, 0)).toISOString().slice(0, 10);
    const { data: te } = await supabase.from("time_entries").select("employee_id,hours,work_date").gte("work_date", from).lte("work_date", to);
    const otMap: Record<string, number> = {};
    (te ?? []).forEach((r: any) => {
      if (!r.employee_id) return;
      const h = Number(r.hours) || 0;
      if (h > 8) otMap[r.employee_id] = (otMap[r.employee_id] || 0) + (h - 8);
    });
    setOvertime(otMap);
    const { data: lv } = await supabase.from("leave_requests")
      .select("employee_id,days,start_date,end_date,status").gte("start_date", from).lte("end_date", to).eq("status", "approved");
    const lvMap: Record<string, number> = {};
    (lv ?? []).forEach((r: any) => { if (r.employee_id) lvMap[r.employee_id] = (lvMap[r.employee_id] || 0) + (Number(r.days) || 0); });
    setLeaveDays(lvMap);
  })(); }, [selectedRunId, runs]);

  const selectedRun = runs.find(r => r.id === selectedRunId);
  const periodLabel = selectedRun ? `${monthName(selectedRun.period_month)} ${selectedRun.period_year}` : "";

  // ------- Registers -------
  const register = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      nrc: e?.national_id || "—",
      basic: num(s.basic_salary),
      housing: num(s.housing_allowance),
      transport: num(s.transport_allowance),
      utility: num(s.utility_allowance),
      overtime: num(s.overtime),
      bonus: num(s.bonus),
      leavePay: num(s.leave_pay),
      allowances: num(s.allowances),
      gross: num(s.gross_pay),
      paye: num(s.paye),
      napsa: num(s.napsa),
      nhima: num(s.nhima),
      absentism: num(s.absentism),
      late: num(s.late_reporting),
      advances: num(s.advances),
      loan: num(s.loan_recovery),
      otherDed: num(s.other_deductions),
      net: num(s.net_pay),
    };
  }), [slips, emps]);

  const bank = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      bank: e?.bank_name || "—",
      account: e?.bank_account || "—",
      net: num(s.net_pay),
    };
  }), [slips, emps]);

  const paye = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      tpin: e?.tpin || "—",
      gross: num(s.gross_pay),
      taxable: num(s.gross_pay) - num(s.housing_allowance) - num(s.transport_allowance) - num(s.utility_allowance),
      paye: num(s.paye),
    };
  }), [slips, emps]);

  const napsa = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      napsaNo: e?.napsa_number || "—",
      gross: num(s.gross_pay),
      employee: num(s.napsa),
      employer: num(s.napsa),
      total: num(s.napsa) * 2,
    };
  }), [slips, emps]);

  const nhima = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      nhimaNo: e?.nhima_number || "—",
      basic: num(s.basic_salary),
      employee: num(s.nhima),
      employer: num(s.nhima),
      total: num(s.nhima) * 2,
    };
  }), [slips, emps]);

  const ot = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      hours: overtime[s.employee_id] || num(s.overtime_hours),
      overtimePay: num(s.overtime),
    };
  }), [slips, emps, overtime]);

  const leave = useMemo(() => slips.map((s: any) => {
    const e = emps[s.employee_id];
    const entitlement = num(e?.leave_days_entitlement) || 24;
    const taken = leaveDays[s.employee_id] || num(s.leave_days_taken);
    return {
      code: e?.employee_code || "—",
      name: fullName(e),
      entitlement,
      taken,
      balance: entitlement - taken,
      leavePay: num(s.leave_pay),
    };
  }), [slips, emps, leaveDays]);

  const sum = (rows: any[], k: string) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);

  // ------- PDF exports -------
  async function pdfRegister() {
    await exportSchedulePdf({
      title: "Payroll Register",
      subtitle: `${periodLabel} · Run ${selectedRun?.run_number}`,
      landscape: true,
      head: ["Code", "Name", "NRC", "Basic", "Housing", "Transp.", "Utility", "OT", "Bonus", "Leave", "Gross", "PAYE", "NAPSA", "NHIMA", "Other Ded", "Net"],
      rows: register.map(r => [r.code, r.name, r.nrc, fmt(r.basic), fmt(r.housing), fmt(r.transport), fmt(r.utility), fmt(r.overtime), fmt(r.bonus), fmt(r.leavePay), fmt(r.gross), fmt(r.paye), fmt(r.napsa), fmt(r.nhima), fmt(r.absentism + r.late + r.advances + r.loan + r.otherDed), fmt(r.net)]),
      totalsRow: ["", "TOTALS", "", fmt(sum(register, "basic")), fmt(sum(register, "housing")), fmt(sum(register, "transport")), fmt(sum(register, "utility")), fmt(sum(register, "overtime")), fmt(sum(register, "bonus")), fmt(sum(register, "leavePay")), fmt(sum(register, "gross")), fmt(sum(register, "paye")), fmt(sum(register, "napsa")), fmt(sum(register, "nhima")), fmt(register.reduce((a, r) => a + r.absentism + r.late + r.advances + r.loan + r.otherDed, 0)), fmt(sum(register, "net"))],
      rightAlignCols: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      filename: `payroll-register-${periodLabel.replace(" ", "-")}`,
    });
  }

  async function pdfBank() {
    await exportSchedulePdf({
      title: "Bank Payment Schedule",
      subtitle: `${periodLabel} · Run ${selectedRun?.run_number}`,
      head: ["Emp Code", "Employee Name", "Bank", "Account Number", "Amount (ZMW)"],
      rows: bank.map(r => [r.code, r.name, r.bank, r.account, fmt(r.net)]),
      totalsRow: ["", "TOTAL", "", "", fmt(sum(bank, "net"))],
      rightAlignCols: [4],
      filename: `bank-payment-schedule-${periodLabel.replace(" ", "-")}`,
    });
  }

  async function pdfPaye() {
    await exportSchedulePdf({
      title: "PAYE Tax Schedule",
      subtitle: `${periodLabel} · ZRA submission`,
      head: ["Emp Code", "Employee", "TPIN", "Gross Pay", "Taxable Pay", "PAYE"],
      rows: paye.map(r => [r.code, r.name, r.tpin, fmt(r.gross), fmt(r.taxable), fmt(r.paye)]),
      totalsRow: ["", "TOTAL", "", fmt(sum(paye, "gross")), fmt(sum(paye, "taxable")), fmt(sum(paye, "paye"))],
      rightAlignCols: [3, 4, 5],
      filename: `paye-schedule-${periodLabel.replace(" ", "-")}`,
    });
  }

  async function pdfNapsa() {
    await exportSchedulePdf({
      title: "NAPSA Schedule",
      subtitle: `${periodLabel} · Social Security`,
      head: ["Emp Code", "Employee", "NAPSA No.", "Gross Pay", "Employee 5%", "Employer 5%", "Total"],
      rows: napsa.map(r => [r.code, r.name, r.napsaNo, fmt(r.gross), fmt(r.employee), fmt(r.employer), fmt(r.total)]),
      totalsRow: ["", "TOTAL", "", fmt(sum(napsa, "gross")), fmt(sum(napsa, "employee")), fmt(sum(napsa, "employer")), fmt(sum(napsa, "total"))],
      rightAlignCols: [3, 4, 5, 6],
      filename: `napsa-schedule-${periodLabel.replace(" ", "-")}`,
    });
  }

  async function pdfNhima() {
    await exportSchedulePdf({
      title: "NHIMA Schedule",
      subtitle: `${periodLabel} · Health Insurance`,
      head: ["Emp Code", "Employee", "NHIMA No.", "Basic", "Employee 1%", "Employer 1%", "Total"],
      rows: nhima.map(r => [r.code, r.name, r.nhimaNo, fmt(r.basic), fmt(r.employee), fmt(r.employer), fmt(r.total)]),
      totalsRow: ["", "TOTAL", "", fmt(sum(nhima, "basic")), fmt(sum(nhima, "employee")), fmt(sum(nhima, "employer")), fmt(sum(nhima, "total"))],
      rightAlignCols: [3, 4, 5, 6],
      filename: `nhima-schedule-${periodLabel.replace(" ", "-")}`,
    });
  }

  async function pdfOvertime() {
    await exportSchedulePdf({
      title: "Overtime Schedule",
      subtitle: periodLabel,
      head: ["Emp Code", "Employee", "OT Hours", "Overtime Pay (ZMW)"],
      rows: ot.map(r => [r.code, r.name, r.hours.toFixed(2), fmt(r.overtimePay)]),
      totalsRow: ["", "TOTAL", ot.reduce((a, r) => a + Number(r.hours), 0).toFixed(2), fmt(sum(ot, "overtimePay"))],
      rightAlignCols: [2, 3],
      filename: `overtime-schedule-${periodLabel.replace(" ", "-")}`,
    });
  }

  async function pdfLeave() {
    await exportSchedulePdf({
      title: "Leave Schedule",
      subtitle: periodLabel,
      head: ["Emp Code", "Employee", "Entitlement", "Taken (Period)", "Balance", "Leave Pay"],
      rows: leave.map(r => [r.code, r.name, r.entitlement.toFixed(1), r.taken.toFixed(1), r.balance.toFixed(1), fmt(r.leavePay)]),
      totalsRow: ["", "TOTAL", "", leave.reduce((a, r) => a + r.taken, 0).toFixed(1), "", fmt(sum(leave, "leavePay"))],
      rightAlignCols: [2, 3, 4, 5],
      filename: `leave-schedule-${periodLabel.replace(" ", "-")}`,
    });
  }

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Payroll Schedules</h1>
            <p className="text-sm text-slate-500">Register, bank payment, statutory tax schedules, overtime & leave — export any tab to PDF/CSV.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRunId} onValueChange={setSelectedRunId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select payroll run" /></SelectTrigger>
            <SelectContent>
              {runs.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.run_number} — {monthName(r.period_month)} {r.period_year} ({r.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedRun ? (
        <Card className="p-6 text-sm text-slate-500">No payroll runs yet. Create one in <Link to="/payroll" className="text-emerald-700 underline">Payroll</Link>.</Card>
      ) : (
        <Tabs defaultValue="register">
          <TabsList className="flex-wrap">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="bank">Bank Payment</TabsTrigger>
            <TabsTrigger value="paye">PAYE</TabsTrigger>
            <TabsTrigger value="napsa">NAPSA</TabsTrigger>
            <TabsTrigger value="nhima">NHIMA</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card className="p-4 space-y-3">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => exportCsv(register as any, `payroll-register-${periodLabel}.csv`)}><Download className="h-4 w-4 mr-1" />CSV</Button>
                <Button size="sm" onClick={pdfRegister}><Download className="h-4 w-4 mr-1" />PDF</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 border-b"><tr>
                    <th className="text-left py-1.5">Code</th><th className="text-left">Name</th>
                    <th className="text-right">Basic</th><th className="text-right">Hous.</th><th className="text-right">Trans.</th>
                    <th className="text-right">Util.</th><th className="text-right">OT</th><th className="text-right">Bonus</th>
                    <th className="text-right">Gross</th><th className="text-right">PAYE</th><th className="text-right">NAPSA</th>
                    <th className="text-right">NHIMA</th><th className="text-right font-semibold">Net</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {register.map((r, i) => (
                      <tr key={i}>
                        <td className="py-1">{r.code}</td><td>{r.name}</td>
                        <td className="text-right">{fmt(r.basic)}</td><td className="text-right">{fmt(r.housing)}</td>
                        <td className="text-right">{fmt(r.transport)}</td><td className="text-right">{fmt(r.utility)}</td>
                        <td className="text-right">{fmt(r.overtime)}</td><td className="text-right">{fmt(r.bonus)}</td>
                        <td className="text-right font-medium">{fmt(r.gross)}</td>
                        <td className="text-right">{fmt(r.paye)}</td><td className="text-right">{fmt(r.napsa)}</td>
                        <td className="text-right">{fmt(r.nhima)}</td>
                        <td className="text-right font-semibold">{fmt(r.net)}</td>
                      </tr>
                    ))}
                    {!register.length && <tr><td colSpan={13} className="text-slate-400 py-4">No payslips in this run.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <ScheduleTable
              onPdf={pdfBank} rows={bank as any}
              filename={`bank-payment-${periodLabel}`}
              cols={[
                { h: "Code", k: "code" }, { h: "Employee", k: "name" },
                { h: "Bank", k: "bank" }, { h: "Account", k: "account" },
                { h: "Amount (ZMW)", k: "net", money: true },
              ]}
              totalKey="net"
            />
          </TabsContent>

          <TabsContent value="paye">
            <ScheduleTable
              onPdf={pdfPaye} rows={paye as any}
              filename={`paye-${periodLabel}`}
              cols={[
                { h: "Code", k: "code" }, { h: "Employee", k: "name" }, { h: "TPIN", k: "tpin" },
                { h: "Gross", k: "gross", money: true }, { h: "Taxable", k: "taxable", money: true },
                { h: "PAYE", k: "paye", money: true },
              ]}
              totalKey="paye"
            />
          </TabsContent>

          <TabsContent value="napsa">
            <ScheduleTable
              onPdf={pdfNapsa} rows={napsa as any}
              filename={`napsa-${periodLabel}`}
              cols={[
                { h: "Code", k: "code" }, { h: "Employee", k: "name" }, { h: "NAPSA No.", k: "napsaNo" },
                { h: "Gross", k: "gross", money: true },
                { h: "Employee 5%", k: "employee", money: true }, { h: "Employer 5%", k: "employer", money: true },
                { h: "Total", k: "total", money: true },
              ]}
              totalKey="total"
            />
          </TabsContent>

          <TabsContent value="nhima">
            <ScheduleTable
              onPdf={pdfNhima} rows={nhima as any}
              filename={`nhima-${periodLabel}`}
              cols={[
                { h: "Code", k: "code" }, { h: "Employee", k: "name" }, { h: "NHIMA No.", k: "nhimaNo" },
                { h: "Basic", k: "basic", money: true },
                { h: "Employee 1%", k: "employee", money: true }, { h: "Employer 1%", k: "employer", money: true },
                { h: "Total", k: "total", money: true },
              ]}
              totalKey="total"
            />
          </TabsContent>

          <TabsContent value="overtime">
            <ScheduleTable
              onPdf={pdfOvertime} rows={ot as any}
              filename={`overtime-${periodLabel}`}
              cols={[
                { h: "Code", k: "code" }, { h: "Employee", k: "name" },
                { h: "OT Hours", k: "hours", num: true },
                { h: "Overtime Pay", k: "overtimePay", money: true },
              ]}
              totalKey="overtimePay"
            />
          </TabsContent>

          <TabsContent value="leave">
            <ScheduleTable
              onPdf={pdfLeave} rows={leave as any}
              filename={`leave-${periodLabel}`}
              cols={[
                { h: "Code", k: "code" }, { h: "Employee", k: "name" },
                { h: "Entitlement", k: "entitlement", num: true },
                { h: "Taken", k: "taken", num: true },
                { h: "Balance", k: "balance", num: true },
                { h: "Leave Pay", k: "leavePay", money: true },
              ]}
              totalKey="leavePay"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ScheduleTable({
  rows, cols, onPdf, filename, totalKey,
}: {
  rows: any[];
  cols: { h: string; k: string; money?: boolean; num?: boolean }[];
  onPdf: () => void | Promise<void>;
  filename: string;
  totalKey?: string;
}) {
  const total = totalKey ? rows.reduce((a, r) => a + (Number(r[totalKey]) || 0), 0) : 0;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => exportCsv(rows, `${filename}.csv`)}><Download className="h-4 w-4 mr-1" />CSV</Button>
        <Button size="sm" onClick={onPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase border-b"><tr>
            {cols.map(c => <th key={c.k} className={c.money || c.num ? "text-right py-2" : "text-left py-2"}>{c.h}</th>)}
          </tr></thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map(c => (
                  <td key={c.k} className={c.money || c.num ? "text-right py-1.5" : "py-1.5"}>
                    {c.money ? fmt(num(r[c.k])) : c.num ? Number(r[c.k] || 0).toFixed(2) : r[c.k]}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length} className="text-slate-400 py-4">No data.</td></tr>}
          </tbody>
          {totalKey && rows.length > 0 && (
            <tfoot className="border-t-2 font-semibold">
              <tr>
                <td colSpan={cols.length - 1} className="pt-2">TOTAL</td>
                <td className="pt-2 text-right">{fmt(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}
