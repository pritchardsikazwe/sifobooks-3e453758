import { createFileRoute } from "@tanstack/react-router";
import { InventoryFlowAudit } from "@/components/sifo/InventoryFlowAudit";

export const Route = createFileRoute("/_authenticated/reports/inventory-flow-audit")({
  head: () => ({ meta: [{ title: "Inventory Reports & Reconciliation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InventoryReportsPage,
});

function InventoryReportsPage() {
  return <InventoryFlowAudit />;
}
