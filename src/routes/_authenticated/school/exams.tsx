import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/exams")({ component: SchoolExams });
function SchoolExams() { return <SifoIndustryWorkspace kind="school" screen="/school/exams" />; }
