import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorIntegrationHub } from "@/components/sifo/SifoSectorIntegrationHub";
export const Route = createFileRoute("/_authenticated/hotel/reports")({ component: HotelReports });
function HotelReports() { return <><SifoSectorIntegrationHub kind="hotel" /><section className="mx-auto max-w-7xl px-6 pb-10"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Hotel Reports</h2><p className="mt-1 text-sm text-slate-500">Use the canonical Reports Centre for occupancy, revenue, receivables, POS, inventory, purchasing and accounting reports. Hotel-specific reporting can be added there without creating a second reporting engine.</p></div></section></>; }
