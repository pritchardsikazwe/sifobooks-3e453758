import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/guest-portal")({ component: HotelGuestPortal });
function HotelGuestPortal() { return <SifoIndustryWorkspace kind="hotel" screen="/hotel/guests" />; }
