import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/parents")({ component: SchoolParents });
function SchoolParents() { return <SifoIndustryWorkspace kind="school" screen="/school/students" />; }
