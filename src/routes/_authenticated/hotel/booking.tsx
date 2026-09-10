import { createFileRoute } from "@tanstack/react-router";
import { HotelWorkspace } from "@/components/industry/HotelWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/booking")({
  component: () => <HotelWorkspace screen="/hotel/booking" />,
});
