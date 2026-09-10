// ============================================================
// Zambian statutory filing engine — SifoBooks Payroll
//
// Builds PAYE / NAPSA / NHIMA filing figures from the payslips that
// were actually calculated for a payroll run, reconciles them against
// the run totals, and lists the employees that would make a filing
// fail (missing TPIN, NAPSA number, NHIMA number or NRC).
//
// Nothing in here transmits anything. SifoBooks prepares the file and
// records what you did with it; submission to ZRA TaxOnline or NAPSA
// iCARE happens on those portals unless a certified connection exists.
// ============================================================

export type FilingType = "paye" | "napsa" | "nhima";

export const FILING_LABELS: Record<FilingType, string> = {
  paye: "PAYE (ZRA)",
  napsa: "NAPSA contributions",
  nhima: "NHIMA contributions",
};

/** Statuses shown in the statutory centre. */
export type FilingStatus = "ready" | "needs_configuration" | "exported" | "submitted" | "failed";

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  ready: "Ready to file",
  needs_configuration: "Needs configuration",
  exported: "File downloaded",
  submitted: "Marked submitted",
  failed: "Failed",
};

export type SlipRow = {
  employee_id: string;
  basic_salary?: number | null;
  gross_pay?: number | null;
  paye?: number | null;
  napsa?: number | null;
  nhima?: number | null;
  net_pay?: number | null;
};

export type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code?: string | null;
  national_id?: string | null;
  tpin?: string | null;
  napsa_number?: string | null;
  nhima_number?: string | null;
  bank_account?: string | null;
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (v: number) => Math.round(v * 100) / 100;

export type FilingFigures = {
  type: FilingType;
  employees: number;
  employeeAmount: number;
  employerAmount: number;
  total: number;
};

/**
 * Employee and employer sides of each statutory filing.
 * NAPSA is matched by the employer; NHIMA is matched by the employer;
 * PAYE is an employee tax the employer only remits.
 */
export function filingFigures(slips: SlipRow[], type: FilingType): FilingFigures {
  const amount = (s: SlipRow) => (type === "paye" ? n(s.paye) : type === "napsa" ? n(s.napsa) : n(s.nhima));
  const contributing = slips.filter((s) => amount(s) > 0);
  const employeeAmount = r2(contributing.reduce((t, s) => t + amount(s), 0));
  const employerAmount = type === "paye" ? 0 : employeeAmount;
  return {
    type,
    employees: contributing.length,
    employeeAmount,
    employerAmount,
    total: r2(employeeAmount + employerAmount),
  };
}

/**
 * Compare the figures rebuilt from payslips with the totals stored on the
 * payroll run. A non-zero difference means the run header and its payslips
 * have drifted apart and the filing should not be sent.
 */
export function reconcileFiling(figures: FilingFigures, runTotal: number | null | undefined) {
  const payroll = r2(n(runTotal));
  const difference = r2(figures.employeeAmount - payroll);
  return { payroll, difference, reconciled: Math.abs(difference) < 0.01 };
}

export type FilingException = {
  employeeId: string;
  name: string;
  missing: string[];
};

/** Employees in this run whose identifiers are not complete enough to file. */
export function filingExceptions(
  slips: SlipRow[],
  employees: EmployeeRow[],
  type: FilingType,
): FilingException[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const out: FilingException[] = [];
  for (const s of slips) {
    const e = byId.get(s.employee_id);
    if (!e) continue;
    const missing: string[] = [];
    if (type === "paye") {
      if (!e.tpin?.trim()) missing.push("TPIN");
      if (!e.national_id?.trim()) missing.push("NRC");
      if (n(s.paye) <= 0) continue;
    }
    if (type === "napsa") {
      if (!e.napsa_number?.trim()) missing.push("NAPSA number");
      if (!e.national_id?.trim()) missing.push("NRC");
      if (n(s.napsa) <= 0) continue;
    }
    if (type === "nhima") {
      if (!e.nhima_number?.trim()) missing.push("NHIMA number");
      if (n(s.nhima) <= 0) continue;
    }
    if (missing.length) out.push({ employeeId: e.id, name: `${e.first_name} ${e.last_name}`.trim(), missing });
  }
  return out;
}

/** Derived readiness before anything has been exported or submitted. */
export function derivedStatus(opts: {
  figures: FilingFigures;
  reconciled: boolean;
  exceptions: number;
  recorded?: FilingStatus | null;
}): FilingStatus {
  if (opts.recorded === "submitted" || opts.recorded === "failed") return opts.recorded;
  if (opts.exceptions > 0 || !opts.reconciled) return "needs_configuration";
  if (opts.figures.employees === 0) return "needs_configuration";
  if (opts.recorded === "exported") return "exported";
  return "ready";
}

/** Plain-language reason a filing is not ready. */
export function statusReason(opts: {
  figures: FilingFigures;
  reconciled: boolean;
  difference: number;
  exceptions: number;
}): string | null {
  if (opts.figures.employees === 0) return "No employee on this run contributes to this filing.";
  if (!opts.reconciled)
    return `Payslips and the payroll run total differ by ${opts.difference.toFixed(2)}. Recalculate the run before filing.`;
  if (opts.exceptions > 0)
    return `${opts.exceptions} employee record(s) are missing an identifier the filing needs.`;
  return null;
}

/** Month-on-month movement, used for the variance column on the review screen. */
export function variance(current: number | null | undefined, previous: number | null | undefined) {
  const c = n(current);
  const p = n(previous);
  const diff = r2(c - p);
  const pct = p === 0 ? null : r2((diff / Math.abs(p)) * 100);
  return { current: r2(c), previous: r2(p), diff, pct };
}
