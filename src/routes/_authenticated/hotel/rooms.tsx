import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/rooms")({ component: HotelRooms });
function HotelRooms() { return <SifoIndustryWorkspace kind="hotel" screen="/hotel/rooms" />; }
