import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorIntegrationHub } from "@/components/sifo/SifoSectorIntegrationHub";
export const Route = createFileRoute("/_authenticated/hotel/inventory")({ component: HotelInventory });
function HotelInventory() { return <><SifoSectorIntegrationHub kind="hotel" /><section className="mx-auto max-w-7xl px-6 pb-10"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Hotel Inventory & Purchasing</h2><p className="mt-1 text-sm text-slate-500">Reuse SifoBooks inventory, locations, transfers, stock counts, purchasing and valuation. Restaurant, bar and housekeeping consumption should post through the existing stock movement controls.</p></div></section></>; }
