import { describe, expect, it } from "vitest";
import { validatePosTransaction } from "./pos-integrity";

const baseLine = {
  itemId: "item-1",
  qty: 2,
  price: 58,
  unitCost: 30,
  discountPct: 0,
};

const base = {
  lines: [baseLine],
  saleDiscountPct: 0,
  taxRate: 16,
  taxInclusive: true,
  subtotal: 100,
  tax: 16,
  total: 116,
  costTotal: 60,
  payments: [{ method: "cash", amount: 116 }],
  changeDue: 0,
  allowNegativeStock: false,
};

describe("validatePosTransaction", () => {
  it("accepts a valid tax-inclusive sale", () => {
    expect(validatePosTransaction(base)).toEqual({ ok: true, errors: [] });
  });

  it("accepts sale-level discounts", () => {
    const result = validatePosTransaction({
      ...base,
      saleDiscountPct: 10,
      subtotal: 90,
      tax: 14.4,
      total: 104.4,
      payments: [{ method: "cash", amount: 104.4 }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects zero or negative quantities", () => {
    const result = validatePosTransaction({ ...base, lines: [{ ...baseLine, qty: 0 }] });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Line 1: quantity must be greater than zero");
  });

  it("rejects totals that do not reconcile", () => {
    const result = validatePosTransaction({ ...base, total: 120 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Sale lines, discounts and tax do not reconcile to total");
  });

  it("rejects cost totals that do not reconcile", () => {
    const result = validatePosTransaction({ ...base, costTotal: 50 });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Sale lines do not reconcile to cost total");
  });

  it("rejects insufficient payment", () => {
    const result = validatePosTransaction({
      ...base,
      payments: [{ method: "cash", amount: 100 }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Payments are insufficient for the sale total and change");
  });

  it("rejects missing stock item when negative stock is disabled", () => {
    const result = validatePosTransaction({
      ...base,
      lines: [{ ...baseLine, itemId: null }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Line 1: stock item is required for a stock-controlled sale");
  });

  it("supports tax-exclusive sales", () => {
    const result = validatePosTransaction({
      ...base,
      taxInclusive: false,
      subtotal: 116,
      tax: 18.56,
      total: 134.56,
      payments: [{ method: "cash", amount: 134.56 }],
    });
    expect(result.ok).toBe(true);
  });
});
