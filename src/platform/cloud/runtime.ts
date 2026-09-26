import type { RuntimeCapabilities, RuntimePort } from "@/core/contracts/runtime";

/**
 * Cloud runtime adapter boundary.
 *
 * PostgreSQL implementation remains in src/lib/cloud/postgres.ts.
 * This file defines the platform boundary without moving the existing
 * production database implementation yet.
 */
export function getCloudRuntimeCapabilities(): RuntimeCapabilities {
  return {
    mode: "cloud",
    offline: false,
    localDatabase: false,
    cloudDatabase: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
    localPrinting: false,
    windowsHardware: false,
    vsdc: false,
  };
}

export const cloudRuntime: RuntimePort = {
  capabilities: getCloudRuntimeCapabilities(),
};
