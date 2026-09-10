import { describe, expect, it } from "vitest";
import {
  derivedStatus, filingExceptions, filingFigures, reconcileFiling, statusReason, variance,
  type EmployeeRow, type SlipRow,
} from "@/lib/payroll-statutory";

const slips: SlipRow[] = [
  { employee_id: "a", basic_salary: 8000, gross_pay: 8000, paye: 1200, napsa: 400, nhima: 80, net_pay: 6320 },
  { employee_id: "b", basic_salary: 3000, gross_pay: 3000, paye: 0, napsa: 150, nhima: 30, net_pay: 2820 },
];

const employees: EmployeeRow[] = [
  { id: "a", first_name: "Ada", last_name: "Banda", tpin: "1001", national_id: "111/1/1", napsa_number: "N1", nhima_number: "H1" },
  { id: "b", first_name: "Ben", last_name: "Chanda", tpin: null, national_id: null, napsa_number: null, nhima_number: "H2" },
];

describe("statutory filing figures", () => {
  it("counts only contributing employees for PAYE", () => {
    const f = filingFigures(slips, "paye");
    expect(f.employees).toBe(1);
    expect(f.employeeAmount).toBe(1200);
    expect(f.employerAmount).toBe(0);
    expect(f.total).toBe(1200);
  });

  it("mirrors the employer side for NAPSA", () => {
    const f = filingFigures(slips, "napsa");
    expect(f.employeeAmount).toBe(550);
    expect(f.employerAmount).toBe(550);
    expect(f.total).toBe(1100);
  });

  it("reconciles against the payroll run total", () => {
    const f = filingFigures(slips, "nhima");
    expect(reconcileFiling(f, 110).reconciled).toBe(true);
    const off = reconcileFiling(f, 100);
    expect(off.reconciled).toBe(false);
    expect(off.difference).toBe(10);
  });
});

describe("filing exceptions", () => {
  it("flags missing identifiers only for contributing employees", () => {
    expect(filingExceptions(slips, employees, "paye")).toHaveLength(0);
    const napsa = filingExceptions(slips, employees, "napsa");
    expect(napsa).toHaveLength(1);
    expect(napsa[0]!.name).toBe("Ben Chanda");
    expect(napsa[0]!.missing).toEqual(["NAPSA number", "NRC"]);
    expect(filingExceptions(slips, employees, "nhima")).toHaveLength(0);
  });
});

describe("status derivation", () => {
  const figures = filingFigures(slips, "paye");

  it("is ready when reconciled with no exceptions", () => {
    expect(derivedStatus({ figures, reconciled: true, exceptions: 0 })).toBe("ready");
  });

  it("needs configuration when out of balance or missing identifiers", () => {
    expect(derivedStatus({ figures, reconciled: false, exceptions: 0 })).toBe("needs_configuration");
    expect(derivedStatus({ figures, reconciled: true, exceptions: 2 })).toBe("needs_configuration");
  });

  it("keeps a recorded submission or failure", () => {
    expect(derivedStatus({ figures, reconciled: true, exceptions: 0, recorded: "submitted" })).toBe("submitted");
    expect(derivedStatus({ figures, reconciled: false, exceptions: 3, recorded: "failed" })).toBe("failed");
    expect(derivedStatus({ figures, reconciled: true, exceptions: 0, recorded: "exported" })).toBe("exported");
  });

  it("explains why a filing is not ready", () => {
    expect(statusReason({ figures, reconciled: true, difference: 0, exceptions: 0 })).toBeNull();
    expect(statusReason({ figures, reconciled: false, difference: 10, exceptions: 0 })).toContain("10.00");
    expect(statusReason({ figures: filingFigures([], "paye"), reconciled: true, difference: 0, exceptions: 0 }))
      .toContain("No employee");
  });
});

describe("variance", () => {
  it("returns difference and percentage", () => {
    expect(variance(120, 100)).toEqual({ current: 120, previous: 100, diff: 20, pct: 20 });
    expect(variance(120, 0).pct).toBeNull();
  });
});
