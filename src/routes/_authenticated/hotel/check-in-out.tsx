import { createFileRoute } from "@tanstack/react-router";
import { HotelWorkspace } from "@/components/industry/HotelWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/check-in-out")({
  component: () => <HotelWorkspace screen="/hotel/check-in-out" />,
});
