import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadSalesByItem } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/sales-by-item")({
  head: () => ({ meta: [{ title: "Sales by Item — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByItemPage,
});

function SalesByItemPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const { from, to } = range;
  const { result, loading, error, refresh } = useReport(loadSalesByItem, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="sales-by-item"
      title="Sales by Item"
      subtitle={`Completed POS sales only · ${from} → ${to}`}
      filename={`sales-by-item-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`Sales by Item — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
