import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/academics")({ component: SchoolAcademics });
function SchoolAcademics() { return <SifoIndustryWorkspace kind="school" screen="/school/academics" />; }
