import { createFileRoute } from "@tanstack/react-router";
import { BoardingHouseWorkspace } from "@/components/industry/BoardingHouseWorkspace";

export const Route = createFileRoute("/_authenticated/boarding-visitors")({
  component: () => <BoardingHouseWorkspace initialTab="visitors" />,
});
