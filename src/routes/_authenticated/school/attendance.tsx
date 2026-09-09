import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryWorkspace } from "@/components/sifo/SifoIndustryWorkspace";
export const Route = createFileRoute("/_authenticated/school/attendance")({ component: () => <SifoIndustryWorkspace kind="school" screen="/school/attendance" /> });
