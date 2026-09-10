import { createFileRoute } from "@tanstack/react-router";
import { HotelWorkspace } from "@/components/industry/HotelWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/channels")({
  component: () => <HotelWorkspace screen="/hotel/channels" />,
});
