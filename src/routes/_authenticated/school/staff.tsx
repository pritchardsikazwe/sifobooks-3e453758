import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/staff")({ component: SchoolStaff });
function SchoolStaff() { return <SifoIndustryWorkspace kind="school" screen="/school/academics" />; }
