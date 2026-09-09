import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorIntegrationHub } from "@/components/sifo/SifoSectorIntegrationHub";
export const Route = createFileRoute("/_authenticated/hotel/pos")({ component: HotelPos });
function HotelPos() { return <><SifoSectorIntegrationHub kind="hotel" /><section className="mx-auto max-w-7xl px-6 pb-10"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold">Existing SifoPOS is the posting engine</h2><p className="mt-1 text-sm text-slate-600">Hotel restaurant and bar sales should continue through the existing POS sale, receipt, reversal and inventory posting controls.</p></div></section></>; }
