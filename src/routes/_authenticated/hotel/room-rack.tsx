import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/room-rack")({ component: () => <SifoIndustryWorkspace kind="hotel" screen="/hotel/room-rack" /> });
