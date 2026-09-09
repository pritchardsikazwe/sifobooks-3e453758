import { createFileRoute } from "@tanstack/react-router";
import { FileSearch } from "lucide-react";
import { SifoDocumentLayout } from "@/components/sifo/SifoDocumentLayout";
import { QuotationComparison } from "@/components/sifo/QuotationComparison";

export const Route = createFileRoute("/_authenticated/quotation-comparison")({ component: QuotationComparisonPage });

function QuotationComparisonPage() {
  return <SifoDocumentLayout module="purchases" icon={FileSearch} title="Quotation Comparison" description="Compare supplier quotations using transparent, configurable evaluation criteria."><QuotationComparison /></SifoDocumentLayout>;
}
