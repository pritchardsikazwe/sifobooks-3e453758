// ============================================================
// Payroll review checks — SifoBooks
//
// Pure validation over payslips that were already calculated for a run,
// plus the employee records behind them and the previous run for
// comparison. Nothing here writes, calculates pay, or invents figures.
// ============================================================

export type ReviewSlip = {
  id: string;
  employee_id: string;
  basic_salary?: number | null;
  allowances?: number | null;
  overtime?: number | null;
  gross_pay?: number | null;
  paye?: number | null;
  napsa?: number | null;
  nhima?: number | null;
  other_deductions?: number | null;
  loan_deduction?: number | null;
  net_pay?: number | null;
};

export type ReviewEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string | null;
  national_id?: string | null;
  tpin?: string | null;
  napsa_number?: string | null;
  nhima_number?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  status?: string | null;
};

export type Severity = "blocker" | "warning";

export type ReviewIssue = {
  code:
    | "negative_net"
    | "zero_net"
    | "gross_mismatch"
    | "duplicate_employee"
    | "missing_bank"
    | "missing_statutory_id"
    | "net_variance"
    | "overtime_outlier"
    | "allowance_outlier"
    | "new_employee"
    | "dropped_employee";
  severity: Severity;
  employeeId: string | null;
  name: string;
  message: string;
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (v: number) => Math.round(v * 100) / 100;

export function slipDeductions(s: ReviewSlip): number {
  return r2(n(s.paye) + n(s.napsa) + n(s.nhima) + n(s.other_deductions) + n(s.loan_deduction));
}

export function runTotals(slips: ReviewSlip[]) {
  const t = slips.reduce(
    (a, s) => ({
      employees: a.employees + 1,
      basic: a.basic + n(s.basic_salary),
      allowances: a.allowances + n(s.allowances),
      overtime: a.overtime + n(s.overtime),
      gross: a.gross + n(s.gross_pay),
      paye: a.paye + n(s.paye),
      napsa: a.napsa + n(s.napsa),
      nhima: a.nhima + n(s.nhima),
      other: a.other + n(s.other_deductions) + n(s.loan_deduction),
      net: a.net + n(s.net_pay),
    }),
    { employees: 0, basic: 0, allowances: 0, overtime: 0, gross: 0, paye: 0, napsa: 0, nhima: 0, other: 0, net: 0 },
  );
  return {
    ...t,
    basic: r2(t.basic), allowances: r2(t.allowances), overtime: r2(t.overtime), gross: r2(t.gross),
    paye: r2(t.paye), napsa: r2(t.napsa), nhima: r2(t.nhima), other: r2(t.other), net: r2(t.net),
    deductions: r2(t.paye + t.napsa + t.nhima + t.other),
  };
}

export type ReviewOptions = {
  /** Net pay movement beyond this fraction of the previous period is flagged. */
  varianceThreshold?: number;
  /** Overtime beyond this fraction of basic is flagged. */
  overtimeThreshold?: number;
};

export function reviewPayroll(
  slips: ReviewSlip[],
  employees: ReviewEmployee[],
  previousSlips: ReviewSlip[] = [],
  options: ReviewOptions = {},
): ReviewIssue[] {
  const varianceThreshold = options.varianceThreshold ?? 0.25;
  const overtimeThreshold = options.overtimeThreshold ?? 0.5;
  const byId = new Map(employees.map((e) => [e.id, e]));
  const prevById = new Map(previousSlips.map((s) => [s.employee_id, s]));
  const issues: ReviewIssue[] = [];
  const seen = new Map<string, number>();

  const nameOf = (id: string) => {
    const e = byId.get(id);
    return e ? `${e.first_name} ${e.last_name}`.trim() : "Unknown employee";
  };

  for (const s of slips) {
    const name = nameOf(s.employee_id);
    const e = byId.get(s.employee_id);
    seen.set(s.employee_id, (seen.get(s.employee_id) ?? 0) + 1);

    const net = n(s.net_pay);
    if (net < 0) {
      issues.push({ code: "negative_net", severity: "blocker", employeeId: s.employee_id, name, message: `Net pay is negative (${net.toFixed(2)}) — deductions exceed earnings.` });
    } else if (net === 0) {
      issues.push({ code: "zero_net", severity: "warning", employeeId: s.employee_id, name, message: "Net pay is zero for this period." });
    }

    const expectedNet = r2(n(s.gross_pay) - slipDeductions(s));
    if (Math.abs(expectedNet - r2(net)) > 0.01) {
      issues.push({ code: "gross_mismatch", severity: "blocker", employeeId: s.employee_id, name, message: `Gross less deductions is ${expectedNet.toFixed(2)} but net pay says ${r2(net).toFixed(2)}.` });
    }

    if (e && net > 0 && (!e.bank_account?.trim() || !e.bank_name?.trim())) {
      issues.push({ code: "missing_bank", severity: "warning", employeeId: s.employee_id, name, message: "No bank name or account on the employee record — this payment cannot go on a bank file." });
    }

    if (e) {
      const missing: string[] = [];
      if (!e.national_id?.trim()) missing.push("NRC");
      if (n(s.paye) > 0 && !e.tpin?.trim()) missing.push("TPIN");
      if (n(s.napsa) > 0 && !e.napsa_number?.trim()) missing.push("NAPSA number");
      if (n(s.nhima) > 0 && !e.nhima_number?.trim()) missing.push("NHIMA number");
      if (missing.length) {
        issues.push({ code: "missing_statutory_id", severity: "warning", employeeId: s.employee_id, name, message: `Missing ${missing.join(", ")} — statutory files will reject this employee.` });
      }
    }

    const basic = n(s.basic_salary);
    if (basic > 0 && n(s.overtime) > basic * overtimeThreshold) {
      issues.push({ code: "overtime_outlier", severity: "warning", employeeId: s.employee_id, name, message: `Overtime of ${n(s.overtime).toFixed(2)} is more than ${(overtimeThreshold * 100).toFixed(0)}% of basic pay.` });
    }
    if (basic > 0 && n(s.allowances) > basic) {
      issues.push({ code: "allowance_outlier", severity: "warning", employeeId: s.employee_id, name, message: `Allowances of ${n(s.allowances).toFixed(2)} exceed basic pay.` });
    }

    const prev = prevById.get(s.employee_id);
    if (!prev && previousSlips.length > 0) {
      issues.push({ code: "new_employee", severity: "warning", employeeId: s.employee_id, name, message: "First payslip — this employee was not on the previous run." });
    } else if (prev) {
      const before = n(prev.net_pay);
      if (before > 0) {
        const change = (net - before) / before;
        if (Math.abs(change) > varianceThreshold) {
          issues.push({
            code: "net_variance",
            severity: "warning",
            employeeId: s.employee_id,
            name,
            message: `Net pay moved ${(change * 100).toFixed(1)}% against last period (${before.toFixed(2)} → ${r2(net).toFixed(2)}).`,
          });
        }
      }
    }
  }

  for (const [id, count] of seen) {
    if (count > 1) {
      issues.push({ code: "duplicate_employee", severity: "blocker", employeeId: id, name: nameOf(id), message: `${count} payslips exist for this employee on the same run.` });
    }
  }

  for (const prev of previousSlips) {
    if (!seen.has(prev.employee_id)) {
      issues.push({ code: "dropped_employee", severity: "warning", employeeId: prev.employee_id, name: nameOf(prev.employee_id), message: "Paid last period but not on this run." });
    }
  }

  const order: Record<Severity, number> = { blocker: 0, warning: 1 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity] || a.name.localeCompare(b.name));
}

export function blockers(issues: ReviewIssue[]): ReviewIssue[] {
  return issues.filter((i) => i.severity === "blocker");
}

export function varianceRows(slips: ReviewSlip[], previousSlips: ReviewSlip[], employees: ReviewEmployee[]) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const prevById = new Map(previousSlips.map((s) => [s.employee_id, s]));
  return slips
    .map((s) => {
      const e = byId.get(s.employee_id);
      const before = n(prevById.get(s.employee_id)?.net_pay);
      const now = n(s.net_pay);
      return {
        employeeId: s.employee_id,
        name: e ? `${e.first_name} ${e.last_name}`.trim() : "Unknown employee",
        code: e?.employee_code ?? null,
        gross: r2(n(s.gross_pay)),
        deductions: slipDeductions(s),
        net: r2(now),
        previousNet: r2(before),
        diff: r2(now - before),
        pct: before === 0 ? null : r2(((now - before) / Math.abs(before)) * 100),
      };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
