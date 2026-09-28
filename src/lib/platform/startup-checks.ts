// Browser-safe startup checks. Never throws: offline must not crash the app.
// Windows-only checks (SQLite schema version, migrations) are reported by the
// desktop server; in hosted mode they are "n/a".
import { IS_LOCAL_BACKEND } from "@/lib/platform/backend-mode";
import { normalizeDeploymentMode, type DeploymentMode } from "@/core/contracts/deployment";
import type { DiagnosticCode } from "@/lib/platform/diagnostics";

export type CheckStatus = "ok" | "warn" | "fail" | "n/a";
export interface StartupCheck { key: string; label: string; status: CheckStatus; code?: DiagnosticCode; detail?: string }
export interface StartupReport { mode: DeploymentMode; ready: boolean; checks: StartupCheck[] }

const DEVICE_KEY = "sifobooks_device_id";
const ACTIVATION_KEY = "sifobooks_device_activation";

export interface DeviceActivation { deviceId: string; companyId: string; branchId: string | null; activatedAt: string }

export function getDeploymentMode(): DeploymentMode {
  return normalizeDeploymentMode((import.meta as any).env?.VITE_SIFOBOOKS_MODE, IS_LOCAL_BACKEND);
}

export function getActivation(): DeviceActivation | null {
  if (typeof localStorage === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(ACTIVATION_KEY) || "null"); } catch { return null; }
}

export function saveActivation(a: DeviceActivation) {
  if (typeof localStorage !== "undefined") localStorage.setItem(ACTIVATION_KEY, JSON.stringify(a));
}

export async function runStartupChecks(): Promise<StartupReport> {
  const mode = getDeploymentMode();
  const checks: StartupCheck[] = [];
  const local = mode !== "cloud";

  // 1-3 database / schema / migrations
  if (local) {
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      const j = r.ok ? await r.json().catch(() => ({})) : {};
      checks.push({ key: "db", label: "Database available", status: r.ok ? "ok" : "fail", code: r.ok ? undefined : "DB_UNAVAILABLE" });
      checks.push({ key: "schema", label: "Schema version", status: j?.schemaVersion ? "ok" : "warn", detail: j?.schemaVersion ? String(j.schemaVersion) : "unknown" });
      checks.push({ key: "migrations", label: "Migrations", status: j?.pendingMigrations ? "fail" : "ok", code: j?.pendingMigrations ? "MIGRATION_REQUIRED" : undefined });
    } catch {
      checks.push({ key: "db", label: "Database available", status: "fail", code: "DB_UNAVAILABLE" });
    }
  } else {
    checks.push({ key: "db", label: "Database available", status: "n/a", detail: "Cloud database" });
  }

  // 4 company/device configuration
  const act = getActivation();
  const hasDevice = typeof localStorage !== "undefined" && !!localStorage.getItem(DEVICE_KEY);
  checks.push({
    key: "device", label: "Company / device configuration",
    status: act ? "ok" : local ? "fail" : "warn",
    code: act ? undefined : local ? "DEVICE_NOT_REGISTERED" : undefined,
    detail: act ? `Company ${act.companyId.slice(0, 8)}…` : hasDevice ? "Device id present, not activated" : "Not activated",
  });

  // 5 session
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    checks.push({ key: "session", label: "Authentication / session", status: data?.session ? "ok" : "warn", detail: data?.session ? "Signed in" : "Signed out" });
  } catch {
    checks.push({ key: "session", label: "Authentication / session", status: "warn" });
  }

  // 6 connectivity
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  checks.push({ key: "net", label: "Connectivity", status: online ? "ok" : "warn", code: online ? undefined : "CLOUD_UNAVAILABLE", detail: online ? "Online" : "Offline — working locally" });

  // 7 sync queue
  try {
    const { queueStats } = await import("@/lib/offline-queue");
    const s: any = await queueStats();
    const pending = Number(s?.pending ?? 0), failed = Number(s?.failed ?? 0);
    checks.push({ key: "sync", label: "Sync queue", status: failed ? "fail" : pending ? "warn" : "ok", code: failed || pending ? "SYNC_PENDING" : undefined, detail: `${pending} pending, ${failed} failed` });
  } catch {
    checks.push({ key: "sync", label: "Sync queue", status: "n/a" });
  }

  // 8 readiness: only DB/migration failures block; offline never blocks
  const ready = !checks.some((c) => c.status === "fail" && (c.code === "DB_UNAVAILABLE" || c.code === "MIGRATION_REQUIRED"));
  checks.push({ key: "ready", label: "Application readiness", status: ready ? "ok" : "fail" });
  return { mode, ready, checks };
}
