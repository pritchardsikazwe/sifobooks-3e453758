import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadBalanceSheet } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/balance-sheet")({
  head: () => ({ meta: [{ title: "Balance Sheet — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BalanceSheetPage,
});

function BalanceSheetPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("ytd"), periodKey: "ytd" });
  const asAt = filters.range.to;
  const fyStart = filters.range.from;
  const { result, loading, error } = useReport(loadBalanceSheet, { to: asAt, fyStart }, [asAt, fyStart]);

  return (
    <SifoReportViewer
      reportId="balance-sheet"
      title="Balance Sheet"
      subtitle={`Statement of financial position as at ${asAt}`}
      filename={`balance-sheet-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "ytd" }} onApply={setFilters} />}
    />
  );
}
