import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ClipboardList, Package, ReceiptText, UtensilsCrossed } from "lucide-react";

type Kind = "hotel" | "school";

const integrations = {
  hotel: [
    { title: "Hotel POS", description: "Use the existing SifoPOS sales engine for restaurant, bar and guest charges.", icon: UtensilsCrossed, to: "/pos" },
    { title: "Inventory & Purchasing", description: "Reuse stock, transfers, purchasing and valuation instead of creating a second inventory ledger.", icon: Package, to: "/inventory" },
    { title: "Hotel Accounting", description: "Route folio, POS and payment postings through the existing accounting and reporting layer.", icon: BookOpen, to: "/accounting" },
    { title: "Hotel Reports", description: "Open the canonical Reports Centre for financial and operational reporting.", icon: ReceiptText, to: "/reports" },
  ],
  school: [
    { title: "School Finance", description: "Route fees, receipts, discounts and balances through the existing accounting engine.", icon: BookOpen, to: "/accounting" },
    { title: "School Inventory", description: "Reuse the existing inventory engine for stores, textbooks, uniforms and supplies.", icon: Package, to: "/inventory" },
    { title: "School Reports", description: "Use the canonical Reports Centre for financial and management reporting.", icon: ReceiptText, to: "/reports" },
    { title: "Compliance & Audit", description: "Keep operational approvals and financial postings traceable through the existing audit controls.", icon: ClipboardList, to: "/compliance" },
  ],
};

export function SifoSectorIntegrationHub({ kind }: { kind: Kind }) {
  const hotel = kind === "hotel";
  const items = integrations[kind];
  return <section className="mx-auto max-w-7xl px-6 py-8">
    <div className="mb-5"><div className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Connected core</div><h2 className="mt-1 text-xl font-bold">{hotel ? "Hotel operations connected to SifoBooks core" : "School operations connected to SifoBooks core"}</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Operational modules stay specialised, while finance, inventory, POS and reporting remain on the existing SifoBooks engines.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{items.map(item => { const Icon = item.icon; return <Link key={item.title} to={item.to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="rounded-xl bg-slate-100 p-2 text-emerald-700"><Icon size={20}/></span><ArrowRight size={17} className="text-slate-300 transition-transform group-hover:translate-x-1"/></div><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p></Link>; })}</div>
  </section>;
}
