import { describe, it, expect } from "vitest";
import {
  categoryFor, summariseInventory, isEmptyCompany, deleteBlockedReason, canConfirmDelete,
  type CompanyInventory, type InventoryRow,
} from "@/lib/company-lifecycle";

function inv(rows: Partial<InventoryRow>[], name = "MKP FARMS"): CompanyInventory {
  const tables = rows.map((r) => ({
    table: r.table!, count: r.count ?? 1, scope: r.scope ?? "company", blocking: r.blocking ?? false,
  })) as InventoryRow[];
  const blocking = tables.filter((t) => t.blocking).map((t) => ({ table: t.table, count: t.count }));
  const blocking_rows = blocking.reduce((s, b) => s + b.count, 0);
  return {
    company_id: "c1", company_name: name, status: "active", sole_company_of_owner: true,
    tables, blocking, blocking_rows, deletable: blocking_rows === 0,
    recommendation: blocking_rows === 0 ? "delete_allowed" : "archive",
  };
}

describe("company lifecycle safety rules", () => {
  it("A. an empty company is eligible for delete", () => {
    const i = inv([{ table: "company_members", count: 1 }, { table: "branches", count: 1 }]);
    expect(isEmptyCompany(i)).toBe(true);
    expect(deleteBlockedReason(i)).toBeNull();
    expect(canConfirmDelete({ inventory: i, typedName: "MKP FARMS", acknowledged: true, authorised: true })).toBe(true);
  });

  it("B. a company with journals cannot be deleted and archive is recommended", () => {
    const i = inv([{ table: "journal_entries", count: 12, blocking: true }]);
    expect(isEmptyCompany(i)).toBe(false);
    expect(i.recommendation).toBe("archive");
    expect(deleteBlockedReason(i)).toContain("journal entries");
    expect(canConfirmDelete({ inventory: i, typedName: "MKP FARMS", acknowledged: true, authorised: true })).toBe(false);
  });

  it("C. stock movements block deletion", () => {
    expect(isEmptyCompany(inv([{ table: "stock_movements", count: 3, blocking: true }]))).toBe(false);
  });

  it("D. POS sales block deletion", () => {
    expect(isEmptyCompany(inv([{ table: "pos_sales", count: 1, blocking: true }]))).toBe(false);
  });

  it("E. payroll history blocks deletion", () => {
    expect(isEmptyCompany(inv([{ table: "payslips", count: 8, blocking: true }]))).toBe(false);
  });

  it("F. setup-only dependencies such as members do not block deletion", () => {
    const i = inv([{ table: "company_members", count: 4 }, { table: "company_modules", count: 6 }]);
    expect(isEmptyCompany(i)).toBe(true);
  });

  it("G. an unauthorised viewer can never confirm delete", () => {
    const i = inv([]);
    expect(canConfirmDelete({ inventory: i, typedName: "MKP FARMS", acknowledged: true, authorised: false })).toBe(false);
  });

  it("I. the exact company name must be typed", () => {
    const i = inv([]);
    expect(canConfirmDelete({ inventory: i, typedName: "mkp farms", acknowledged: true, authorised: true })).toBe(false);
    expect(canConfirmDelete({ inventory: i, typedName: "MKP FARMS", acknowledged: false, authorised: true })).toBe(false);
    expect(canConfirmDelete({ inventory: i, typedName: " MKP FARMS ", acknowledged: true, authorised: true })).toBe(true);
  });

  it("groups records into the review categories", () => {
    expect(categoryFor("journal_lines")).toBe("Accounting");
    expect(categoryFor("pos_sales")).toBe("Sales & POS");
    expect(categoryFor("stock_movements")).toBe("Inventory");
    expect(categoryFor("bank_transactions")).toBe("Banking & cash");
    expect(categoryFor("payslips")).toBe("Payroll & HR");
    expect(categoryFor("hotel_reservations")).toBe("Industry modules");
    expect(categoryFor("company_members")).toBe("Users & access");
    expect(categoryFor("bills")).toBe("Purchasing");

    const summary = summariseInventory(inv([
      { table: "journal_entries", count: 5, blocking: true },
      { table: "journal_lines", count: 10, blocking: true },
      { table: "company_members", count: 2 },
    ]));
    expect(summary[0]!.category).toBe("Accounting");
    expect(summary[0]!.total).toBe(15);
    expect(summary[0]!.blocking).toBe(15);
  });
});
