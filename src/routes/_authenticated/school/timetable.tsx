import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/timetable")({ component: SchoolTimetable });
function SchoolTimetable() { return <SifoIndustryWorkspace kind="school" screen="/school/academics" />; }
