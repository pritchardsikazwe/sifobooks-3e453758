import { createFileRoute } from "@tanstack/react-router";
import { FileSearch } from "lucide-react";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { QuotationComparison } from "@/components/sifo/QuotationComparison";

export const Route = createFileRoute("/_authenticated/quotation-comparison")({ component: QuotationComparisonPage });

function QuotationComparisonPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
      <SifoModuleHeader
        module="purchases"
        icon={FileSearch}
        title="Quotation Comparison"
        description="Compare supplier quotations using transparent, configurable evaluation criteria."
      />
      <QuotationComparison />
    </div>
  );
}
