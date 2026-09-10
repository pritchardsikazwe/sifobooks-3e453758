import { createFileRoute } from "@tanstack/react-router";
import { HotelWorkspace } from "@/components/industry/HotelWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/room-rack")({
  component: () => <HotelWorkspace screen="/hotel/room-rack" />,
});
