import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadTrialBalance } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/trial-balance")({
  head: () => ({ meta: [{ title: "Trial Balance — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const [range, setRange] = useState<Range>(() => resolveRange("ytd"));
  const asAt = range.to;
  const { result, loading, error, refresh } = useReport(loadTrialBalance, { to: asAt }, [asAt]);

  return (
    <SifoReportViewer
      reportId="trial-balance"
      title="Trial Balance"
      subtitle={`All posted journal entries as at ${asAt}`}
      filename={`trial-balance-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`Trial Balance — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
