import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadArAging } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/aged-receivables")({
  head: () => ({ meta: [{ title: "Aged Receivables — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AgedReceivablesPage,
});

function AgedReceivablesPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const asAt = range.to;
  const { result, loading, error, refresh } = useReport(loadArAging, { to: asAt }, [asAt]);

  return (
    <SifoReportViewer
      reportId="ar-aging"
      title="AR Aging"
      subtitle={`Outstanding customer invoices as at ${asAt}`}
      filename={`ar-aging-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`AR Aging — as at ${asAt}`} />
        </ReportPeriodBar>
      }
    />
  );
}
