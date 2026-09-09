import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/parent-portal")({ component: SchoolParentPortal });
function SchoolParentPortal() { return <SifoIndustryWorkspace kind="school" screen="/school/students" />; }
