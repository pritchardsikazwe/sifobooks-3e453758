import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorConnectedWorkspace } from "@/components/sifo/SifoSectorConnectedWorkspace";
export const Route = createFileRoute("/_authenticated/school/exams")({ component: () => <SifoSectorConnectedWorkspace kind="school" screen="/school/exams" /> });
