import { describe, expect, it } from "vitest";
import { DEFAULT_TAX_PROFILE, computeCharge, folioTotals, levyApplies, nightsBetween } from "@/lib/hospitality";

const profile = { ...DEFAULT_TAX_PROFILE, vat_rate: 16, tourism_levy_rate: 1.5, service_charge_rate: 10 };

describe("Zambian hospitality tax engine", () => {
  it("applies tourism levy to accommodation", () => {
    expect(levyApplies("room", profile)).toBe(true);
  });

  it("does NOT apply tourism levy to ordinary food and beverage", () => {
    expect(levyApplies("food", profile)).toBe(false);
    expect(levyApplies("beverage", profile)).toBe(false);
  });

  it("applies tourism levy to qualifying conference packages", () => {
    expect(levyApplies("conference package", profile)).toBe(true);
    expect(levyApplies("conference hire", profile)).toBe(true);
  });

  it("charges VAT on net + service charge + levy for a room night", () => {
    const t = computeCharge(1000, "room", profile);
    expect(t.net).toBe(1000);
    expect(t.serviceCharge).toBe(100);
    expect(t.levy).toBe(15);
    expect(t.vat).toBe(178.4); // 16% of 1115
    expect(t.gross).toBe(1293.4);
  });

  it("keeps the levy out of a food charge", () => {
    const t = computeCharge(200, "food", profile);
    expect(t.levy).toBe(0);
    expect(t.serviceCharge).toBe(20);
    expect(t.vat).toBe(35.2);
  });

  it("never treats service charge as tax", () => {
    const t = computeCharge(500, "room", { ...profile, service_charge_rate: 0 });
    const withSvc = computeCharge(500, "room", profile);
    expect(withSvc.serviceCharge).toBeGreaterThan(0);
    expect(t.serviceCharge).toBe(0);
    expect(withSvc.vat).toBeGreaterThan(t.vat);
  });

  it("backs tax out of tax-inclusive prices", () => {
    const t = computeCharge(1293.4, "room", { ...profile, prices_tax_inclusive: true });
    expect(t.net).toBeCloseTo(1000, 1);
    expect(t.gross).toBeCloseTo(1293.4, 1);
  });

  it("charges no VAT on payments, deposits and discounts", () => {
    for (const cat of ["payment", "deposit", "discount"]) {
      expect(computeCharge(100, cat, profile).vat).toBe(0);
    }
  });

  it("settles a folio: charges less payments equals balance", () => {
    const totals = folioTotals([
      { category: "room", amount: 1000, vat_amount: 178.4, levy_amount: 15, service_charge: 100 },
      { category: "food", amount: 200, vat_amount: 35.2, levy_amount: 0, service_charge: 20 },
      { category: "payment", amount: 500 },
      { category: "discount", amount: 50 },
    ]);
    expect(totals.revenue).toBe(1200);
    expect(totals.levy).toBe(15);
    expect(totals.payments).toBe(500);
    expect(totals.gross).toBeCloseTo(1498.6, 2);
    expect(totals.balance).toBeCloseTo(998.6, 2);
  });

  it("counts nights correctly and never returns zero", () => {
    expect(nightsBetween("2026-01-01", "2026-01-04")).toBe(3);
    expect(nightsBetween("2026-01-01", "2026-01-01")).toBe(1);
  });
});
