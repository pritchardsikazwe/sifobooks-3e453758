import { describe, expect, it } from "vitest";
import { acctFmt, bucketFor, resultToExportRows, toMajor, toMinor, type ReportResult } from "@/lib/reports/engine";
import { buildInsights } from "@/lib/reports/insights";

describe("money handling", () => {
  it("converts to integer minor units without float drift", () => {
    expect(toMinor(0.1) + toMinor(0.2)).toBe(30);
    expect(toMajor(toMinor(0.1) + toMinor(0.2))).toBe(0.3);
  });

  it("rounds to the nearest ngwee and treats blanks as zero", () => {
    expect(toMinor(0.005)).toBe(1);
    expect(toMinor(1.004)).toBe(100);
    expect(toMinor(null)).toBe(0);
    expect(toMinor("12.34")).toBe(1234);
    expect(toMinor("not a number")).toBe(0);
  });

  it("formats negatives in accounting brackets", () => {
    expect(acctFmt(1234.5)).toBe("1,234.50");
    expect(acctFmt(-99)).toBe("(99.00)");
    expect(acctFmt(0, true)).toBe("");
  });
});

describe("aging buckets", () => {
  const asAt = "2026-03-31";
  it("buckets by days past due", () => {
    expect(bucketFor("2026-04-10", asAt)).toBe("current");
    expect(bucketFor("2026-03-15", asAt)).toBe("1-30");
    expect(bucketFor("2026-02-15", asAt)).toBe("31-60");
    expect(bucketFor("2026-01-15", asAt)).toBe("61-90");
    expect(bucketFor("2025-10-01", asAt)).toBe("90+");
    expect(bucketFor(null, asAt)).toBe("current");
  });
});

const makeResult = (facts: ReportResult["facts"], sufficient = true): ReportResult => ({
  columns: [{ key: "a", label: "A" }],
  rows: [{ a: 1 }],
  summary: [],
  notes: [],
  sufficient,
  facts,
});

describe("smart reporter insights", () => {
  it("says so when data is insufficient instead of guessing", () => {
    const out = buildInsights("pnl", makeResult({}, false));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("insufficient");
    expect(out[0].severity).toBe("info");
  });

  it("flags an unbalanced trial balance as critical", () => {
    const out = buildInsights("trial-balance", makeResult({ totalDebit: 100, totalCredit: 90, difference: 10, accounts: 6, balanced: false }));
    expect(out[0].severity).toBe("critical");
    expect(out[0].fact).toContain("10.00");
  });

  it("reports a balanced trial balance as healthy", () => {
    const out = buildInsights("trial-balance", makeResult({ totalDebit: 100, totalCredit: 100, difference: 0, accounts: 8, balanced: true }));
    expect(out[0].severity).toBe("healthy");
  });

  it("warns when revenue is posted without cost of sales", () => {
    const out = buildInsights("pnl", makeResult({ revenue: 5000, cogs: 0, opex: 1000, netProfit: 4000, grossMargin: 1 }));
    expect(out.some((i) => i.id === "pnl-no-cogs" && i.severity === "warning")).toBe(true);
  });

  it("flags negative stock and missing costs", () => {
    const out = buildInsights("stock-valuation", makeResult({ items: 10, totalQty: 5, totalValue: 0, missingCost: 3, negative: 2 }));
    expect(out.some((i) => i.id === "stock-missing-cost")).toBe(true);
    expect(out.some((i) => i.id === "stock-negative" && i.severity === "critical")).toBe(true);
  });

  it("separates fact from interpretation on every insight", () => {
    const out = buildInsights("stock-reconciliation", makeResult({ items: 4, variances: 2, netVariance: -3 }));
    for (const i of out) {
      expect(i.fact.length).toBeGreaterThan(0);
      expect(i.interpretation.length).toBeGreaterThan(0);
      expect(i.action.length).toBeGreaterThan(0);
    }
  });
});

describe("export mapping", () => {
  it("uses column labels and fixes numeric precision", () => {
    const rows = resultToExportRows({
      columns: [
        { key: "account", label: "Account" },
        { key: "debit", label: "Debit", money: true },
      ],
      rows: [{ account: "Bank", debit: 12.5 }],
      summary: [],
      notes: [],
      sufficient: true,
      facts: {},
    });
    expect(rows[0]).toEqual({ Account: "Bank", Debit: "12.50" });
  });
});
