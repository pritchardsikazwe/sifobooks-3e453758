import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadApAging } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/aged-payables")({
  head: () => ({ meta: [{ title: "Aged Payables — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AgedPayablesPage,
});

function AgedPayablesPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const asAt = filters.range.to;
  const { result, loading, error } = useReport(loadApAging, { to: asAt }, [asAt]);

  return (
    <SifoReportViewer
      reportId="ap-aging"
      title="AP Aging"
      subtitle={`Outstanding supplier bills as at ${asAt}`}
      filename={`ap-aging-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
