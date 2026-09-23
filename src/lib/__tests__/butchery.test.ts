import { describe, expect, it } from "vitest";
import { calculateYield, parseScaleReading, weightedCostPerKg } from "@/lib/butchery";

describe("butchery scale and yield foundation", () => {
  it("parses stable kilogram scale readings", () => {
    expect(parseScaleReading("ST 1.275 kg")?.weight).toBe(1.275);
    expect(parseScaleReading("1,250 g")?.weight).toBe(1.25);
  });

  it("calculates processing yield", () => {
    const result = calculateYield(100, 90, 5);
    expect(result.saleablePercent).toBe(90);
    expect(result.wastePercent).toBe(5);
    expect(result.balanceKg).toBe(5);
  });

  it("calculates saleable meat cost", () => {
    expect(weightedCostPerKg(6400, 90)).toBeCloseTo(71.1111, 4);
  });
});
