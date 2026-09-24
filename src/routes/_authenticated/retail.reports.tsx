import { createFileRoute } from "@tanstack/react-router";
import { StandaloneReports } from "@/components/industry/StandaloneReports";

export const Route = createFileRoute("/_authenticated/retail/reports")({
  head: () => ({ meta: [{ title: "Retail Reports — SifoBooks" }] }),
  component: () => <StandaloneReports edition="retail" />,
});
