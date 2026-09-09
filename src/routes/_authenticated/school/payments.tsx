import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorWorkflow } from "@/components/sifo/SifoSectorWorkflow";
export const Route = createFileRoute("/_authenticated/school/payments")({ component: SchoolPayments });
function SchoolPayments() { return <SifoSectorWorkflow kind="school" screen="/school/payments" />; }
