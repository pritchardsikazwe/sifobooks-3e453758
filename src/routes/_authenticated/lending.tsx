import { createFileRoute } from "@tanstack/react-router";
import { LendingWorkspace } from "@/components/industry/LendingWorkspace";

export const Route = createFileRoute("/_authenticated/lending")({
  component: () => <LendingWorkspace screen="/lending" />,
});
