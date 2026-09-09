import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorDashboard } from "@/components/sifo/SifoSectorDashboard";

export const Route = createFileRoute("/_authenticated/hotel")({
  component: () => <SifoSectorDashboard kind="hotel" />,
});
