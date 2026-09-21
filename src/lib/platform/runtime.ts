export type SifoBooksMode = "offline" | "network" | "cloud" | "hybrid";

export interface SifoBooksRuntime {
  mode: SifoBooksMode;
  host: string;
  port: number;
  databaseEngine: "sqlite" | "postgres";
  offlineEnabled: boolean;
  syncEnabled: boolean;
  pwaEnabled: boolean;
  printingMode: "system" | "local_bridge" | "network";
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function getSifoBooksRuntime(): SifoBooksRuntime {
  const rawMode = (typeof process !== "undefined" ? process.env?.SIFOBOOKS_MODE : undefined) || "offline";
  const mode: SifoBooksMode =
    rawMode === "network" || rawMode === "cloud" || rawMode === "hybrid" ? rawMode : "offline";
  const databaseEngine =
    (typeof process !== "undefined" ? process.env?.SIFOBOOKS_DATABASE : undefined) === "postgres"
      ? "postgres"
      : "sqlite";
  return {
    mode,
    host: (typeof process !== "undefined" ? process.env?.SIFOBOOKS_HOST : undefined) || "127.0.0.1",
    port: Number((typeof process !== "undefined" ? process.env?.PORT : undefined) || 3000),
    databaseEngine,
    offlineEnabled: envBoolean("SIFOBOOKS_OFFLINE_ENABLED", mode === "offline" || mode === "hybrid"),
    syncEnabled: envBoolean("SIFOBOOKS_SYNC_ENABLED", mode === "cloud" || mode === "hybrid" || mode === "network"),
    pwaEnabled: envBoolean("SIFOBOOKS_PWA_ENABLED", true),
    printingMode:
      ((typeof process !== "undefined" ? process.env?.SIFOBOOKS_PRINTING : undefined) as SifoBooksRuntime["printingMode"]) ||
      "system",
  };
}
