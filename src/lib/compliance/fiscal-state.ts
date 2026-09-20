export type FiscalState = "DRAFT" | "POSTED" | "SUBMITTED" | "ACCEPTED" | "FISCALIZED" | "REJECTED" | "CORRECTION_REQUIRED";

const ALLOWED: Record<FiscalState, FiscalState[]> = {
  DRAFT: ["POSTED"],
  POSTED: ["SUBMITTED", "CORRECTION_REQUIRED"],
  SUBMITTED: ["ACCEPTED", "REJECTED", "CORRECTION_REQUIRED"],
  ACCEPTED: ["FISCALIZED"],
  FISCALIZED: [],
  REJECTED: ["CORRECTION_REQUIRED", "SUBMITTED"],
  CORRECTION_REQUIRED: ["SUBMITTED"],
};

export function assertFiscalTransition(from: FiscalState, to: FiscalState) {
  if (from === to) return;
  if (!ALLOWED[from]?.includes(to)) throw new Error(`FISCAL_STATE_INVALID: ${from} -> ${to} is not permitted.`);
}
