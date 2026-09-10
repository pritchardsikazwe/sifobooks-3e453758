import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { loadVatReport } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/vat")({
  head: () => ({ meta: [{ title: "VAT / Tax Report — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: VatReportPage,
});

function VatReportPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const { from, to } = range;
  const { result, loading, error, refresh } = useReport(loadVatReport, { from, to }, [from, to]);

  return (
    <SifoReportViewer
      reportId="vat"
      title="VAT / Tax"
      subtitle={`Output VAT, input VAT and net position, cross-checked to posted journals · ${from} → ${to}`}
      filename={`vat-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar range={range} onRange={setRange} onRefresh={refresh} refreshing={loading}>
          <SaveViewButton defaultName={`VAT / Tax — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
