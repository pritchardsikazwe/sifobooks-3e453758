import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadProfitAndLoss } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/pnl")({
  head: () => ({ meta: [{ title: "Profit & Loss — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PnLPage,
});

function PnLPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to, label } = filters.range;
  const { result, loading, error } = useReport(loadProfitAndLoss, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="pnl"
      title="Profit & Loss"
      subtitle={`Posted journals · ${label} (${from} → ${to})`}
      filename={`profit-and-loss-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
