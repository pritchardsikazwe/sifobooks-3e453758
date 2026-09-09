import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/reservations")({ component: () => <SifoIndustryWorkspace kind="hotel" screen="/hotel/reservations" /> });
