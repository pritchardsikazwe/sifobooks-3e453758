import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadTrialBalance } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/trial-balance")({
  head: () => ({ meta: [{ title: "Trial Balance — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("ytd"), periodKey: "ytd" });
  const asAt = filters.range.to;
  const { result, loading, error } = useReport(loadTrialBalance, { to: asAt }, [asAt]);

  return (
    <SifoReportViewer
      reportId="trial-balance"
      title="Trial Balance"
      subtitle={`All posted journal entries as at ${asAt}`}
      filename={`trial-balance-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "ytd" }} onApply={setFilters} />}
    />
  );
}
