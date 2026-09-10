import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadSalesByCustomer } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/sales-by-customer")({
  head: () => ({ meta: [{ title: "Sales by Customer — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByCustomerPage,
});

function SalesByCustomerPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const { from, to } = range;
  const { result, loading, error, refresh } = useReport(loadSalesByCustomer, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="sales-by-customer"
      title="Sales by Customer"
      subtitle={`Completed POS sales grouped by customer · ${from} → ${to}`}
      filename={`sales-by-customer-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`Sales by Customer — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
