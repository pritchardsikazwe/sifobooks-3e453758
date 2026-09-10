import { createFileRoute } from "@tanstack/react-router";
import { HotelWorkspace } from "@/components/industry/HotelWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/compliance")({
  component: () => <HotelWorkspace screen="/hotel/compliance" />,
});
