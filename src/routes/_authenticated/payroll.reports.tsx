import { createFileRoute } from "@tanstack/react-router";
import { StandaloneReports } from "@/components/industry/StandaloneReports";

export const Route = createFileRoute("/_authenticated/payroll/reports")({
  head: () => ({ meta: [{ title: "Payroll Reports — SifoBooks" }] }),
  component: () => <StandaloneReports edition="payroll" />,
});
