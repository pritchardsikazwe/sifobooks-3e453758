import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/boarding")({ component: SchoolBoarding });
function SchoolBoarding() { return <SifoIndustryWorkspace kind="school" screen="/school/students" />; }
