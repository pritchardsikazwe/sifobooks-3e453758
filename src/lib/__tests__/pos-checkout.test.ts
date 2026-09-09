import { describe, expect, it } from "vitest";
import { computeTotals, posErrorMessage, DEFAULT_SETTINGS, type CartLine } from "@/lib/pos";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  key: "k1", item_id: "i1", name: "Item", sku: null, qty: 2, price: 100, unit_cost: 60, discount_pct: 0, ...over,
});

describe("till totals (display only — server re-prices)", () => {
  it("extracts VAT from tax-inclusive prices", () => {
    const t = computeTotals([line()], 0, { ...DEFAULT_SETTINGS, tax_rate: 16, tax_inclusive: true });
    expect(t.total).toBe(200);
    expect(t.tax).toBeCloseTo(27.59, 2);
    expect(t.subtotal).toBeCloseTo(172.41, 2);
  });

  it("adds VAT on tax-exclusive prices", () => {
    const t = computeTotals([line()], 0, { ...DEFAULT_SETTINGS, tax_rate: 16, tax_inclusive: false });
    expect(t.subtotal).toBe(200);
    expect(t.total).toBe(232);
  });

  it("applies line and sale discounts before tax", () => {
    const t = computeTotals([line({ discount_pct: 10 })], 10, { ...DEFAULT_SETTINGS, tax_inclusive: true });
    expect(t.total).toBe(162);
  });
});

describe("checkout error messages", () => {
  it("explains a missing shift", () => {
    expect(posErrorMessage("NO_ACTIVE_SHIFT")).toMatch(/open your shift/i);
  });
  it("names the item that is short", () => {
    expect(posErrorMessage("INSUFFICIENT_STOCK:Breakfast Meal")).toMatch(/Breakfast Meal/);
  });
  it("never leaks raw database text", () => {
    const msg = posErrorMessage('duplicate key value violates unique constraint "pos_sales_pkey"');
    expect(msg).not.toMatch(/constraint|pkey/);
  });
});
