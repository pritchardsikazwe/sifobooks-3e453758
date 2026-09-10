import { describe, it, expect } from "vitest";
import { isPayrollOnly, modulesToSuppress, PAYROLL_ONLY_MODULES } from "@/lib/payroll-product";
import { hubsForMode, HUBS, PAYROLL_HUBS } from "@/lib/nav-hubs";
import { MODULES } from "@/lib/modules";
import { WORKSPACE_MODES, landingFor } from "@/lib/workspace";
import { demoIndustries, getDemoIndustry } from "@/lib/demo";

describe("payroll-only product", () => {
  it("is a selectable workspace mode landing on the payroll dashboard", () => {
    expect(WORKSPACE_MODES.some(m => m.id === "payroll_only")).toBe(true);
    expect(landingFor("payroll_only")).toBe("/payroll-dashboard");
    expect(landingFor(null)).toBe("/dashboard");
  });

  it("keeps payroll installed and suppresses other non-core modules", () => {
    const suppress = modulesToSuppress();
    expect(suppress).not.toContain("hr_payroll");
    expect(suppress.length).toBeGreaterThan(0);
    for (const key of suppress) {
      const m = MODULES.find(x => x.key === key);
      expect(m?.core).not.toBe(true);
    }
    expect(PAYROLL_ONLY_MODULES).toContain("hr_payroll");
  });

  it("presents payroll navigation only for payroll-only companies", () => {
    expect(hubsForMode("payroll_only")).toBe(PAYROLL_HUBS);
    expect(hubsForMode("accounting")).toBe(HUBS);
    expect(hubsForMode(null)).toBe(HUBS);
    expect(isPayrollOnly("payroll_only")).toBe(true);
    expect(isPayrollOnly("accounting")).toBe(false);
  });

  it("only navigates to payroll or core modules in payroll-only mode", () => {
    const allowed = new Set(["hr_payroll", "core_home"]);
    for (const hub of PAYROLL_HUBS) {
      for (const g of hub.groups) for (const i of g.items) expect(allowed.has(i.module)).toBe(true);
    }
  });

  it("registers a static payroll demo with sample sections", () => {
    const demo = getDemoIndustry("payroll");
    expect(demo?.product).toBe("SifoPayroll");
    expect(demoIndustries.map(d => d.slug)).toContain("payroll");
    expect((demo?.sections.length ?? 0)).toBeGreaterThan(5);
  });
});
