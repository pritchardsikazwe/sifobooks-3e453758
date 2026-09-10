import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { useReport } from "@/lib/reports/use-report";
import { acctFmt, loadExpenses, type ExpenseView, type ReportResult } from "@/lib/reports/engine";
import { compareRange, resolveRange, varianceOf, type CompareKey, type Range } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Search = { view?: ExpenseView; account?: string; from?: string; to?: string };

const VIEWS: { key: ExpenseView; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "detail", label: "Detail" },
  { key: "month", label: "By month" },
  { key: "payee", label: "By payee" },
];

export const Route = createFileRoute("/_authenticated/reports/expenses")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    view: VIEWS.some((v) => v.key === s.view) ? (s.view as ExpenseView) : undefined,
    account: typeof s.account === "string" && s.account ? s.account : undefined,
    from: typeof s.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.from) ? s.from : undefined,
    to: typeof s.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.to) ? s.to : undefined,
  }),
  head: () => ({ meta: [{ title: "Expenses Report — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ExpensesReport,
});

function ExpensesReport() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [range, setRange] = useState<Range>(() =>
    search.from && search.to
      ? { from: search.from, to: search.to, label: `${search.from} → ${search.to}`, key: "custom" }
      : resolveRange("this-month"),
  );
  const [compare, setCompare] = useState<CompareKey>("none");
  const view = search.view ?? "summary";
  const accountId = search.account;

  const setView = (v: ExpenseView) =>
    void navigate({ to: "/reports/expenses", search: (prev) => ({ ...prev, view: v }) });
  const clearAccount = () =>
    void navigate({ to: "/reports/expenses", search: (prev) => ({ ...prev, account: undefined }) });

  const { result, loading, error, refresh } = useReport(
    loadExpenses,
    { from: range.from, to: range.to, view, accountId },
    [range.from, range.to, view, accountId],
  );

  const cmp = compareRange(range, compare);
  const { result: cmpResult } = useReport(
    loadExpenses,
    { from: cmp?.from ?? range.from, to: cmp?.to ?? range.to, view: "summary" as ExpenseView, accountId },
    [cmp?.from, cmp?.to, accountId, compare],
  );

  const merged: ReportResult | null = useMemo(() => {
    if (!result) return null;
    if (!cmp || !cmpResult) return result;
    const cur = Number(result.facts.total ?? 0);
    const prev = Number(cmpResult.facts.total ?? 0);
    const v = varianceOf(cur, prev);
    return {
      ...result,
      summary: [
        ...result.summary,
        { label: cmp.label, value: acctFmt(prev), hint: `${cmp.from} → ${cmp.to}` },
        {
          label: "Variance",
          value: `${v.amount >= 0 ? "+" : "−"}${acctFmt(Math.abs(v.amount))}${v.rate == null ? "" : ` · ${(v.rate * 100).toFixed(1)}%`}`,
          tone: v.amount > 0 ? "bad" : v.amount < 0 ? "good" : "default",
          hint: v.rate == null ? "No comparable base figure" : "Against the comparison period",
        },
      ],
    };
  }, [result, cmpResult, cmp]);

  return (
    <SifoReportViewer
      reportId="expenses"
      title="Expenses"
      subtitle={`Posted expense accounts · ${range.label} (${range.from} → ${range.to})${accountId ? " · filtered to one account" : ""}`}
      filename={`expenses-${view}-${range.from}-to-${range.to}`}
      loading={loading}
      error={error}
      result={merged}
      filters={
        <ReportPeriodBar
          range={range}
          onRange={setRange}
          compare={compare}
          onCompare={setCompare}
          onRefresh={refresh}
          refreshing={loading}
          customizeTitle="Customise expenses report"
          customize={
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">View</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {VIEWS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setView(v.key)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        view === v.key ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {accountId && (
                <button type="button" onClick={clearAccount} className="text-sm text-primary underline underline-offset-4">
                  Clear the single-account filter
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Figures come from posted journal entries on expense accounts — the same basis as the Profit &amp; Loss.
                Supplier payments are excluded so nothing is counted twice.
              </p>
            </div>
          }
        >
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">View</Label>
            <div className="flex rounded-md border border-border p-0.5">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={cn(
                    "rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                    view === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </ReportPeriodBar>
      }
      extraActions={
        accountId ? (
          <button type="button" onClick={clearAccount} className="text-xs text-primary underline underline-offset-4">
            Showing one account — show all
          </button>
        ) : undefined
      }
    />
  );
}
