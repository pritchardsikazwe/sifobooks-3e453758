import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/transport")({ component: SchoolTransport });
function SchoolTransport() { return <SifoIndustryWorkspace kind="school" screen="/school/students" />; }
