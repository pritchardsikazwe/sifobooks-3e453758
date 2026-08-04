import { describe, expect, it } from "vitest";
import { isBalanced } from "@/components/PostingPreview";
import {
  acctLabel, bankAllocationLines, creditNoteLines, outOfBalance, payrollJournalLines,
  receiptLines, salesInvoiceLines, sumPayslips, supplierBillLines, supplierPaymentLines,
} from "./posting-lines";

const acc = (code: string, name: string) => ({ id: code, account_code: code, account_name: name });

describe("acctLabel", () => {
  it("renders code — name and falls back when unset", () => {
    expect(acctLabel(acc("6100", "Office Expenses"))).toBe("6100 — Office Expenses");
    expect(acctLabel(null, "1000 — Cash")).toBe("1000 — Cash");
  });
});

describe("sales invoice", () => {
  const lines = salesInvoiceLines({
    subtotal: 1000, vat: 160, total: 1160,
    receivable: acc("1100", "Accounts Receivable"),
    revenue: acc("4000", "Sales Revenue"),
    vatOutput: acc("2200", "VAT Payable"),
    customerName: "Design Links",
  });

  it("balances DR receivable against revenue + VAT", () => {
    expect(outOfBalance(lines)).toBe(0);
    expect(isBalanced(lines)).toBe(true);
  });

  it("debits the receivable with the gross total", () => {
    expect(lines[0]).toMatchObject({ account: "1100 — Accounts Receivable", debit: 1160, credit: 0 });
  });

  it("omits the VAT line for zero-rated sales", () => {
    const zero = salesInvoiceLines({ subtotal: 500, vat: 0, total: 500, receivable: acc("1100", "AR"), revenue: acc("4000", "Sales") });
    expect(zero).toHaveLength(2);
    expect(isBalanced(zero)).toBe(true);
  });

  it("is detected as unbalanced when totals disagree", () => {
    const bad = salesInvoiceLines({ subtotal: 1000, vat: 160, total: 1000, receivable: acc("1100", "AR"), revenue: acc("4000", "Sales"), vatOutput: acc("2200", "VAT") });
    expect(isBalanced(bad)).toBe(false);
  });
});

describe("credit note", () => {
  it("reverses a sale and balances", () => {
    const lines = creditNoteLines({ subtotal: 200, vat: 32, total: 232, receivable: acc("1100", "AR"), revenue: acc("4000", "Sales"), vatOutput: acc("2200", "VAT") });
    expect(isBalanced(lines)).toBe(true);
  });
});

describe("receipts", () => {
  it("clears the customer receivable", () => {
    const lines = receiptLines({ amount: 1160, bank: acc("1010", "Zanaco Current"), credit: acc("1100", "AR"), isCustomerReceipt: true, invoiceNumber: "INV12" });
    expect(isBalanced(lines)).toBe(true);
    expect(lines[0].debit).toBe(1160);
    expect(lines[1].account).toBe("1100 — AR");
    expect(lines[1].description).toContain("INV12");
  });

  it("credits income for non-customer receipts", () => {
    const lines = receiptLines({ amount: 500, bank: acc("1000", "Cash"), credit: acc("4100", "Other Income") });
    expect(lines[1].account).toBe("4100 — Other Income");
    expect(isBalanced(lines)).toBe(true);
  });

  it("rounds cents so the preview never drifts", () => {
    const lines = receiptLines({ amount: 100.005, bank: acc("1000", "Cash"), credit: acc("1100", "AR"), isCustomerReceipt: true });
    expect(outOfBalance(lines)).toBe(0);
  });
});

describe("purchases → bills → payments", () => {
  const bill = supplierBillLines({ subtotal: 2000, vat: 320, total: 2320, expense: acc("5000", "Cost of Sales"), payable: acc("2100", "Accounts Payable"), vatInput: acc("2201", "VAT Input"), supplierName: "Zesco" });

  it("balances the bill and credits payables gross", () => {
    expect(isBalanced(bill)).toBe(true);
    expect(bill.at(-1)).toMatchObject({ account: "2100 — Accounts Payable", credit: 2320 });
  });

  it("balances the supplier payment and moves cash out", () => {
    const pay = supplierPaymentLines({ amount: 2320, payable: acc("2100", "AP"), bank: acc("1010", "Zanaco"), supplierName: "Zesco" });
    expect(isBalanced(pay)).toBe(true);
    expect(pay[0].debit).toBe(2320);
    expect(pay[1].credit).toBe(2320);
  });
});

describe("bank allocation", () => {
  it("debits bank for money in", () => {
    const lines = bankAllocationLines({ amount: 800, signedAmount: 800, bank: acc("1010", "Zanaco"), account: acc("4000", "Sales") });
    expect(lines[0].account).toBe("1010 — Zanaco");
    expect(lines[0].debit).toBe(800);
    expect(isBalanced(lines)).toBe(true);
  });

  it("credits bank for money out", () => {
    const lines = bankAllocationLines({ amount: 300, signedAmount: -1200, bank: acc("1010", "Zanaco"), account: acc("6100", "Office"), memo: "Stationery" });
    expect(lines[0].account).toBe("6100 — Office");
    expect(lines[0].description).toBe("Stationery");
    expect(lines[1].credit).toBe(300);
    expect(isBalanced(lines)).toBe(true);
  });

  it("supports partial allocations of a larger statement line", () => {
    const lines = bankAllocationLines({ amount: 250.5, signedAmount: -1000, bank: acc("1010", "Zanaco"), account: acc("6100", "Office") });
    expect(outOfBalance(lines)).toBe(0);
    expect(lines[0].debit).toBe(250.5);
  });
});

describe("payroll run journal", () => {
  const totals = sumPayslips([
    { gross_pay: 10000, paye: 1500, napsa_employee: 500, napsa_employer: 500, nhima_employee: 100, nhima_employer: 100, other_deductions: 200, net_pay: 7700 },
    { gross_pay: 5000, paye: 400, napsa_employee: 250, napsa_employer: 250, nhima_employee: 50, nhima_employer: 50, other_deductions: 0, net_pay: 4300 },
  ]);

  it("sums payslips correctly", () => {
    expect(totals).toMatchObject({ grossPay: 15000, paye: 1900, napsaEmployee: 750, napsaEmployer: 750, nhimaEmployee: 150, nhimaEmployer: 150, otherDeductions: 200, netPay: 12000 });
  });

  it("produces a balanced statutory journal", () => {
    const lines = payrollJournalLines({
      ...totals,
      wagesExpense: acc("6200", "Salaries & Wages"),
      employerContribExpense: acc("6210", "Employer Contributions"),
      payePayable: acc("2300", "PAYE Payable"),
      napsaPayable: acc("2310", "NAPSA Payable"),
      nhimaPayable: acc("2320", "NHIMA Payable"),
      otherPayable: acc("2390", "Other Deductions"),
      netPayable: acc("1010", "Zanaco"),
      periodLabel: "August 2026",
    });
    expect(outOfBalance(lines)).toBe(0);
    expect(isBalanced(lines)).toBe(true);
    // gross + employer contributions on the debit side
    expect(lines[0].debit + lines[1].debit).toBe(15900);
  });

  it("flags an unbalanced run when net pay is wrong", () => {
    const lines = payrollJournalLines({
      ...totals, netPay: 11000,
      wagesExpense: acc("6200", "Wages"), payePayable: acc("2300", "PAYE"),
      napsaPayable: acc("2310", "NAPSA"), nhimaPayable: acc("2320", "NHIMA"),
      netPayable: acc("1010", "Bank"),
    });
    expect(isBalanced(lines)).toBe(false);
  });
});
