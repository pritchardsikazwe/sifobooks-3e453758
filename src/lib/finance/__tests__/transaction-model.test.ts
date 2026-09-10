import { describe, expect, it } from "vitest";
import {
  countsAsExpense,
  derivePaymentStatus,
  expectedPosting,
  txnTypeMeta,
  TXN_TYPES,
} from "../transaction-model";

describe("finance transaction model", () => {
  it("treats supplier payments and transfers as non-expenses so nothing is double counted", () => {
    expect(TXN_TYPES.supplier_payment.isExpense).toBe(false);
    expect(TXN_TYPES.transfer.isExpense).toBe(false);
    expect(countsAsExpense({ transaction_type: "supplier_payment", status: "posted" })).toBe(false);
    expect(countsAsExpense({ transaction_type: "transfer", status: "posted" })).toBe(false);
  });

  it("counts real costs but never reversed or voided ones", () => {
    expect(countsAsExpense({ transaction_type: "business_expense", status: "posted" })).toBe(true);
    expect(countsAsExpense({ transaction_type: "supplier_expense", status: "posted" })).toBe(true);
    expect(countsAsExpense({ transaction_type: "supplier_expense", status: "reversed" })).toBe(false);
    expect(countsAsExpense({ transaction_type: "business_expense", status: "void" })).toBe(false);
  });

  it("derives payment status from amounts", () => {
    expect(derivePaymentStatus(100, 0)).toBe("unpaid");
    expect(derivePaymentStatus(100, 40)).toBe("partially_paid");
    expect(derivePaymentStatus(100, 100)).toBe("paid");
    expect(derivePaymentStatus(100, 120)).toBe("paid");
    expect(derivePaymentStatus(0, 0)).toBe("not_applicable");
  });

  it("explains a direct business expense as Dr expense / Dr VAT / Cr cash", () => {
    const lines = expectedPosting("business_expense", { hasVat: true, sourceAccount: "1000 — Cash" });
    expect(lines.map(l => l.debit)).toEqual([true, true, false]);
    expect(lines[2].account).toBe("1000 — Cash");
  });

  it("explains a supplier expense as crediting Accounts Payable", () => {
    const lines = expectedPosting("supplier_expense");
    expect(lines[lines.length - 1]).toMatchObject({ account: "Accounts Payable", debit: false });
  });

  it("explains a supplier payment as debiting Accounts Payable, never an expense", () => {
    const lines = expectedPosting("supplier_payment", { sourceAccount: "Bank" });
    expect(lines[0]).toMatchObject({ account: "Accounts Payable", debit: true });
    expect(lines.some(l => /expense/i.test(l.account))).toBe(false);
  });

  it("falls back to a business expense for unknown or missing types", () => {
    expect(txnTypeMeta(null).value).toBe("business_expense");
    expect(txnTypeMeta("nonsense").value).toBe("business_expense");
  });
});
