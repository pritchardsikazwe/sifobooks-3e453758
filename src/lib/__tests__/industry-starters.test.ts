import { describe, expect, it } from "vitest";
import { getIndustryStarter, INDUSTRY_STARTERS } from "@/lib/industry-starters";
import { getModuleCompliance } from "@/lib/industry-compliance";
import { getZambiaCoreCoa } from "@/lib/zambia-coa";

describe("SifoBooks industry starter foundation", () => {
  it("defines all eight Windows editions", () => {
    expect(INDUSTRY_STARTERS.map((x) => x.edition)).toEqual([
      "accounting", "retail", "restaurant", "hotel", "school", "property", "lending", "butchery", "enterprise",
    ]);
  });

  it("has a Zambia core chart with unique account codes", () => {
    const coa = getZambiaCoreCoa();
    expect(coa.length).toBeGreaterThan(50);
    expect(new Set(coa.map((a) => a.code)).size).toBe(coa.length);
    expect(coa.find((a) => a.code === "2100")?.name).toBe("VAT Output Payable");
  });

  it("keeps Butchery and Enterprise starter configurations separate", () => {
    const butchery = getIndustryStarter("butchery");
    const enterprise = getIndustryStarter("enterprise");
    expect(butchery.industry).toBe("Butchery");
    expect(butchery.modules.some((module) => module.key === "butchery")).toBe(true);
    expect(butchery.modules.some((module) => module.key === "branches")).toBe(false);
    expect(enterprise.industry).toBe("Enterprise / Multi-Department");
    expect(enterprise.modules.some((module) => module.key === "branches")).toBe(true);
  });

  it("provides restaurant compliance at module level", () => {
    const rules = getModuleCompliance("restaurant", "pos");
    expect(rules.map((r) => r.code)).toContain("ZRA");
    expect(rules.map((r) => r.code)).toContain("SMART_INVOICE");
  });

  it("keeps demo credentials clearly scoped to demo starters", () => {
    const restaurant = getIndustryStarter("restaurant");
    expect(restaurant.demoUsername).toBe("SifoBooksdemo");
    expect(restaurant.demoPassword).toBe("Demo2026");
  });
});
