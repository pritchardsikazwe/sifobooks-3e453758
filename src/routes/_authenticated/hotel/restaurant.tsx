import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorIntegrationHub } from "@/components/sifo/SifoSectorIntegrationHub";
export const Route = createFileRoute("/_authenticated/hotel/restaurant")({ component: HotelRestaurant });
function HotelRestaurant() { return <><SifoSectorIntegrationHub kind="hotel" /><section className="mx-auto max-w-7xl px-6 pb-10"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Restaurant & Bar</h2><p className="mt-1 text-sm text-slate-500">Use the existing restaurant/POS workflow for tables, orders, payments, kitchen flow and stock deduction. Hotel folios can receive approved guest charges through the existing posting boundary.</p></div></section></>; }
