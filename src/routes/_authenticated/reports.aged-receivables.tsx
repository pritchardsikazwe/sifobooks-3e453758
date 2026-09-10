import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadArAging } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/aged-receivables")({
  head: () => ({ meta: [{ title: "Aged Receivables — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AgedReceivablesPage,
});

function AgedReceivablesPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const asAt = filters.range.to;
  const { result, loading, error } = useReport(loadArAging, { to: asAt }, [asAt]);

  return (
    <SifoReportViewer
      reportId="ar-aging"
      title="AR Aging"
      subtitle={`Outstanding customer invoices as at ${asAt}`}
      filename={`ar-aging-${asAt}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
