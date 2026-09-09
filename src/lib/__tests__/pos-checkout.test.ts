import { readFileSync } from "node:fs";
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
  it("explains a till that is not assigned", () => {
    expect(posErrorMessage("NO_REGISTER")).toMatch(/till/i);
  });
  it("explains a store that is not assigned", () => {
    expect(posErrorMessage("NO_LOCATION")).toMatch(/location|store/i);
  });
  it("names the item that is short", () => {
    expect(posErrorMessage("INSUFFICIENT_STOCK:Breakfast Meal")).toMatch(/Breakfast Meal/);
  });
  it("names the item with no cost price", () => {
    const msg = posErrorMessage("NO_COST:Roller Meal");
    expect(msg).toMatch(/Roller Meal/);
    expect(msg).toMatch(/cost/i);
  });
  it("explains a short payment", () => {
    expect(posErrorMessage("PAYMENT_SHORT")).toMatch(/less than the amount due/i);
  });
  it("never leaks raw database text", () => {
    const msg = posErrorMessage('duplicate key value violates unique constraint "pos_sales_pkey"');
    expect(msg).not.toMatch(/constraint|pkey/);
  });
});

describe("the browser is not the accounting authority", () => {
  const source = readFileSync(new URL("../pos.ts", import.meta.url), "utf8");
  const payload = source.slice(source.indexOf("const itemRows"), source.indexOf("const payRows"));

  it("sends no cost figures with sale lines", () => {
    expect(payload).not.toMatch(/unit_cost|cost_total|line_total/);
  });
  it("sends only item, quantity, price, discount and note", () => {
    expect(payload).toMatch(/item_id:.*qty:.*price:.*discount_pct:/s);
  });
  it("posts through the hardened checkout, not the old sync path", () => {
    expect(source).toMatch(/rpc\("pos_checkout"/);
    expect(source).not.toMatch(/rpc\("sync_pos_sale"/);
  });
  it("carries the shift so offline sales land on the right shift", () => {
    expect(source).toMatch(/shift_id:draft\.shiftId/);
  });
});
