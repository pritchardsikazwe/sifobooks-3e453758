import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorWorkflow } from "@/components/sifo/SifoSectorWorkflow";
export const Route = createFileRoute("/_authenticated/hotel/night-audit")({ component: RouteComponent });
function RouteComponent(){ return <SifoSectorWorkflow kind="hotel" screen="/hotel/night-audit"/>; }
