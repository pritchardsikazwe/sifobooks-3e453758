/**
 * ZRA / VSDC integration boundary (preparation only — no production connection).
 * SifoBooks -> FiscalDevicePort -> VSDC -> ZRA Smart Invoice.
 * A transaction is fiscalised ONLY when submit() returns status "fiscalized"
 * from a real VSDC response. SifoBooks is not ZRA certified.
 */
export interface FiscalSubmission {
  companyId: string;
  branchId: string | null;
  documentType: "sale" | "credit_note" | "invoice";
  documentId: string;
  payload: unknown;
}

export type FiscalResult =
  | { status: "fiscalized"; receiptNumber: string; signature?: string; raw: unknown }
  | { status: "rejected"; error: string; raw?: unknown }
  | { status: "not_configured" }
  | { status: "unavailable"; error: string };

export interface FiscalDevicePort {
  readonly name: string;
  isConfigured(): Promise<boolean>;
  submit(doc: FiscalSubmission): Promise<FiscalResult>;
}

/** Default adapter: never fiscalises anything. */
export const notConfiguredFiscalDevice: FiscalDevicePort = {
  name: "not-configured",
  async isConfigured() { return false; },
  async submit() { return { status: "not_configured" }; },
};

export function isFiscalized(r: FiscalResult): r is Extract<FiscalResult, { status: "fiscalized" }> {
  return r.status === "fiscalized" && typeof (r as any).receiptNumber === "string" && (r as any).receiptNumber.length > 0;
}
