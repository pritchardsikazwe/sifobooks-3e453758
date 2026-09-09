import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/folios")({ component: HotelFolios });
function HotelFolios() { return <SifoIndustryWorkspace kind="hotel" screen="/hotel/folios" />; }
