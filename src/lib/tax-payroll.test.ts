import { describe, expect, it } from "vitest";
import { calcNapsa, computePayslip, statutoryTaxRulesFor } from "./payroll";
import { computeVatReturn } from "./tax-reports";

describe("Zambian statutory tax rules", () => {
  it("uses the 2026 NAPSA employee ceiling", () => {
    expect(calcNapsa(50000)).toBe(1861.8);
  });

  it("keeps the 2025 NAPSA ceiling for historical payslips", () => {
    const rules = statutoryTaxRulesFor(new Date("2025-12-31T00:00:00Z"));
    expect(rules.napsaCap).toBe(1708.2);
    expect(computePayslip({ basic: 50000, tax_date: "2025-12-31" }).napsa).toBe(1708.2);
  });

  it("uses the 2026 rules for current payslips", () => {
    expect(computePayslip({ basic: 50000, tax_date: "2026-01-01" }).napsa).toBe(1861.8);
  });
});

describe("VAT return", () => {
  it("classifies mixed-rate invoice lines independently", () => {
    const result = computeVatReturn([
      {
        status: "sent",
        subtotal: 1160,
        vat_amount: 160,
        invoice_items: [
          { quantity: 1, unit_price: 580, vat_rate: 16, line_total: 580 },
          { quantity: 1, unit_price: 500, vat_rate: 0, line_total: 500 },
        ],
      },
    ], []);

    expect(result.salesStandardNet).toBe(500);
    expect(result.salesStandardVat).toBe(80);
    expect(result.salesZeroRatedNet).toBe(500);
  });

  it("keeps legacy invoices without lines reportable", () => {
    const result = computeVatReturn([
      { status: "sent", subtotal: 100, vat_amount: 16, total: 116 },
    ], []);

    expect(result.salesStandardNet).toBe(100);
    expect(result.salesStandardVat).toBe(16);
  });
});
