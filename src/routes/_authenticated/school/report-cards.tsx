import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/report-cards")({ component: SchoolReportCards });
function SchoolReportCards() { return <SifoIndustryWorkspace kind="school" screen="/school/exams" />; }
