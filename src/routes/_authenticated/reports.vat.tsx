import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";
import { loadVatReport } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/vat")({
  head: () => ({ meta: [{ title: "VAT / Tax Report — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: VatReportPage,
});

function VatReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to } = filters.range;
  const { result, loading, error } = useReport(loadVatReport, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="vat"
      title="VAT / Tax"
      subtitle={`Output VAT, input VAT and net position, cross-checked to posted journals · ${from} → ${to}`}
      filename={`vat-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={<ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />}
    />
  );
}
