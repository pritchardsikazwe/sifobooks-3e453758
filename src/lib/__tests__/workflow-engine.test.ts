import { describe, expect, it } from "vitest";
import { buildWorkQueue, EMPTY_SNAPSHOT, type WorkSnapshot } from "@/lib/workflow-engine";
import { HUBS, getHub, hubForRoute, hubItems, visibleHubGroups } from "@/lib/nav-hubs";
import { guidanceFor } from "@/lib/document-guidance";

const snap = (over: Partial<WorkSnapshot>): WorkSnapshot => ({
  ...EMPTY_SNAPSHOT,
  payrollThisMonth: { exists: true, posted: true, month: "March 2026" },
  ...over,
});

describe("work queue engine", () => {
  it("produces no tasks when nothing is outstanding", () => {
    expect(buildWorkQueue(snap({}))).toEqual([]);
  });

  it("raises overdue invoices as a high priority attention item", () => {
    const t = buildWorkQueue(snap({ overdueInvoices: { count: 2, amount: 12500 } }));
    expect(t).toHaveLength(1);
    expect(t[0].priority).toBe("high");
    expect(t[0].group).toBe("attention");
    expect(t[0].actionUrl).toBe("/invoices");
    expect(t[0].amount).toBe(12500);
  });

  it("does not duplicate unpaid guidance when invoices are already overdue", () => {
    const t = buildWorkQueue(snap({
      overdueInvoices: { count: 1, amount: 100 },
      unpaidInvoices: { count: 3, amount: 900 },
    }));
    expect(t.map(x => x.id)).not.toContain("invoices.unpaid");
  });

  it("flags unallocated bank activity and stock counts awaiting approval", () => {
    const ids = buildWorkQueue(snap({
      unallocatedBank: { count: 4 },
      countsAwaitingApproval: { count: 1 },
    })).map(t => t.id);
    expect(ids).toContain("bank.unallocated");
    expect(ids).toContain("stock.count.approval");
  });

  it("suggests starting payroll only when no run exists for the month", () => {
    const missing = buildWorkQueue(snap({ payrollThisMonth: { exists: false, posted: false, month: "March 2026" } }));
    expect(missing.map(t => t.id)).toContain("payroll.not-run");
    const unposted = buildWorkQueue(snap({ payrollThisMonth: { exists: true, posted: false, month: "March 2026" } }));
    expect(unposted.map(t => t.id)).toContain("payroll.not-posted");
  });

  it("orders high priority tasks first", () => {
    const t = buildWorkQueue(snap({
      transfersDraft: { count: 1 },
      overdueInvoices: { count: 1, amount: 1 },
    }));
    expect(t[0].priority).toBe("high");
  });

  it("every task explains itself and links somewhere real", () => {
    const t = buildWorkQueue(snap({
      overdueInvoices: { count: 1, amount: 1 },
      unallocatedBank: { count: 1 },
      lowStock: { count: 1, sample: "Breakfast Meal" },
      complianceDue: { count: 1, nextDue: "2026-03-18", nextType: "VAT" },
      transfersInTransit: { count: 1 },
      overdueBills: { count: 1, amount: 2 },
    }));
    for (const task of t) {
      expect(task.explanation.length).toBeGreaterThan(20);
      expect(task.actionUrl.startsWith("/")).toBe(true);
    }
  });
});

describe("navigation hubs", () => {
  it("keeps first-level navigation small", () => {
    expect(HUBS.length).toBeLessThanOrEqual(9);
  });

  it("keeps critical deep links reachable inside a hub", () => {
    const urls = HUBS.flatMap(hubItems).map(i => i.url);
    for (const u of ["/bank-rules", "/inventory/stock-card", "/reports/trial-balance", "/expenses", "/payroll", "/audit-logs"]) {
      expect(urls).toContain(u);
    }
  });

  it("maps a route back to its hub", () => {
    expect(hubForRoute("/inventory/transfers")?.key).toBe("inventory");
    expect(hubForRoute("/chart-of-accounts")?.key).toBe("finance");
    expect(hubForRoute("/nowhere-at-all")).toBeUndefined();
  });

  it("hides items whose module is not installed or not permitted", () => {
    const finance = getHub("finance")!;
    const groups = visibleHubGroups(finance, new Set(["finance"]), () => true);
    const urls = groups.flatMap(g => g.items).map(i => i.url);
    expect(urls).toContain("/banking");
    expect(urls).not.toContain("/budgets");
    expect(visibleHubGroups(finance, new Set(["finance"]), () => false)).toEqual([]);
  });
});

describe("document guidance", () => {
  it("explains the invoice accounting impact in plain language", () => {
    const g = guidanceFor("invoice")!;
    const impact = g.impact({ amount: "K12,500", net: "K10,775", tax: "K1,725", party: "ABC Ltd" });
    expect(impact.join(" ")).toContain("owes you");
    expect(impact.join(" ")).toContain("VAT");
    expect(g.steps({ id: "abc" })[0].to).toContain("abc");
  });

  it("does not claim a quote posts to the ledger", () => {
    expect(guidanceFor("quote")!.impact({}).join(" ").toLowerCase()).toContain("nothing posts");
  });
});
