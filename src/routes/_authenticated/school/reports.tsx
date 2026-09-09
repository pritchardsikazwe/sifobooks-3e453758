import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorIntegrationHub } from "@/components/sifo/SifoSectorIntegrationHub";
export const Route = createFileRoute("/_authenticated/school/reports")({ component: SchoolReports });
function SchoolReports() { return <><SifoSectorIntegrationHub kind="school" /><section className="mx-auto max-w-7xl px-6 pb-10"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">School Reports</h2><p className="mt-1 text-sm text-slate-500">Use the canonical Reports Centre for fee collections, learner balances, attendance, examinations, payroll, inventory and accounting reports.</p></div></section></>; }
