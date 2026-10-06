import { MODULES, OPTIONAL_WHEN_GATED, isModuleInstalled } from "@/lib/modules";

export const MODULE_GATE_KEY = "__gate__:on";

export function isModuleGatingBuildEnabled(value = import.meta.env.VITE_MODULE_GATING): boolean {
  return String(value ?? "off").toLowerCase() === "on";
}

export function resolveInstalledModules({
  explicit,
  suppressed,
  gatingActive,
  failClosed = false,
  edition,
}: {
  explicit: Set<string>;
  suppressed: Set<string>;
  gatingActive: boolean;
  failClosed?: boolean;
  edition?: string;
}): Set<string> {
  if (failClosed) return new Set(MODULES.filter(m => m.core).map(m => m.key));

  const merged = new Set<string>();
  MODULES.forEach(m => {
    if (m.core) { merged.add(m.key); return; }
    if (suppressed.has(m.key)) return;
    if (isModuleInstalled(m.key, explicit, gatingActive)) merged.add(m.key);
  });

  if (!gatingActive) {
    if (edition === "restaurant") ["core_home","sales","purchases","inventory","retail_pos","restaurant","reports","admin","learning"].forEach(k => merged.add(k));
    else if (edition === "retail") ["core_home","sales","purchases","inventory","retail_pos","reports","admin","learning"].forEach(k => merged.add(k));
    else if (edition === "hotel") ["core_home","sales","purchases","inventory","restaurant","hotel_erp","reports","compliance","admin","learning"].forEach(k => merged.add(k));
    else if (edition === "school") ["core_home","sales","purchases","inventory","hr_payroll","school_erp","reports","compliance","admin","learning"].forEach(k => merged.add(k));
    else if (edition === "accounting") ["core_home","sales","purchases","inventory","finance","fixed_assets","budgets","multi_currency","hr_payroll","reports","compliance","admin","learning"].forEach(k => merged.add(k));
    suppressed.forEach(k => merged.delete(k));
  }
  return merged;
}

export function gatedDefaultOff(key: string): boolean {
  return (OPTIONAL_WHEN_GATED as readonly string[]).includes(key);
}
