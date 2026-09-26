import type { RuntimeCapabilities, RuntimePort } from "@/core/contracts/runtime";

/**
 * Windows runtime adapter boundary.
 *
 * The existing Bun/SQLite desktop implementation remains in
 * src/desktop/server.ts. This adapter is intentionally small and
 * dependency-light so the migration can happen incrementally.
 */
export function getWindowsRuntimeCapabilities(): RuntimeCapabilities {
  const mode = String(process.env.SIFOBOOKS_MODE || "offline").toLowerCase();

  return {
    mode: mode === "server"
      ? "lan-server"
      : mode === "pos"
        ? "pos-client"
        : mode === "windows"
          ? "windows"
          : "offline",
    offline: true,
    localDatabase: true,
    cloudDatabase: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
    localPrinting: true,
    windowsHardware: true,
    vsdc: true,
  };
}

export const windowsRuntime: RuntimePort = {
  capabilities: getWindowsRuntimeCapabilities,
};
