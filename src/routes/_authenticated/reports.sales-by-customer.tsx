import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadSalesByCustomer } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/sales-by-customer")({
  head: () => ({ meta: [{ title: "Sales by Customer — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByCustomerPage,
});

function SalesByCustomerPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to } = filters.range;
  const { result, loading, error } = useReport(loadSalesByCustomer, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="sales-by-customer"
      title="Sales by Customer"
      subtitle={`Completed POS sales grouped by customer · ${from} → ${to}`}
      filename={`sales-by-customer-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
