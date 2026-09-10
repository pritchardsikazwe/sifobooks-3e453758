import { createFileRoute } from "@tanstack/react-router";
import { HotelWorkspace } from "@/components/industry/HotelWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/night-audit")({
  component: () => <HotelWorkspace screen="/hotel/night-audit" />,
});
