import { describe, expect, it } from "vitest";
import { checkCost, linesMissingCost } from "@/lib/restaurant-checks";

describe("restaurant check costing", () => {
  it("multiplies server-calculated line cost by quantity", () => {
    expect(checkCost([{ qty: 2, unit_cost: 12.5 }, { qty: 3, unit_cost: 4 }])).toBe(37);
  });

  it("treats a missing cost as zero rather than failing", () => {
    expect(checkCost([{ qty: 2, unit_cost: null }, { qty: 1, unit_cost: 10 }])).toBe(10);
  });

  it("handles string numerics coming back from the database", () => {
    expect(checkCost([{ qty: "2", unit_cost: "5.5" }])).toBe(11);
  });

  it("flags lines with no recipe or item cost", () => {
    const lines = [{ unit_cost: 3 }, { unit_cost: 0 }, { unit_cost: null }];
    expect(linesMissingCost(lines)).toHaveLength(2);
  });

  it("reports an empty check as zero cost", () => {
    expect(checkCost([])).toBe(0);
  });
});
