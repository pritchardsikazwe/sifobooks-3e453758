import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadApAging } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/aged-payables")({
  head: () => ({ meta: [{ title: "Aged Payables — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AgedPayablesPage,
});

function AgedPayablesPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const asAt = range.to;
  const { result, loading, error, refresh } = useReport(loadApAging, { to: asAt }, [asAt]);

  return (
    <SifoReportViewer
      reportId="ap-aging"
      title="AP Aging"
      subtitle={`Outstanding supplier bills as at ${asAt}`}
      filename={`ap-aging-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`AP Aging — as at ${asAt}`} />
        </ReportPeriodBar>
      }
    />
  );
}
