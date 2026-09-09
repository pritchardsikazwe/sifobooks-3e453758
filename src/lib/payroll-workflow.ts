export const PAYROLL_STATUSES = [
  "draft",
  "calculated",
  "reviewed",
  "approved",
  "posted",
  "paid",
  "locked",
  "reversed",
] as const;

export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

const TRANSITIONS: Record<PayrollStatus, readonly PayrollStatus[]> = {
  draft: ["calculated"],
  calculated: ["reviewed", "draft"],
  reviewed: ["approved", "calculated"],
  approved: ["posted", "reviewed"],
  posted: ["paid", "reversed"],
  paid: ["locked", "reversed"],
  locked: ["reversed"],
  reversed: [],
};

const CONTROLLED: ReadonlySet<PayrollStatus> = new Set([
  "approved",
  "posted",
  "paid",
  "locked",
  "reversed",
]);

export function isPayrollStatus(value: string | null | undefined): value is PayrollStatus {
  return !!value && (PAYROLL_STATUSES as readonly string[]).includes(value);
}

export function canTransitionPayrollRun(
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  if (!isPayrollStatus(from) || !isPayrollStatus(to) || from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function isControlledPayrollTransition(
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  return isPayrollStatus(to) && CONTROLLED.has(to);
}

export function payrollTransitionLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function payrollTransitionError(
  from: string | null | undefined,
  to: string | null | undefined,
): string | null {
  if (!isPayrollStatus(from) || !isPayrollStatus(to)) return "Invalid payroll status.";
  if (from === to) return "The payroll run is already in this status.";
  if (!canTransitionPayrollRun(from, to)) {
    return `Payroll cannot move directly from ${payrollTransitionLabel(from)} to ${payrollTransitionLabel(to)}.`;
  }
  return null;
}

export function requiresPayrollTransitionReason(
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  if (!isPayrollStatus(to)) return false;
  if (to === "reversed") return true;
  if (to === "approved" || to === "posted" || to === "paid" || to === "locked") return true;
  return from === "locked";
}

export function isPayrollFinalStatus(status: string | null | undefined): boolean {
  return status === "locked" || status === "reversed";
}

export function payrollWorkflowSummary(status: string | null | undefined): string {
  switch (status) {
    case "draft": return "Draft — payroll inputs can be prepared.";
    case "calculated": return "Calculated — statutory deductions and net pay have been computed.";
    case "reviewed": return "Reviewed — payroll has passed review and is ready for approval.";
    case "approved": return "Approved — authorised for posting to the ledger.";
    case "posted": return "Posted — payroll journal has been posted.";
    case "paid": return "Paid — payment schedule has been confirmed.";
    case "locked": return "Locked — payroll is final and should not be edited.";
    case "reversed": return "Reversed — the payroll posting has been reversed.";
    default: return "Unknown payroll workflow state.";
  }
}
