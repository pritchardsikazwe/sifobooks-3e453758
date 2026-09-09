import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/student-portal")({ component: SchoolStudentPortal });
function SchoolStudentPortal() { return <SifoIndustryWorkspace kind="school" screen="/school/students" />; }
