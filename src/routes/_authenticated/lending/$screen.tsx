import { createFileRoute } from "@tanstack/react-router";
import { LendingWorkspace } from "@/components/industry/LendingWorkspace";

export const Route = createFileRoute("/_authenticated/lending/$screen")({
  component: LendingScreen,
});

function LendingScreen() {
  const { screen } = Route.useParams();
  return <LendingWorkspace screen={`/lending/${screen}`} />;
}
