import { describe, expect, it } from "vitest";
import { isBalanced } from "@/components/PostingPreview";
import {
  creditNoteLines,
  salesInvoiceLines,
  receiptLines,
  supplierBillLines,
  supplierPaymentLines,
  payrollJournalLines,
  sumPayslips,
  outOfBalance,
} from "@/lib/posting-lines";
import { computeTotals, DEFAULT_SETTINGS, type CartLine } from "@/lib/pos";
import { checkCost } from "@/lib/restaurant-checks";
import { derivePaymentStatus, countsAsExpense } from "@/lib/finance/transaction-model";
import { journalTotals, validateJournal, emptyLine } from "@/lib/journal";
import { buildInsights } from "@/lib/reports/insights";
import { hotelAccountingEnabled, isHotelOnly } from "@/lib/hotel-product";

const acc = (code: string, name: string) => ({ id: code, account_code: code, account_name: name });
const cartLine = (over: Partial<CartLine> = {}): CartLine => ({
  key: "qa-1", item_id: "item-1", name: "QA Item", sku: "QA-001",
  qty: 2, price: 100, unit_cost: 60, discount_pct: 0, ...over,
});

describe("SifoBooks business workflow QA", () => {
  it("CREATE → POST: a sales invoice produces balanced double-entry accounting", () => {
    const lines = salesInvoiceLines({
      subtotal: 1000, vat: 160, total: 1160,
      receivable: acc("1100", "Accounts Receivable"),
      revenue: acc("4000", "Sales Revenue"),
      vatOutput: acc("2200", "VAT Payable"),
      customerName: "QA Customer",
    });
    expect(lines.length).toBe(3);
    expect(isBalanced(lines)).toBe(true);
    expect(outOfBalance(lines)).toBe(0);
    expect(lines[0]).toMatchObject({ debit: 1160, credit: 0 });
  });

  it("POST → RECEIVE: customer receipt clears the receivable", () => {
    const lines = receiptLines({
      amount: 1160,
      bank: acc("1010", "Bank"),
      credit: acc("1100", "Accounts Receivable"),
      isCustomerReceipt: true,
      invoiceNumber: "QA-INV-001",
    });
    expect(isBalanced(lines)).toBe(true);
    expect(lines[0].debit).toBe(1160);
    expect(lines[1].credit).toBe(1160);
  });

  it("CREATE → POST → PAY: supplier bill and payment remain balanced", () => {
    const bill = supplierBillLines({
      subtotal: 2000, vat: 320, total: 2320,
      expense: acc("5000", "Cost of Sales"),
      payable: acc("2100", "Accounts Payable"),
      vatInput: acc("2201", "VAT Input"),
      supplierName: "QA Supplier",
    });
    const payment = supplierPaymentLines({
      amount: 2320,
      payable: acc("2100", "Accounts Payable"),
      bank: acc("1010", "Bank"),
      supplierName: "QA Supplier",
    });
    expect(isBalanced(bill)).toBe(true);
    expect(isBalanced(payment)).toBe(true);
    expect(bill.at(-1)?.credit).toBe(2320);
    expect(payment[0]?.debit).toBe(2320);
  });

  it("REVERSE: credit note reverses the original sales accounting without imbalance", () => {
    const reversal = creditNoteLines({
      subtotal: 200, vat: 32, total: 232,
      receivable: acc("1100", "Accounts Receivable"),
      revenue: acc("4000", "Sales Revenue"),
      vatOutput: acc("2200", "VAT Payable"),
    });
    expect(isBalanced(reversal)).toBe(true);
    expect(outOfBalance(reversal)).toBe(0);
  });

  it("POST → REPORT: trial-balance logic detects both healthy and broken postings", () => {
    const healthy = buildInsights("trial-balance", {
      columns: [], rows: [], summary: [], notes: [], sufficient: true,
      facts: { totalDebit: 1160, totalCredit: 1160, difference: 0, accounts: 3, balanced: true },
    });
    const broken = buildInsights("trial-balance", {
      columns: [], rows: [], summary: [], notes: [], sufficient: true,
      facts: { totalDebit: 1160, totalCredit: 1150, difference: 10, accounts: 3, balanced: false },
    });
    expect(healthy[0]?.severity).toBe("healthy");
    expect(broken[0]?.severity).toBe("critical");
  });

  it("POS CREATE → TOTAL: VAT and discounts produce deterministic totals", () => {
    const totals = computeTotals([cartLine({ discount_pct: 10 })], 10, {
      ...DEFAULT_SETTINGS, tax_rate: 16, tax_inclusive: true,
    });
    expect(totals.total).toBe(162);
    expect(totals.tax).toBeCloseTo(22.34, 2);
  });

  it("POS control: payment and expense states remain semantically correct", () => {
    expect(derivePaymentStatus(1160, 0)).toBe("unpaid");
    expect(derivePaymentStatus(1160, 1160)).toBe("paid");
    expect(countsAsExpense({ transaction_type: "business_expense", status: "posted" })).toBe(true);
    expect(countsAsExpense({ transaction_type: "business_expense", status: "reversed" })).toBe(false);
  });

  it("RESTAURANT: recipe cost is calculated from quantity and unit cost", () => {
    expect(checkCost([{ qty: 2, unit_cost: 12.5 }, { qty: 3, unit_cost: 4 }])).toBe(37);
  });

  it("PAYROLL CREATE → POST: statutory payroll journal balances", () => {
    const totals = sumPayslips([
      { gross_pay: 10000, paye: 1500, napsa_employee: 500, napsa_employer: 500, nhima_employee: 100, nhima_employer: 100, other_deductions: 200, net_pay: 7700 },
      { gross_pay: 5000, paye: 400, napsa_employee: 250, napsa_employer: 250, nhima_employee: 50, nhima_employer: 50, other_deductions: 0, net_pay: 4300 },
    ]);
    const lines = payrollJournalLines({
      ...totals,
      wagesExpense: acc("6200", "Salaries & Wages"),
      employerContribExpense: acc("6210", "Employer Contributions"),
      payePayable: acc("2300", "PAYE Payable"),
      napsaPayable: acc("2310", "NAPSA Payable"),
      nhimaPayable: acc("2320", "NHIMA Payable"),
      otherPayable: acc("2390", "Other Deductions"),
      netPayable: acc("1010", "Bank"),
      periodLabel: "QA September 2026",
    });
    expect(isBalanced(lines)).toBe(true);
    expect(outOfBalance(lines)).toBe(0);
  });

  it("JOURNAL CONTROL: unbalanced entries are blocked", () => {
    const line = (account_id: string | null, debit: string, credit: string) => ({
      ...emptyLine(), account_id, debit, credit,
    });
    const header = { entry_number: "QA-JE-001", entry_date: "2026-09-22", reference: "", description: "" };
    expect(validateJournal(header, [line("1100", "100", ""), line("4000", "", "100")])).toEqual([]);
    expect(validateJournal(header, [line("1100", "100", ""), line("4000", "", "90")]).some(x => x.includes("equal"))).toBe(true);
    expect(journalTotals([line("1100", "100", ""), line("4000", "", "100")]).balanced).toBe(true);
  });

  it("HOTEL edition: hotel-only mode is separated from general accounting mode", () => {
    expect(isHotelOnly("hotel_only")).toBe(true);
    expect(hotelAccountingEnabled("hotel_only")).toBe(false);
    expect(hotelAccountingEnabled("pos_accounting")).toBe(true);
  });

  it("AUDIT/CONTROL: reversal is not treated as a current expense", () => {
    expect(countsAsExpense({ transaction_type: "supplier_expense", status: "posted" })).toBe(true);
    expect(countsAsExpense({ transaction_type: "supplier_expense", status: "reversed" })).toBe(false);
  });
});
