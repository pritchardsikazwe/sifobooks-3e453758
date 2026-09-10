import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadSalesByBranch } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/sales-by-branch")({
  head: () => ({ meta: [{ title: "Sales by Branch — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByBranchPage,
});

function SalesByBranchPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to } = filters.range;
  const { result, loading, error } = useReport(loadSalesByBranch, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="sales-by-branch"
      title="Sales by Branch"
      subtitle={`Completed POS sales grouped by branch or selling location · ${from} → ${to}`}
      filename={`sales-by-branch-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
