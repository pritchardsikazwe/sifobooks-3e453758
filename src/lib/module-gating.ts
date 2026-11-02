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

  if (!gatingActive && edition === "accounting") {
    ["core_home","sales","purchases","inventory","finance","fixed_assets","budgets","multi_currency","retail_pos","reports","compliance","admin","learning"].forEach(k => merged.add(k));
    suppressed.forEach(k => merged.delete(k));
  }
  return merged;
}

export function gatedDefaultOff(key: string): boolean {
  return (OPTIONAL_WHEN_GATED as readonly string[]).includes(key);
}


export function moduleKeyForPath(pathname: string): string | null {
  if (pathname === "/hotel" || pathname.startsWith("/hotel/")) return "hotel_erp";
  if (pathname === "/school" || pathname.startsWith("/school/")) return "school_erp";
  if (pathname === "/property" || pathname.startsWith("/property/")) return "property_management";
  if (pathname === "/lending" || pathname.startsWith("/lending/")) return "lending";
  if (pathname === "/boarding-house" || pathname.startsWith("/boarding-")) return "boarding_house";
  if (pathname === "/restaurant" || pathname.startsWith("/restaurant/")) return "restaurant";
  if (pathname === "/retail/butchery" || pathname.startsWith("/retail/butchery-")) return "butchery";
  return null;
}
