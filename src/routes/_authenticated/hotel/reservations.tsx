import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorConnectedWorkspace } from "@/components/sifo/SifoSectorConnectedWorkspace";
export const Route = createFileRoute("/_authenticated/hotel/reservations")({ component: () => <SifoSectorConnectedWorkspace kind="hotel" screen="/hotel/reservations" /> });
