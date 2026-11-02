/** Provider-neutral contracts shared by Sifonet vertical applications. */
export type ProductKey = "property" | "restaurant" | "boarding" | "butchery" | "lending";
export type Identifier = string;
export type ISODate = string;
export type ISODateTime = string;
export type CurrencyCode = "ZMW" | "USD" | (string & {});

export interface CompanyScope {
  tenantId: Identifier;
  companyId: Identifier;
  branchId?: Identifier | null;
  actorId: Identifier;
  deviceId?: Identifier | null;
}

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/** Convert a major-unit decimal to integer minor units without binary rounding drift. */
export function moneyFromMajor(amount: number, currency: CurrencyCode = "ZMW", minorDigits = 2): Money {
  if (!Number.isFinite(amount)) throw new TypeError("Money amount must be finite");
  if (!Number.isInteger(minorDigits) || minorDigits < 0 || minorDigits > 4) {
    throw new RangeError("minorDigits must be an integer from 0 to 4");
  }
  return { amountMinor: Math.round((amount + Number.EPSILON) * 10 ** minorDigits), currency };
}

export interface AuditEvent {
  id: Identifier;
  scope: CompanyScope;
  product: ProductKey;
  action: string;
  entityType: string;
  entityId: Identifier;
  occurredAt: ISODateTime;
  correlationId?: Identifier;
  metadata?: Record<string, unknown>;
}

export interface JournalLine {
  accountCode: string;
  description: string;
  debit: Money;
  credit: Money;
}

export interface JournalDraft {
  idempotencyKey: string;
  scope: CompanyScope;
  sourceProduct: ProductKey;
  sourceType: string;
  sourceId: Identifier;
  reference: string;
  description: string;
  effectiveDate: ISODate;
  lines: JournalLine[];
}

export interface JournalPostingResult {
  journalId: Identifier;
  journalNumber: string;
  status: "posted" | "already_posted";
}

export type FiscalDocumentType = "invoice" | "credit_note" | "debit_note" | "receipt";
export type FiscalEnvironment = "test" | "production";
export type FiscalSubmissionStatus =
  | "draft" | "queued" | "submitting" | "accepted" | "rejected" | "failed" | "cancelled";

export interface FiscalDocumentDraft {
  id: Identifier;
  idempotencyKey: string;
  scope: CompanyScope;
  product: ProductKey;
  documentType: FiscalDocumentType;
  documentNumber: string;
  issueDate: ISODate;
  currency: CurrencyCode;
  lines: Array<{ description: string; quantity: number; unitPrice: Money; taxCode?: string }>;
}

export interface FiscalSubmissionResult {
  documentId: Identifier;
  status: FiscalSubmissionStatus;
  environment: FiscalEnvironment;
  fiscalReference?: string;
  receiptQrPayload?: string;
  responseCode?: string;
  responseMessage?: string;
}

export type PrintJobKind = "receipt" | "invoice" | "kitchen" | "bar" | "label" | "report" | "document";
export type PrintJobStatus = "queued" | "printing" | "printed" | "failed" | "cancelled";

export interface PrintJob {
  id: Identifier;
  idempotencyKey: string;
  scope: CompanyScope;
  product: ProductKey;
  kind: PrintJobKind;
  documentReference: string;
  printerName?: string;
  copies: number;
  payload: unknown;
  status: PrintJobStatus;
  createdAt: ISODateTime;
}

export type SyncOperation = "insert" | "update" | "delete" | "command";
export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export interface OfflineMutation {
  id: Identifier;
  idempotencyKey: string;
  scope: CompanyScope;
  product: ProductKey;
  entity: string;
  entityId: Identifier;
  operation: SyncOperation;
  baseVersion?: number;
  payload: unknown;
  status: SyncStatus;
  createdAt: ISODateTime;
  attempts: number;
}

export interface ServiceResult<T> {
  ok: true;
  data: T;
  correlationId?: Identifier;
}

export interface ServiceFailure {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
  correlationId?: Identifier;
}

export type Result<T> = ServiceResult<T> | ServiceFailure;

/** Financial posting invariant: every line is non-negative and total debits equal credits. */
export function validateJournalDraft(draft: JournalDraft): { valid: true; totalMinor: number } | { valid: false; reason: string } {
  if (!draft.lines.length) return { valid: false, reason: "Journal must contain at least one line" };
  let debit = 0;
  let credit = 0;
  for (const line of draft.lines) {
    if (!line.accountCode.trim()) return { valid: false, reason: "Every journal line needs an account code" };
    if (line.debit.amountMinor < 0 || line.credit.amountMinor < 0) {
      return { valid: false, reason: "Journal amounts cannot be negative" };
    }
    if (line.debit.currency !== line.credit.currency) {
      return { valid: false, reason: "Debit and credit currency must match within a line" };
    }
    debit += line.debit.amountMinor;
    credit += line.credit.amountMinor;
  }
  if (debit <= 0 || debit !== credit) return { valid: false, reason: "Journal is not balanced" };
  return { valid: true, totalMinor: debit };
}
