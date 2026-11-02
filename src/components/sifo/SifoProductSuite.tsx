import { ArrowUpRight, BarChart3, Beef, Building2, GraduationCap, Hotel, Landmark, Utensils, type LucideIcon } from "lucide-react";

type Product = {
  name: string;
  category: string;
  description: string;
  url: string;
  status: "Current workspace" | "Live product" | "In development" | "Planned";
  icon: LucideIcon;
  tone: string;
};

const PRODUCTS: Product[] = [
  {
    name: "SifoBooks Accounting",
    category: "Accounting & Finance",
    description: "General ledger, sales, purchases, inventory, banking, payroll, reports and Zambia tax compliance.",
    url: "/dashboard",
    status: "Current workspace",
    icon: BarChart3,
    tone: "from-emerald-600 to-emerald-800",
  },
  {
    name: "SifoHotel",
    category: "Hotel PMS",
    description: "Reservations, rooms, front desk, guest folios, housekeeping, hotel POS and night audit.",
    url: "https://hotel.sifobooks.com",
    status: "Live product",
    icon: Hotel,
    tone: "from-amber-500 to-amber-700",
  },
  {
    name: "SifoProperty",
    category: "Property Management",
    description: "Properties, units, tenants, leases, rent collection, maintenance and owner statements.",
    url: "https://property.sifobooks.com",
    status: "In development",
    icon: Building2,
    tone: "from-teal-600 to-teal-800",
  },
  {
    name: "SifoRestaurant",
    category: "Restaurant POS",
    description: "Tables, orders, kitchen display, menus, recipes, stock, purchasing and restaurant reporting.",
    url: "https://restaurant.sifobooks.com",
    status: "Planned",
    icon: Utensils,
    tone: "from-rose-600 to-rose-800",
  },
  {
    name: "SifoBoarding",
    category: "School & Boarding",
    description: "Student records, rooms and beds, admissions, fees, attendance and parent communication.",
    url: "https://boarding.sifobooks.com",
    status: "Planned",
    icon: GraduationCap,
    tone: "from-violet-600 to-violet-800",
  },
  {
    name: "SifoButchery",
    category: "Butchery & Meat POS",
    description: "Meat receiving, carcass processing, yield control, cuts, weighing, labels and retail sales.",
    url: "https://butchery.sifobooks.com",
    status: "Planned",
    icon: Beef,
    tone: "from-orange-600 to-orange-800",
  },
  {
    name: "SifoLending",
    category: "Loans & Finance",
    description: "Loan applications, affordability, approvals, disbursements, repayments and portfolio control.",
    url: "https://lending.sifobooks.com",
    status: "Planned",
    icon: Landmark,
    tone: "from-blue-600 to-blue-800",
  },
];

const statusStyle: Record<Product["status"], string> = {
  "Current workspace": "bg-emerald-100 text-emerald-800",
  "Live product": "bg-emerald-100 text-emerald-800",
  "In development": "bg-amber-100 text-amber-800",
  Planned: "bg-slate-100 text-slate-600",
};

export function SifoProductSuite() {
  return (
    <section aria-labelledby="sifo-suite-title" className="overflow-hidden rounded-[22px] border border-[#D7E8DF] bg-gradient-to-br from-[#F4FBF7] via-white to-[#F1F7F5] p-4 shadow-[0_8px_30px_rgba(20,55,45,.06)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#0A8A53]">Sifonet business ecosystem</p>
          <h2 id="sifo-suite-title" className="mt-1 text-xl font-bold tracking-tight text-[#123B30] sm:text-2xl">One ecosystem. Independent applications.</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#60766D] sm:text-sm">Each Sifo product is designed to have its own application build, repository, database, deployment and release cycle.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#D7E8DF] bg-white px-3 py-2 text-[10px] font-bold text-[#31594A] sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Independent product architecture
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PRODUCTS.map(product => <ProductCard key={product.name} product={product} />)}
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-[#DCE9E5] bg-white/80 p-3 text-[11px] text-[#526B61] sm:grid-cols-3">
        <div><strong className="block text-[#173B3A]">Separate builds</strong>Independent codebases and versioning</div>
        <div><strong className="block text-[#173B3A]">Separate data</strong>Dedicated database and backups per app</div>
        <div><strong className="block text-[#173B3A]">Shared foundations</strong>Consistent identity, security and Zambia compliance patterns</div>
      </div>
    </section>
  );
}
