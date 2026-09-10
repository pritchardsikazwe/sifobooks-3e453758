// SifoHotel — hospitality as a standalone SifoBooks product.
//
// This does NOT create a second hotel or accounting engine. It records that a
// company bought the hotel product on its own, so navigation and onboarding
// stay focused on the property. Every existing route, module and deep link
// keeps working; a hotel-only tenant can switch on the rest of SifoBooks at
// any time, and nothing is deleted when they do.

import { supabase } from "@/integrations/supabase/client";
import { MODULES } from "@/lib/modules";
import { getActiveCompanyId, setWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";

/** Modules a hotel-only company keeps switched on. */
export const HOTEL_ONLY_MODULES = ["hotel_erp"] as const;

export function isHotelOnly(mode: string | null | undefined): boolean {
  return mode === "hotel_only";
}

/** Non-core modules suppressed while a company is hotel-only. */
export function hotelModulesToSuppress(): string[] {
  return MODULES.filter(
    (m) => !m.core && !(HOTEL_ONLY_MODULES as readonly string[]).includes(m.key),
  ).map((m) => m.key);
}

/**
 * Switch a company to the hotel-only product using the existing
 * company_modules suppression mechanism. No chart of accounts is seeded and
 * no operational record is created.
 */
export async function activateHotelOnly(opts?: { companyId?: string; userId?: string }) {
  const { data: u } = await supabase.auth.getUser();
  const userId = opts?.userId ?? u.user?.id;
  const companyId = opts?.companyId ?? (await getActiveCompanyId());
  if (!userId || !companyId) throw new Error("No active company");

  const rows = [
    ...HOTEL_ONLY_MODULES.map((k) => ({ user_id: userId, company_id: companyId, module_key: k, config: {} })),
    ...hotelModulesToSuppress().map((k) => ({
      user_id: userId,
      company_id: companyId,
      module_key: `__off__:${k}`,
      config: {},
    })),
  ];
  const { error } = await supabase
    .from("company_modules")
    .upsert(rows, { onConflict: "company_id,module_key" });
  if (error) throw error;

  await setWorkspaceMode("hotel_only", companyId);
  return companyId;
}

/** Re-open the full SifoBooks suite for a hotel-only company. Nothing is seeded. */
export async function upgradeFromHotelOnly(opts?: { companyId?: string; mode?: WorkspaceMode }) {
  const companyId = opts?.companyId ?? (await getActiveCompanyId());
  if (!companyId) throw new Error("No active company");
  const keys = hotelModulesToSuppress().map((k) => `__off__:${k}`);
  const { error } = await supabase
    .from("company_modules")
    .delete()
    .eq("company_id", companyId)
    .in("module_key", keys);
  if (error) throw error;
  await setWorkspaceMode(opts?.mode ?? "pos_accounting", companyId);
  return companyId;
}

/**
 * Is the shared accounting engine available to hotel activity?
 * Hotel-only tenants bill, settle and report on the property, but hotel
 * journals are only posted once Accounting is switched on — we never fake a
 * GL posting.
 */
export function hotelAccountingEnabled(mode: string | null | undefined, installed?: Set<string>): boolean {
  if (isHotelOnly(mode)) return false;
  if (installed && installed.size > 0) return installed.has("finance") || installed.has("accounting");
  return true;
}

/* ------------------------------------------------------------------ *
 * Operational roles
 * ------------------------------------------------------------------ *
 * A receptionist should not open the night audit, and a housekeeper should
 * not open folios. These lists narrow the hotel shell only — they never widen
 * anything: RLS and RBAC still decide what the server will return.
 */

export type HotelRole = "reception" | "housekeeping" | "cashier" | "manager" | "admin";

const RECEPTION = [
  "/hotel", "/hotel/front-desk", "/hotel/reservations", "/hotel/booking", "/hotel/room-rack",
  "/hotel/guests", "/hotel/pre-arrival", "/hotel/check-in-out", "/hotel/folios", "/hotel/payments",
];

const HOTEL_ROLE_SCREENS: Record<HotelRole, string[] | "all"> = {
  reception: RECEPTION,
  housekeeping: ["/hotel/housekeeping", "/hotel/room-rack", "/hotel/maintenance"],
  cashier: ["/hotel", "/hotel/front-desk", "/hotel/folios", "/hotel/payments", "/hotel/pos", "/hotel/guests"],
  manager: "all",
  admin: "all",
};

/** Map an RBAC / staff role key onto a hotel operational role. */
export function hotelRoleFor(roleKeys: string[]): HotelRole {
  const keys = roleKeys.map((r) => r.toLowerCase());
  const hit = (...needles: string[]) => keys.some((k) => needles.some((n) => k.includes(n)));
  if (hit("admin", "owner", "super")) return "admin";
  if (hit("manager", "supervisor", "accountant")) return "manager";
  if (hit("housekeep", "cleaner", "attendant")) return "housekeeping";
  if (hit("cashier", "till", "waiter", "server")) return "cashier";
  if (hit("reception", "front", "desk", "agent")) return "reception";
  return "manager";
}

/** Screens this hotel role should see in the shell. */
export function hotelScreensFor(role: HotelRole): string[] | "all" {
  return HOTEL_ROLE_SCREENS[role];
}

export function filterHotelNav<T extends { to: string }>(nav: T[], role: HotelRole): T[] {
  const allowed = hotelScreensFor(role);
  if (allowed === "all") return nav;
  const set = new Set(allowed);
  return nav.filter((n) => set.has(n.to));
}
