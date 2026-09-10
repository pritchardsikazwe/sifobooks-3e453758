import { describe, expect, it } from "vitest";
import {
  blockers, reviewPayroll, runTotals, slipDeductions, varianceRows,
  type ReviewEmployee, type ReviewSlip,
} from "@/lib/payroll-review";

const emp = (over: Partial<ReviewEmployee> = {}): ReviewEmployee => ({
  id: "e1", first_name: "Chanda", last_name: "Mwale", employee_code: "E-001",
  national_id: "123456/78/1", tpin: "1000000000", napsa_number: "NP1", nhima_number: "NH1",
  bank_name: "Zanaco", bank_account: "0001", status: "active", ...over,
});

const slip = (over: Partial<ReviewSlip> = {}): ReviewSlip => ({
  id: "s1", employee_id: "e1", basic_salary: 10000, allowances: 1000, overtime: 0,
  gross_pay: 11000, paye: 1500, napsa: 500, nhima: 110, other_deductions: 0, loan_deduction: 0,
  net_pay: 8890, ...over,
});

describe("payroll review totals", () => {
  it("adds deductions per slip including loans", () => {
    expect(slipDeductions(slip({ loan_deduction: 250 }))).toBe(2360);
  });

  it("totals a run and derives total deductions", () => {
    const t = runTotals([slip(), slip({ id: "s2", employee_id: "e2" })]);
    expect(t.employees).toBe(2);
    expect(t.gross).toBe(22000);
    expect(t.net).toBe(17780);
    expect(t.deductions).toBe(4220);
  });
});

describe("payroll review checks", () => {
  it("passes a clean run", () => {
    expect(reviewPayroll([slip()], [emp()])).toEqual([]);
  });

  it("blocks negative net pay and net that does not tie to gross", () => {
    const issues = reviewPayroll([slip({ net_pay: -100 })], [emp()]);
    expect(issues.map((i) => i.code)).toContain("negative_net");
    expect(blockers(issues).length).toBeGreaterThan(0);
  });

  it("blocks duplicate payslips for one employee", () => {
    const issues = reviewPayroll([slip(), slip({ id: "s2" })], [emp()]);
    expect(issues.some((i) => i.code === "duplicate_employee" && i.severity === "blocker")).toBe(true);
  });

  it("warns on missing bank and statutory identifiers", () => {
    const issues = reviewPayroll([slip()], [emp({ bank_account: null, tpin: "", napsa_number: null })]);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("missing_bank");
    expect(codes).toContain("missing_statutory_id");
    expect(blockers(issues)).toEqual([]);
  });

  it("flags large net movement, new and dropped employees", () => {
    const prev = [slip({ id: "p1", net_pay: 4000 }), slip({ id: "p2", employee_id: "gone", net_pay: 3000 })];
    const issues = reviewPayroll([slip()], [emp()], prev);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("net_variance");
    expect(codes).toContain("dropped_employee");
  });

  it("orders variance rows by the biggest movement", () => {
    const rows = varianceRows(
      [slip(), slip({ id: "s2", employee_id: "e2", net_pay: 9000, gross_pay: 11000, other_deductions: 890 })],
      [slip({ id: "p1", net_pay: 8000 }), slip({ id: "p2", employee_id: "e2", net_pay: 8990 })],
      [emp(), emp({ id: "e2", first_name: "Bwalya", last_name: "Phiri" })],
    );
    expect(rows[0]!.employeeId).toBe("e1");
    expect(rows[0]!.diff).toBe(890);
    expect(rows[1]!.diff).toBe(10);
  });
});
