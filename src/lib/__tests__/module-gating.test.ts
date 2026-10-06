import { describe, expect, test, vi, beforeEach } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

import { MODULES } from "@/lib/modules";
import { resolveActiveCompanyId } from "@/lib/active-company";
import { isModuleGatingBuildEnabled, resolveInstalledModules } from "@/lib/module-gating";
import { uninstallModule } from "@/lib/install-industry";

const legacyDefaults = () => new Set(MODULES.filter(m => m.core || m.defaultInstalled).map(m => m.key));
const verticalKeys = ["hotel_erp", "school_erp", "property_management", "lending", "boarding_house", "restaurant", "butchery"];

function queryResult(value: any) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => value,
        order: () => ({
          limit: async () => value,
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("module gating", () => {
  test("a. gating OFF preserves the general company sidebar module set", () => {
    const actual = resolveInstalledModules({
      explicit: new Set(),
      suppressed: new Set(),
      gatingActive: false,
      edition: undefined,
    });
    expect([...actual].sort()).toEqual([...legacyDefaults()].sort());
  });

  test("a. gating OFF preserves the hotel_only and restaurant edition defaults", () => {
    const hotel = resolveInstalledModules({ explicit: new Set(), suppressed: new Set(), gatingActive: false, edition: "hotel" });
    const restaurant = resolveInstalledModules({ explicit: new Set(), suppressed: new Set(), gatingActive: false, edition: "restaurant" });
    expect(hotel.has("hotel_erp")).toBe(true);
    expect(hotel.has("restaurant")).toBe(true);
    expect(restaurant.has("restaurant")).toBe(true);
    expect(restaurant.has("retail_pos")).toBe(true);
  });

  test("b. gating ON with only hotel installed shows Hotel and no other vertical module", () => {
    const actual = resolveInstalledModules({
      explicit: new Set(["hotel_erp"]),
      suppressed: new Set(),
      gatingActive: true,
    });
    expect(actual.has("hotel_erp")).toBe(true);
    for (const key of verticalKeys.filter(k => k !== "hotel_erp")) expect(actual.has(key)).toBe(false);
  });

  test("c. gating ON with no optional vertical modules shows none of them", () => {
    const actual = resolveInstalledModules({
      explicit: new Set(),
      suppressed: new Set(),
      gatingActive: true,
    });
    for (const key of verticalKeys) expect(actual.has(key)).toBe(false);
  });

  test("d. hook fail-closed state resolves to core modules only after a company_modules query error", () => {
    const actual = resolveInstalledModules({
      explicit: new Set(["hotel_erp", "school_erp"]),
      suppressed: new Set(),
      gatingActive: false,
      failClosed: true,
    });
    expect([...actual].sort()).toEqual([...MODULES.filter(m => m.core).map(m => m.key)].sort());
  });

  test("e. uninstall of a default-installed module writes its __off__ suppression row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert });
    await uninstallModule("company-1", "inventory");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", company_id: "company-1", module_key: "__off__:inventory" }),
      { onConflict: "company_id,module_key" },
    );
  });

  test("f. staff user without an active company resolves through company_members", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return queryResult({ data: { active_company_id: null } });
      if (table === "companies") return queryResult({ data: [] });
      if (table === "company_members") return queryResult({ data: [{ company_id: "member-company" }] });
      throw new Error("unexpected table " + table);
    });
    await expect(resolveActiveCompanyId("staff-user")).resolves.toBe("member-company");
  });

  test("flag parser defaults to OFF and only enables on explicit on", () => {
    expect(isModuleGatingBuildEnabled("off")).toBe(false);
    expect(isModuleGatingBuildEnabled(undefined)).toBe(false);
    expect(isModuleGatingBuildEnabled("on")).toBe(true);
  });
});
