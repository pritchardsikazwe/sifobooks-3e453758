import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/maintenance")({ component: HotelMaintenance });
function HotelMaintenance() { return <SifoIndustryWorkspace kind="hotel" screen="/hotel/maintenance" />; }
