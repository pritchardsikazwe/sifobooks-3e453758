// Typed, secret-free startup/runtime diagnostics shown instead of a generic error.
export type DiagnosticCode =
  | "DB_UNAVAILABLE"
  | "MIGRATION_REQUIRED"
  | "COMPANY_NOT_CONFIGURED"
  | "DEVICE_NOT_REGISTERED"
  | "CLOUD_UNAVAILABLE"
  | "SYNC_PENDING"
  | "PERMISSION_DENIED"
  | "UNKNOWN";

export const DIAGNOSTIC_TEXT: Record<DiagnosticCode, { title: string; hint: string }> = {
  DB_UNAVAILABLE: { title: "Database unavailable", hint: "The local database could not be opened. Your data has not been deleted. Restart SifoBooks or contact support." },
  MIGRATION_REQUIRED: { title: "Database update required", hint: "SifoBooks needs to update its database. A backup is taken first; no data is removed." },
  COMPANY_NOT_CONFIGURED: { title: "Company not configured", hint: "Create a company or sign in to an existing one to continue." },
  DEVICE_NOT_REGISTERED: { title: "Device not registered", hint: "This device must be authorised for your company before use." },
  CLOUD_UNAVAILABLE: { title: "Cloud unavailable", hint: "SifoBooks Cloud can't be reached. Check your Internet connection and try again." },
  SYNC_PENDING: { title: "Sync pending", hint: "Some changes are saved on this device and will synchronise when the connection returns." },
  PERMISSION_DENIED: { title: "Permission denied", hint: "Your account doesn't have access to this page. Ask your administrator." },
  UNKNOWN: { title: "This page didn't load", hint: "Something went wrong. You can try again or head back home." },
};

const SECRET_RE = /(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_(secret|publishable)_\w+|password\S*|api[_-]?key\S*|bearer\s+\S+)/gi;

export function redact(s: string) {
  return s.replace(SECRET_RE, "[redacted]");
}

export function classifyError(err: unknown): DiagnosticCode {
  const e = err as any;
  const code = e?.diagnostic as DiagnosticCode | undefined;
  if (code && code in DIAGNOSTIC_TEXT) return code;
  const msg = String(e?.message ?? e ?? "").toLowerCase();
  const status = Number(e?.status ?? e?.statusCode ?? 0);
  if (status === 401 || status === 403 || /permission denied|not authori[sz]ed|forbidden|row-level security/.test(msg)) return "PERMISSION_DENIED";
  if (/no such table|no such column|migration|schema version/.test(msg)) return "MIGRATION_REQUIRED";
  if (/sqlite|database is locked|unable to open database/.test(msg)) return "DB_UNAVAILABLE";
  if (/failed to fetch|networkerror|network request failed|load failed|err_internet/.test(msg)) return "CLOUD_UNAVAILABLE";
  if (/company not configured|no company/.test(msg)) return "COMPANY_NOT_CONFIGURED";
  if (/device not registered/.test(msg)) return "DEVICE_NOT_REGISTERED";
  return "UNKNOWN";
}

export class DiagnosticError extends Error {
  constructor(public diagnostic: DiagnosticCode, message?: string) {
    super(message ?? DIAGNOSTIC_TEXT[diagnostic].title);
  }
}
