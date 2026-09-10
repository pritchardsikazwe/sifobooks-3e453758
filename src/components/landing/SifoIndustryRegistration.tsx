import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ChefHat, GraduationCap, Mountain } from "lucide-react";
import { SectionHead } from "@/components/landing/SifoBrand";
import { AppWindow, HotelScreen, MiningScreen, RestaurantScreen, SchoolScreen } from "@/components/landing/ProductScreens";

type Industry = {
  key: "hotel" | "restaurant" | "school" | "mining";
  product: string;
  icon: typeof Building2;
  accent: string;
  tagline: string;
  points: string[];
  screen: () => React.ReactNode;
  crumb: string;
  demo?: "hotel" | "restaurant" | "school";
  route: string;
};

const INDUSTRIES: Industry[] = [
  {
    key: "hotel", product: "SifoHotel", icon: Building2, accent: "#5AA9E6", crumb: "/hotel/room-rack", demo: "hotel", route: "/hotel",
    tagline: "Lodges, guesthouses and hotels — front desk through to the night audit.",
    points: ["Room rack, reservations and availability", "Folios with room, bar and restaurant charges", "Housekeeping board and maintenance", "Occupancy, ADR and RevPAR at day close"],
    screen: () => <HotelScreen />,
  },
  {
    key: "restaurant", product: "SifoRestaurant", icon: ChefHat, accent: "#C87A3C", crumb: "/restaurant/tables", demo: "restaurant", route: "/restaurant",
    tagline: "Restaurants, bars and takeaways — floor, kitchen and cash in one flow.",
    points: ["Visual floor plan and table states", "Kitchen display with station routing", "Split, merge and transfer bills", "Recipe costing, wastage and food cost %"],
    screen: () => <RestaurantScreen />,
  },
  {
    key: "school", product: "SifoSchool", icon: GraduationCap, accent: "#12A557", crumb: "/school/fees", demo: "school", route: "/school",
    tagline: "Schools and colleges — learners, fees and the books on one ledger.",
    points: ["Learner and class records", "Fee structures, invoicing and receipts", "Arrears follow-up and statements", "Staff payroll and school accounts"],
    screen: () => <SchoolScreen />,
  },
  {
    key: "mining", product: "SifoMining", icon: Mountain, accent: "#C87A3C", crumb: "/assets/job-cards", route: "/assets",
    tagline: "Mining, quarry and plant operations — assets, stores and cost per tonne.",
    points: ["Job cards against plant and equipment", "Fuel, spares and consumables from stores", "Fixed assets with depreciation posting", "Cost-centre reporting to unit cost"],
    screen: () => <MiningScreen />,
  },
];

/**
 * Industry family section. Each entry is a real SifoBooks workspace; demo links
 * open the isolated sample-data demos, and "Start free" goes to normal signup.
 */
export function SifoIndustryRegistration() {
  return (
    <section id="industries" className="relative border-t border-sifo-line/60 bg-sifo-ink py-16 sifo-edge md:py-24">
      <div className="pointer-events-none absolute inset-0 sifo-blueprint opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHead
          eyebrow="The SifoBooks family"
          title="Industry workspaces on the same accounting core"
          lede="Not separate systems. Each one adds the operational screens a sector needs, then posts into the same ledger, stock and payroll."
        />

        <div className="mt-10 space-y-5">
          {INDUSTRIES.map((ind, i) => (
            <article
              key={ind.key}
              className="grid gap-6 overflow-hidden rounded-2xl border border-sifo-line/70 bg-sifo-ink-2 p-5 md:p-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center"
              style={{ boxShadow: `inset 3px 0 0 ${ind.accent}` }}
            >
              <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: `${ind.accent}1a`, color: ind.accent }}>
                  <ind.icon className="h-3.5 w-3.5" /> {ind.product}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold leading-snug tracking-[-0.02em] text-white md:text-2xl">{ind.tagline}</h3>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ind.points.map((p) => (
                    <li key={p} className="flex gap-2 text-[13px] font-medium leading-6 text-sifo-haze">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ind.accent }} /> {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link to="/auth" search={{ tab: "signup" }} className="sifo-btn sifo-btn-primary">
                    Start free <ArrowRight className="h-4 w-4" />
                  </Link>
                  {ind.demo ? (
                    <Link to="/demo/$industry" params={{ industry: ind.demo }} className="sifo-btn sifo-btn-ghost">
                      Open {ind.product} demo
                    </Link>
                  ) : (
                    <a href="#contact" className="sifo-btn sifo-btn-ghost">Talk to us about mining</a>
                  )}
                </div>
              </div>
              <div className={i % 2 === 1 ? "lg:order-1" : undefined}>
                <AppWindow title={`${ind.product} preview`} crumb={ind.crumb} accent={ind.accent} compact>
                  {ind.screen()}
                </AppWindow>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-sifo-copper/25 bg-sifo-copper/6 p-5 text-[12.5px] leading-6 text-sifo-haze">
          <span className="font-bold text-sifo-copper">Demos use sample data only.</span> They open without a login, are
          read-only, and are completely separate from live company accounts. No customer data appears on this page.
        </div>
      </div>
    </section>
  );
}
