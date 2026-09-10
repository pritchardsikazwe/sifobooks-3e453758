import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadSalesByItem } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/sales-by-item")({
  head: () => ({ meta: [{ title: "Sales by Item — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByItemPage,
});

function SalesByItemPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to } = filters.range;
  const { result, loading, error } = useReport(loadSalesByItem, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="sales-by-item"
      title="Sales by Item"
      subtitle={`Completed POS sales only · ${from} → ${to}`}
      filename={`sales-by-item-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
