import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadBalanceSheet } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/balance-sheet")({
  head: () => ({ meta: [{ title: "Balance Sheet — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BalanceSheetPage,
});

function BalanceSheetPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("ytd"));
  const asAt = range.to;
  const fyStart = range.from;
  const { result, loading, error, refresh } = useReport(loadBalanceSheet, { to: asAt, fyStart }, [asAt, fyStart]);

  return (
    <SifoReportViewer
      reportId="balance-sheet"
      title="Balance Sheet"
      subtitle={`Statement of financial position as at ${asAt}`}
      filename={`balance-sheet-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`Balance Sheet — as at ${asAt}`} />
        </ReportPeriodBar>
      }
    />
  );
}
