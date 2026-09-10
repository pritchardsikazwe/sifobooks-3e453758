import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { acctFmt, loadProfitAndLoss, type ReportResult } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";
import { compareRange, resolveRange, varianceOf, type CompareKey, type Range } from "@/lib/reports/periods";

export const Route = createFileRoute("/_authenticated/reports/pnl")({
  head: () => ({ meta: [{ title: "Profit & Loss \u2014 SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PnLPage,
});

function PnLPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const [compare, setCompare] = useState<CompareKey>("none");
  const { result, loading, error, refresh } = useReport(loadProfitAndLoss, { from: range.from, to: range.to }, [range.from, range.to]);

  const cmp = compareRange(range, compare);
  const { result: cmpResult } = useReport(
    loadProfitAndLoss,
    { from: cmp?.from ?? range.from, to: cmp?.to ?? range.to },
    [cmp?.from, cmp?.to, compare],
  );

  const merged: ReportResult | null = useMemo(() => {
    if (!result) return null;
    if (!cmp || !cmpResult) return result;
    const v = varianceOf(Number(result.facts.netProfit ?? 0), Number(cmpResult.facts.netProfit ?? 0));
    return {
      ...result,
      summary: [
        ...result.summary,
        { label: `Net result \u00b7 ${cmp.label}`, value: acctFmt(Number(cmpResult.facts.netProfit ?? 0)), hint: `${cmp.from} \u2192 ${cmp.to}` },
        {
          label: "Variance",
          value: `${v.amount >= 0 ? "+" : "\u2212"}${acctFmt(Math.abs(v.amount))}${v.rate == null ? "" : ` \u00b7 ${(v.rate * 100).toFixed(1)}%`}`,
          tone: v.amount >= 0 ? "good" : "bad",
        },
      ],
    };
  }, [result, cmpResult, cmp]);

  return (
    <SifoReportViewer
      reportId="pnl"
      title="Profit & Loss"
      subtitle={`Posted journals \u00b7 ${range.label} (${range.from} \u2192 ${range.to})`}
      filename={`profit-and-loss-${range.from}-to-${range.to}`}
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
        />
      }
    />
  );
}
