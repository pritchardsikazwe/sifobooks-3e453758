import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/guests")({ component: HotelGuests });
function HotelGuests() { return <SifoIndustryWorkspace kind="hotel" screen="/hotel/guests" />; }
