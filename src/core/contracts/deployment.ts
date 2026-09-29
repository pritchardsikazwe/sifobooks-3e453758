/**
 * Deployment modes shared by every SifoBooks edition.
 * Platform-neutral: no Bun/Node/browser imports.
 */
export type DeploymentMode = "cloud" | "windows-standalone" | "local-server" | "hybrid";

/** Maps legacy mode names (runtime.ts / SIFOBOOKS_MODE) onto the four agreed modes. */
export function normalizeDeploymentMode(raw: string | undefined | null, isLocalBackend: boolean): DeploymentMode {
  const v = String(raw ?? "").toLowerCase();
  if (v === "hybrid") return "hybrid";
  if (v === "network" || v === "server" || v === "lan-server" || v === "local-server") return "local-server";
  if (v === "offline" || v === "windows" || v === "windows-standalone" || v === "pos" || v === "pos-client")
    return isLocalBackend ? "windows-standalone" : "cloud";
  if (v === "cloud") return "cloud";
  return isLocalBackend ? "windows-standalone" : "cloud";
}

/** A device belongs to one company + branch. Installing on a new PC never creates a company. */
export interface DeviceIdentity {
  deviceId: string;
  companyId: string | null;
  branchId: string | null;
  deviceType: "browser" | "windows" | "pos" | "server";
  deviceName?: string;
}

export interface DeviceRegistryPort {
  register(identity: DeviceIdentity): Promise<{ ok: boolean; error?: string }>;
}

/** Sync envelope fields every synchronised transaction carries. */
export interface SyncEnvelope {
  localId: string;
  idempotencyKey: string;
  companyId: string | null;
  branchId: string | null;
  deviceId: string;
  status: "pending" | "syncing" | "synced" | "failed" | "conflict";
  createdAt: number;
  updatedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
  cloudRecordId?: string;
}
