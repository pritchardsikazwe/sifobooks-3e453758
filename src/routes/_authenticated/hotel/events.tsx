import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/events")({ component: HotelEvents });
function HotelEvents() { return <SifoIndustryWorkspace kind="hotel" screen="/hotel/events" />; }
