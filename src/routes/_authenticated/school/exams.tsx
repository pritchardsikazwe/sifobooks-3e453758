import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorWorkflow } from "@/components/sifo/SifoSectorWorkflow";
export const Route = createFileRoute("/_authenticated/school/exams")({ component: RouteComponent });
function RouteComponent(){ return <SifoSectorWorkflow kind="school" screen="/school/exams"/>; }
