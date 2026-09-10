import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadSalesByBranch } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/sales-by-branch")({
  head: () => ({ meta: [{ title: "Sales by Branch — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByBranchPage,
});

function SalesByBranchPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const { from, to } = range;
  const { result, loading, error, refresh } = useReport(loadSalesByBranch, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="sales-by-branch"
      title="Sales by Branch"
      subtitle={`Completed POS sales grouped by branch or selling location · ${from} → ${to}`}
      filename={`sales-by-branch-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`Sales by Branch — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
