import { describe, expect, it } from "vitest";
import {
  BUILT_IN_RULES, employerCostOn, napsaOn, nhimaOn, parseBands, payeOn,
  rulesInForce, rulesSummary, sdlOn, toRules, wcfOn, type RuleRow,
} from "@/lib/payroll-rules";

const row = (over: Partial<RuleRow> = {}): RuleRow => ({
  id: "r1",
  effective_from: "2026-01-01",
  paye_bands: [{ upTo: 5000, rate: 0 }, { upTo: null, rate: 0.3 }],
  napsa_rate: 0.05, napsa_employer_rate: 0.05, napsa_cap: 1000,
  nhima_rate: 0.01, nhima_employer_rate: 0.01, wcf_rate: 0.02, sdl_rate: 0.005,
  housing_exempt_pct: 0.3, source_note: "Circular", verified_by: "Finance", verified_on: "2026-01-02",
  is_active: true, ...over,
});

describe("statutory rule versions", () => {
  it("falls back to the built-in unverified starting point", () => {
    const rules = rulesInForce([], "2026-03-01");
    expect(rules.origin).toBe("built-in");
    expect(rules.napsaCap).toBe(2892.03);
  });

  it("picks the latest version in force on the pay date", () => {
    const rows = [row({ id: "a", effective_from: "2026-01-01", napsa_cap: 1000 }),
                  row({ id: "b", effective_from: "2026-06-01", napsa_cap: 2000 })];
    expect(rulesInForce(rows, "2026-05-31").napsaCap).toBe(1000);
    expect(rulesInForce(rows, "2026-06-01").napsaCap).toBe(2000);
  });

  it("ignores versions that are switched off or not yet effective", () => {
    const rows = [row({ id: "a", effective_from: "2026-06-01", is_active: false, napsa_cap: 9 }),
                  row({ id: "b", effective_from: "2027-01-01", napsa_cap: 8 })];
    expect(rulesInForce(rows, "2026-12-31").origin).toBe("built-in");
  });

  it("sorts and repairs PAYE bands, keeping the built-in set when unusable", () => {
    expect(parseBands([{ up_to: null, rate: 0.3 }, { up_to: 5000, rate: 0 }])[0]!.upTo).toBe(5000);
    expect(parseBands("nonsense")).toEqual(BUILT_IN_RULES.payeBands);
  });
});

describe("calculations use the supplied version", () => {
  const rules = toRules(row());

  it("charges PAYE band by band", () => {
    expect(payeOn(4000, rules)).toBe(0);
    expect(payeOn(9000, rules)).toBe(1200);
  });

  it("caps NAPSA on both sides", () => {
    expect(napsaOn(10000, rules)).toMatchObject({ employee: 500, employer: 500, capped: false });
    expect(napsaOn(40000, rules)).toMatchObject({ employee: 1000, employer: 1000, capped: true });
  });

  it("computes NHIMA, WCF, SDL and total employer on-cost", () => {
    expect(nhimaOn(10000, rules)).toMatchObject({ employee: 100, employer: 100 });
    expect(wcfOn(10000, rules)).toBe(200);
    expect(sdlOn(10000, rules)).toBe(50);
    expect(employerCostOn(10000, 10000, rules)).toBe(850);
  });

  it("summarises the version for the screen", () => {
    expect(rulesSummary(rules)).toContain("NAPSA 5% + 5%");
  });
});
