import { describe, expect, it } from "vitest";
import { computePayslip, calcNapsa, statutoryTaxRulesFor } from "../payroll";
import { applyVatAdjustments, evaluateInputVat, reconcileVat, buildVat3Rows } from "../tax-compliance";
import { computeVatReturn } from "../tax-reports";

describe("Zambia tax compliance", () => {
  it("uses the current 2026 NAPSA employee ceiling and 2025 historical ceiling", () => {
    expect(calcNapsa(100000, statutoryTaxRulesFor(new Date("2026-06-01")))).toBe(1446.02);
    expect(calcNapsa(100000, statutoryTaxRulesFor(new Date("2025-06-01")))).toBe(1708.2);
  });

  it("treats cash allowances as PAYE taxable emoluments", () => {
    const p = computePayslip({ basic: 5000, housing_allowance: 1000, transport_allowance: 500, utility_allowance: 250, tax_date: "2026-01-01" });
    expect(p.taxable).toBe(6750);
  });

  it("splits mixed-rate sales by invoice lines", () => {
    const result = computeVatReturn([
      { status: "posted", subtotal: 1160, vat_amount: 160, invoice_items: [
        { quantity: 1, unit_price: 500, discount_amount: 0, discount_type: "%", vat_rate: 16, line_total: 500 },
        { quantity: 1, unit_price: 660, discount_amount: 0, discount_type: "%", vat_rate: 0, line_total: 660 },
      ]},
    ], []);
    expect(result.salesStandardNet).toBe(500);
    expect(result.salesStandardVat).toBe(80);
    expect(result.salesZeroRatedNet).toBe(660);
  });

  it("apportions eligible input VAT to taxable business use", () => {
    const d = evaluateInputVat({ taxAmount: 160, vatDate: "2026-09-01", returnEnd: "2026-09-30", businessUsePercent: 75, vatEvidenceType: "tax_invoice" });
    expect(d.claimableVat).toBe(120);
  });

  it("applies credit and debit notes to the correct VAT side", () => {
    const a = applyVatAdjustments([
      { document_type: "credit_note", direction: "issued", reference: "CN1", adjustment_date: "2026-09-15", reason: "return", subtotal: 100, vat_amount: 16, total: 116, status: "posted" },
      { document_type: "debit_note", direction: "received", reference: "DN1", adjustment_date: "2026-09-20", reason: "price increase", subtotal: 50, vat_amount: 8, total: 58, status: "posted" },
    ], "2026-09-01", "2026-09-30");
    expect(a.outputVat).toBe(-16);
    expect(a.inputVat).toBe(8);
  });

  it("flags VAT reconciliation differences", () => {
    const r = reconcileVat({ outputVat: 160, inputVat: 80 }, { outputVat: -16, inputVat: 8 }, { outputVat: 144, inputVat: 88 });
    expect(r.reconciled).toBe(true);
    expect(r.netDifference).toBe(0);
  });

  it("builds a VAT 3 exportable box set", () => {
    const rows = buildVat3Rows({ salesStandardNet: 1000, salesStandardVat: 160, salesZeroRatedNet: 200, purchasesNet: 500, purchasesVat: 80 });
    expect(rows.find(r => r.box === "6")?.amount).toBe(80);
  });
});
