import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/reports/inventory-flow-audit")({
  head: () => ({ meta: [{ title: "Inventory Flow & Audit — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => <Navigate to="/inventory-flow-audit" replace />,
});
