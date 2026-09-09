import { createFileRoute } from "@tanstack/react-router";
import { SifoSectorIntegrationHub } from "@/components/sifo/SifoSectorIntegrationHub";
export const Route = createFileRoute("/_authenticated/hotel/accounting")({ component: HotelAccounting });
function HotelAccounting() { return <><SifoSectorIntegrationHub kind="hotel" /><section className="mx-auto max-w-7xl px-6 pb-10"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Hotel Accounting</h2><p className="mt-1 text-sm text-slate-500">Room charges, folio payments, POS settlements, events and purchasing must feed the existing SifoBooks accounting ledger with normal approval, reversal and audit controls.</p></div></section></>; }
