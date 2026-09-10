import { describe, expect, it } from "vitest";
import { aggregateExpenses, monthsBetween, type ExpenseLine } from "@/lib/reports/engine";
import { compareRange, monthRange, resolveRange, varianceOf } from "@/lib/reports/periods";

const line = (p: Partial<ExpenseLine> & { date: string; amountMinor: number }): ExpenseLine => ({
  entryId: p.entryId ?? "e1",
  entryNumber: p.entryNumber ?? "JE-1",
  reference: p.reference ?? null,
  description: p.description ?? "",
  accountId: p.accountId ?? "a1",
  accountCode: p.accountCode ?? "6100",
  accountName: p.accountName ?? "Utilities",
  cogs: p.cogs ?? false,
  payee: p.payee ?? "Journals & other",
  ...p,
});

const sample: ExpenseLine[] = [
  line({ date: "2026-01-10", amountMinor: 100_00, accountId: "a1", accountName: "Utilities", payee: "ZESCO" }),
  line({ date: "2026-01-20", amountMinor: 50_00, accountId: "a1", accountName: "Utilities", payee: "ZESCO" }),
  line({ date: "2026-02-05", amountMinor: 200_00, accountId: "a2", accountCode: "6200", accountName: "Rent", payee: "Landlord" }),
  line({ date: "2026-02-18", amountMinor: 300_00, accountId: "a3", accountCode: "5100", accountName: "Materials", cogs: true, payee: "Supplier X" }),
  // a reversal credit against Utilities must reduce the total, not add to it
  line({ date: "2026-02-25", amountMinor: -20_00, accountId: "a1", accountName: "Utilities", payee: "ZESCO" }),
];

const P = { from: "2026-01-01", to: "2026-02-28" };

describe("Expenses report totals", () => {
  it("totals every posted expense line, netting reversals", () => {
    const r = aggregateExpenses(sample, { ...P, view: "summary" });
    expect(r.facts.total).toBe(630);
    const grand = r.rows.find((x) => x.account === "TOTAL EXPENSES");
    expect(grand?.amount).toBe(630);
  });

  it("never leaves a summary without a grand total", () => {
    for (const view of ["summary", "detail", "month", "payee"] as const) {
      const r = aggregateExpenses(sample, { ...P, view });
      expect(r.rows.some((x) => x._emphasis === "total")).toBe(true);
    }
  });

  it("separates cost of sales from operating expenses and subtotals both", () => {
    const r = aggregateExpenses(sample, { ...P, view: "summary" });
    expect(r.rows.find((x) => x.account === "Total cost of sales")?.amount).toBe(300);
    expect(r.rows.find((x) => x.account === "Total operating expenses")?.amount).toBe(330);
  });

  it("shows percentage of total per category", () => {
    const r = aggregateExpenses(sample, { ...P, view: "summary" });
    const utilities = r.rows.find((x) => x.account === "Utilities");
    expect(utilities?.amount).toBe(130);
    expect(utilities?.share).toBeCloseTo(20.6, 1);
  });

  it("counts transactions per category and overall", () => {
    const r = aggregateExpenses(sample, { ...P, view: "summary" });
    expect(r.facts.transactions).toBe(5);
    expect(r.rows.find((x) => x.account === "Utilities")?.transactions).toBe(3);
  });

  it("builds month columns whose monthly totals sum to the grand total", () => {
    const r = aggregateExpenses(sample, { ...P, view: "month" });
    const total = r.rows.find((x) => x._emphasis === "total")!;
    expect(total["2026-01"]).toBe(150);
    expect(total["2026-02"]).toBe(480);
    expect(Number(total["2026-01"]) + Number(total["2026-02"])).toBe(total.amount);
  });

  it("lists each transaction once in detail view", () => {
    const r = aggregateExpenses(sample, { ...P, view: "detail" });
    expect(r.rows.filter((x) => !x._emphasis)).toHaveLength(sample.length);
  });

  it("groups by payee without losing value", () => {
    const r = aggregateExpenses(sample, { ...P, view: "payee" });
    expect(r.rows.find((x) => x.payee === "ZESCO")?.amount).toBe(130);
    expect(r.rows.find((x) => x._emphasis === "total")?.amount).toBe(630);
  });

  it("filters to a single account for drill-down", () => {
    const r = aggregateExpenses(sample, { ...P, view: "detail", accountId: "a1" });
    expect(r.facts.total).toBe(130);
  });

  it("reports no data rather than a false zero when nothing is posted", () => {
    const r = aggregateExpenses([], { ...P, view: "summary" });
    expect(r.sufficient).toBe(false);
  });

  it("enumerates months inclusively", () => {
    expect(monthsBetween("2026-01-15", "2026-04-02")).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });
});

describe("Report period selection", () => {
  const today = new Date(2026, 8, 15); // 15 Sep 2026

  it("resolves the common presets", () => {
    expect(resolveRange("this-month", undefined, today)).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolveRange("last-month", undefined, today)).toMatchObject({ from: "2026-08-01", to: "2026-08-31" });
    expect(resolveRange("this-quarter", undefined, today)).toMatchObject({ from: "2026-07-01", to: "2026-09-30" });
    expect(resolveRange("last-quarter", undefined, today)).toMatchObject({ from: "2026-04-01", to: "2026-06-30" });
    expect(resolveRange("ytd", undefined, today)).toMatchObject({ from: "2026-01-01", to: "2026-09-30" });
    expect(resolveRange("last-12", undefined, today)).toMatchObject({ from: "2025-10-01", to: "2026-09-30" });
    expect(resolveRange("this-year", undefined, today)).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
    expect(resolveRange("prev-year", undefined, today)).toMatchObject({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("selects a single month from the month strip", () => {
    expect(monthRange(2026, 1)).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("derives comparison windows", () => {
    const sep = monthRange(2026, 8);
    expect(compareRange(sep, "prev-period")).toMatchObject({ from: "2026-08-01", to: "2026-08-31" });
    expect(compareRange(sep, "prev-year")).toMatchObject({ from: "2025-09-01", to: "2025-09-30" });
    expect(compareRange(sep, "none")).toBeNull();
  });

  it("suppresses a variance rate when there is no comparable base", () => {
    expect(varianceOf(100, 0).rate).toBeNull();
    expect(varianceOf(150, 100).rate).toBeCloseTo(0.5);
  });
});
