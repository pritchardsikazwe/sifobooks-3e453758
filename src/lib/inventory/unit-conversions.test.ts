import { describe, expect, test } from "vitest";
import { convertToBaseUnit, normalizeUnit } from "@/lib/inventory/unit-conversions";

describe("inventory unit conversion", () => {
  test("normalizes unit names", () => {
    expect(normalizeUnit("  Carton ")).toBe("carton");
    expect(normalizeUnit("")).toBe("unit");
  });

  test("converts transaction quantity to base units", () => {
    const db = {
      prepare: () => ({
        get: () => ({ id: "conv-1", from_unit: "carton", to_unit: "piece", multiplier: 24 }),
      }),
    };

    const result = convertToBaseUnit(
      db,
      "user-1",
      { id: "item-1", base_unit: "piece", purchase_unit: "carton" },
      3,
      "carton",
    );

    expect(result.quantity).toBe(72);
    expect(result.multiplier).toBe(24);
    expect(result.baseUnit).toBe("piece");
  });

  test("does not require a conversion for base-unit transactions", () => {
    const db = { prepare: () => { throw new Error("should not query"); } };
    const result = convertToBaseUnit(
      db,
      "user-1",
      { id: "item-1", base_unit: "piece" },
      5,
      "piece",
    );
    expect(result.quantity).toBe(5);
  });
});
