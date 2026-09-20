import { getDb, generateUUID } from "@/lib/db/database";

export { assertFiscalTransition } from "./fiscal-state";
export type { FiscalState } from "./fiscal-state";

export function nextDocumentNumber(args: {
  userId: string;
  companyId?: string | null;
  branchId?: string | null;
  documentType: string;
  prefix: string;
  periodKey?: string;
  padding?: number;
}) {
  const db = getDb();
  const periodKey = args.periodKey ?? new Date().toISOString().slice(0, 7);
  const padding = args.padding ?? 6;
  const existing = db.prepare(
    "SELECT id,next_number FROM document_sequences WHERE user_id=? AND (? IS NULL OR company_id=?) AND (? IS NULL OR branch_id=?) AND document_type=? AND period_key=? LIMIT 1",
  ).get(args.userId,args.companyId ?? null,args.companyId ?? null,args.branchId ?? null,args.branchId ?? null,args.documentType,periodKey) as any;

  if (existing) {
    db.prepare("UPDATE document_sequences SET next_number=next_number+1,updated_at=datetime('now') WHERE id=?").run(existing.id);
    return `${args.prefix}-${periodKey.replace("-", "")}-${String(existing.next_number).padStart(padding, "0")}`;
  }

  const id = generateUUID();
  db.prepare(
    "INSERT INTO document_sequences (id,user_id,company_id,branch_id,document_type,prefix,next_number,padding,period_key) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(id,args.userId,args.companyId ?? null,args.branchId ?? null,args.documentType,args.prefix,2,padding,periodKey);
  return `${args.prefix}-${periodKey.replace("-", "")}-${String(1).padStart(padding, "0")}`;
}

export function assertPeriodOpen(userId: string, periodDate: string, companyId?: string | null) {
  const period = String(periodDate).slice(0, 7);
  const db = getDb();
  const row = db.prepare(
    "SELECT status FROM financial_periods WHERE user_id=? AND fiscal_year=? AND period_month=? LIMIT 1",
  ).get(userId,Number(period.slice(0,4)),Number(period.slice(5,7))) as any;
  if (row?.status && String(row.status).toLowerCase() === "closed") {
    throw new Error(`ACCOUNTING_PERIOD_CLOSED: ${period} is closed.`);
  }
  const control = db.prepare(
    "SELECT status FROM period_controls WHERE user_id=? AND (? IS NULL OR company_id=?) AND financial_period_id IN (SELECT id FROM financial_periods WHERE user_id=? AND fiscal_year=? AND period_month=?) LIMIT 1",
  ).get(userId,companyId ?? null,companyId ?? null,userId,Number(period.slice(0,4)),Number(period.slice(5,7))) as any;
  if (control?.status && control.status !== "OPEN") {
    throw new Error(`ACCOUNTING_PERIOD_CLOSED: ${period} is not open.`);
  }
}

function stable(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, Object.keys(value as any).sort());
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2,"0")).join("");
}

export async function recordAuditEvent(args: {
  userId: string;
  companyId?: string | null;
  branchId?: string | null;
  terminalId?: string | null;
  actorEmail?: string | null;
  role?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  approvalId?: string | null;
  ipAddress?: string | null;
  deviceId?: string | null;
}) {
  const db = getDb();
  const previous = db.prepare("SELECT event_hash FROM audit_event_log WHERE user_id=? ORDER BY created_at DESC LIMIT 1").get(args.userId) as any;
  const previousHash = previous?.event_hash ?? "";
  const createdAt = new Date().toISOString();
  const body = [
    args.userId,args.companyId,args.branchId,args.terminalId,args.action,args.entityType,args.entityId,
    stable(args.previousValue),stable(args.newValue),args.reason,args.approvalId,args.deviceId,createdAt,previousHash,
  ].join("|");
  const eventHash = await sha256(body);
  db.prepare(
    "INSERT INTO audit_event_log (id,user_id,company_id,branch_id,terminal_id,actor_email,role,action,entity_type,entity_id,previous_value,new_value,reason,approval_id,ip_address,device_id,created_at,previous_hash,event_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    generateUUID(),args.userId,args.companyId ?? null,args.branchId ?? null,args.terminalId ?? null,args.actorEmail ?? null,
    args.role ?? null,args.action,args.entityType ?? null,args.entityId ?? null,stable(args.previousValue),stable(args.newValue),
    args.reason ?? null,args.approvalId ?? null,args.ipAddress ?? null,args.deviceId ?? null,createdAt,previousHash,eventHash,
  );
  return eventHash;
}

export function enqueueZraOperation(args: {
  userId: string;
  branchId?: string | null;
  terminalId?: string | null;
  sourceType: string;
  sourceId: string;
  operation: string;
  idempotencyKey: string;
  payload: unknown;
}) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM zra_outbox WHERE idempotency_key=? LIMIT 1").get(args.idempotencyKey) as any;
  if (existing) return existing;
  const id = generateUUID();
  db.prepare(
    "INSERT INTO zra_outbox (id,user_id,branch_id,terminal_id,source_type,source_id,operation,idempotency_key,status,payload,next_attempt_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))",
  ).run(id,args.userId,args.branchId ?? null,args.terminalId ?? null,args.sourceType,args.sourceId,args.operation,args.idempotencyKey,"PENDING",JSON.stringify(args.payload));
  return db.prepare("SELECT * FROM zra_outbox WHERE id=?").get(id);
}

export function updateZraOutbox(id: string, patch: {
  status: string;
  requestId?: string | null;
  response?: unknown;
  httpStatus?: number | null;
  resultCode?: string | null;
  resultMessage?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const db = getDb();
  db.prepare(
    "UPDATE zra_outbox SET status=?,request_id=?,response=?,http_status=?,result_code=?,result_message=?,error_code=?,error_message=?,last_attempt_at=datetime('now'),attempt_count=attempt_count+1,updated_at=datetime('now') WHERE id=?",
  ).run(
    patch.status,patch.requestId ?? null,patch.response == null ? null : JSON.stringify(patch.response),patch.httpStatus ?? null,
    patch.resultCode ?? null,patch.resultMessage ?? null,patch.errorCode ?? null,patch.errorMessage ?? null,id,
  );
}
