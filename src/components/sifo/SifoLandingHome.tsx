import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Building2, BriefcaseBusiness, CheckCircle2, ChefHat, CircleDollarSign,
  ClipboardCheck, FileText, GraduationCap, Hotel, Landmark, Menu, Package, PlayCircle, ReceiptText,
  Search, ShieldCheck, ShoppingCart, Smartphone, Users, Utensils, WalletCards, Wifi, Zap
} from "lucide-react";

const modules = [
  ["Accounting", "General Ledger, Reports & Financials", CircleDollarSign],
  ["POS", "Retail & Supermarket Point of Sale", ShoppingCart],
  ["Restaurant", "Table Orders, Kitchen Display", Utensils],
  ["Payroll", "Employees, PAYE, NAPSA, NHIMA", Users],
  ["ZRA Compliance", "Smart Invoice, VAT & Returns", ReceiptText],
  ["Inventory", "Stock Control, Warehouses", Package],
  ["Consultants", "Multi-Company, Client Management", Building2],
  ["All-in-One", "One subscription, multiple businesses", Zap],
] as const;

const industries = [
  ["Retail & POS", "Shops & Supermarkets", ShoppingCart, "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85"],
  ["Restaurant", "Cafés & Bars", Utensils, "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85"],
  ["Hotel", "Accommodation", Hotel, "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85"],
  ["School", "Education Institutions", GraduationCap, "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=85"],
  ["Property", "Rentals & Estates", Building2, "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85"],
  ["Microfinance", "SACCOs & Lending", WalletCards, "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85"],
  ["Manufacturing", "Production & Inventory", Package, "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&w=900&q=85"],
  ["Services", "Agencies & NGOs", BriefcaseBusiness, "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=85"],
] as const;

export function SifoLandingHome() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <style>{`
        @keyframes sifoFadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sifoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes sifoGlow { 0%,100% { opacity: .45; transform: scale(1); } 50% { opacity: .8; transform: scale(1.08); } }
        @keyframes sifoShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
        @keyframes sifoPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,.15); } 50% { box-shadow: 0 0 0 12px rgba(52,211,153,0); } }
        .sifo-reveal { animation: sifoFadeUp .7s cubic-bezier(.22,1,.36,1) both; }
        .sifo-float { animation: sifoFloat 5s ease-in-out infinite; }
        .sifo-glow { animation: sifoGlow 4s ease-in-out infinite; }
        .sifo-pulse { animation: sifoPulse 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sifo-reveal, .sifo-float, .sifo-glow, .sifo-pulse { animation: none !important; }
        }
      `}</style>
      <Header />
      <Hero />
      <ModuleGrid />
      <IndustryGrid />
      <Compliance />
      <Screens />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Header() {
  const nav = ["Home", "Features", "Industries", "Compliance", "Pricing", "Resources", "Support"];
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061f1a]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1450px] items-center gap-5 px-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/30 bg-gradient-to-br from-emerald-400 to-emerald-800 text-white shadow-lg shadow-emerald-950/40 sifo-pulse">
            <span className="text-xl font-black italic">S</span>
          </div>
          <div className="leading-none">
            <div className="text-[21px] font-extrabold tracking-tight">Sifo<span className="text-emerald-300">Books</span></div>
            <div className="mt-1 hidden text-[8px] font-bold uppercase tracking-[.2em] text-emerald-100/50 sm:block">Accounting · POS · ERP</div>
          </div>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((n, i) => <a key={n} href={i ? `#${n.toLowerCase()}` : "#"} className={`rounded-lg px-3 py-2 text-[13px] font-semibold ${i === 0 ? "text-emerald-300" : "text-emerald-50/70 hover:bg-white/5 hover:text-white"}`}>{n}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" search={{ tab: "signin" }} className="hidden rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 sm:inline-flex">Sign in</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 hover:from-emerald-300 hover:to-emerald-500">Start free</Link>
          <button aria-label="Open navigation" className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/10 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#061f1a] text-white">
      <div className="absolute inset-0 opacity-80 bg-[linear-gradient(rgba(108,174,154,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(108,174,154,.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(22,163,74,.28),transparent_32%),radial-gradient(circle_at_10%_80%,rgba(234,179,8,.10),transparent_30%)]" /><div className="sifo-glow absolute -right-20 top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1450px] items-center gap-10 px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20 lg:min-h-[690px] lg:grid-cols-[.9fr_1.1fr] lg:py-20">
        <div className="relative z-10 max-w-[680px] sifo-reveal">
          <div className="mb-7 inline-flex items-center rounded-full border border-amber-300/25 bg-amber-400/10 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-amber-300">
            🇿🇲 Built in Zambia for Zambian business
          </div>
          <h1 className="max-w-[720px] text-[50px] font-black leading-[.93] tracking-[-.055em] sm:text-6xl lg:text-[72px]">
            One platform.<br />
            <span className="text-emerald-300">Every operation.</span><br />
            Fully accounted<br className="sm:hidden" /> for.
          </h1>
          <p className="mt-7 max-w-[650px] text-[18px] leading-8 text-emerald-50/65 sm:text-xl">
            SifoBooks runs the till, the stores, the payroll and the ledger on one record — so the figure a manager sees on the floor is the same figure the accountant files with ZRA.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-7 text-base font-extrabold text-white shadow-xl shadow-emerald-950/40">
              Start free <ArrowRight className="h-5 w-5" />
            </Link>
            <a href="#features" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/[.02] px-7 text-base font-bold text-white hover:bg-white/5">
              <span className="text-xl">◈</span> Explore platform
            </a>
            <a href="#screens" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-7 text-base font-extrabold text-slate-950 shadow-xl shadow-amber-950/30">
              <span className="text-lg">▷</span> See demo
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-4">
            <HeroStat value="Multi-company" label="One login, multiple businesses" />
            <HeroStat value="Branches" label="Centralised branch operations" />
            <HeroStat value="POS + ERP" label="Sales connected to accounts" />
            <HeroStat value="Zambia" label="Built around local compliance" />
          </div>
        </div>
        <HeroDashboard />
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-base font-extrabold text-white sm:text-lg">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-emerald-100/45 sm:text-[11px]">{label}</div>
    </div>
  );
}

function HeroDashboard() {
  const kpis = [["Sales", "ZMW 125,430", "+12%"], ["Stock", "ZMW 84,200", "Healthy"], ["Payroll", "ZMW 46,890", "Processed"], ["ZRA", "Synced", "Ready"]];
  return (
    <div className="relative hidden min-h-[520px] lg:block">
      <div className="sifo-float absolute right-[-6%] top-[3%] w-[108%] rotate-[-2deg] rounded-[30px] border border-white/20 bg-white p-2 shadow-[0_40px_110px_rgba(0,0,0,.5)]">
        <div className="overflow-hidden rounded-[22px] bg-slate-50">
          <div className="flex h-11 items-center border-b bg-white px-4"><div className="text-[9px] font-bold text-slate-500">SifoBooks · Business Control Centre</div><div className="ml-auto flex gap-1.5"><span className="h-2 w-2 rounded-full bg-red-300"/><span className="h-2 w-2 rounded-full bg-amber-300"/><span className="h-2 w-2 rounded-full bg-emerald-500"/></div></div>
          <div className="grid grid-cols-[122px_1fr]">
            <div className="bg-[#003b32] p-3"><div className="mb-6 text-xs font-black text-white">SifoBooks</div>{["Dashboard","Sales & POS","Purchases","Inventory","Accounting","Payroll","ZRA","NAPSA","NHIMA","Reports"].map((x,i)=><div key={x} className={`mb-1 rounded-md px-2 py-1.5 text-[7px] font-semibold ${i===0?"bg-emerald-400/20 text-white":"text-emerald-100/60"}`}>{x}</div>)}</div>
            <div className="p-4">
              <div className="mb-4 flex items-end justify-between"><div><div className="text-[8px] text-slate-400">SifoBooks Business</div><div className="text-base font-black text-slate-900">Operations Overview</div></div><div className="rounded-md border bg-white px-2 py-1 text-[8px]">September 2026</div></div>
              <div className="grid grid-cols-4 gap-2">{kpis.map(k=><div key={k[0]} className="rounded-xl border bg-white p-2.5 shadow-sm"><div className="text-[7px] text-slate-400">{k[0]}</div><div className="mt-1 text-[11px] font-black text-slate-900">{k[1]}</div><div className="mt-1 text-[7px] font-bold text-emerald-600">{k[2]}</div></div>)}</div>
              <div className="mt-3 grid grid-cols-[1.4fr_.6fr] gap-3">
                <div className="rounded-xl border bg-white p-3"><div className="mb-2 text-[8px] font-bold text-slate-800">Money in vs money out</div><div className="flex h-32 items-end gap-1.5">{[38,52,44,62,57,74,68,86,94].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-600/80" style={{height:`${h}%`}} />)}</div><div className="mt-2 flex justify-between text-[6px] text-slate-400">Jan Feb Mar Apr May Jun Jul Aug Sep</div></div>
                <div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-bold text-slate-800">Connected operations</div><div className="mt-4 space-y-2">{["POS → Sales","Stock → COGS","Payroll → Ledger","Invoice → ZRA"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-[7px] font-bold text-slate-600">{x}<span className="float-right text-emerald-600">✓</span></div>)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[-1%] left-[1%] z-20 w-[180px] rounded-[25px] border-4 border-white bg-[#063f35] p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between text-[8px] font-bold text-white"><span>SifoBooks Mobile</span><Smartphone className="h-3 w-3"/></div>
        <div className="rounded-xl bg-white p-3 text-slate-900"><div className="text-[7px] text-slate-400">Today's Sales</div><div className="mt-1 text-lg font-black">ZMW 12,450</div><div className="mt-1 text-[7px] font-bold text-emerald-600">+18%</div><div className="mt-3 grid grid-cols-2 gap-1.5">{["POS","Invoice","Payroll","Reports"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-center text-[7px] font-bold">{x}</div>)}</div></div>
      </div>
    </div>
  );
}

function ModuleGrid() {
  return (
    <section id="features" className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-[1450px] px-5 sm:px-8">
        <div className="mb-7 flex items-end justify-between sifo-reveal">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-emerald-700">One connected platform</div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Complete Solution for Every Business Need</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">All the tools you need in one powerful system — designed for Zambian businesses, consultants and organisations.</p>
          </div>
          <a href="#screens" className="hidden items-center gap-2 text-sm font-bold text-emerald-700 transition hover:gap-3 sm:flex">Explore all modules <ArrowRight className="h-4 w-4"/></a>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {modules.map(([name, sub, Icon], index) => (
            <div
              key={name}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_8px_30px_rgba(15,23,42,.055)] transition duration-500 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-[0_18px_45px_rgba(4,120,87,.13)] sifo-reveal"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="absolute inset-x-8 -top-12 h-20 rounded-full bg-emerald-100/60 blur-2xl opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition duration-500 group-hover:scale-110 group-hover:bg-emerald-700 group-hover:text-white group-hover:rotate-3">
                <Icon className="h-5 w-5"/>
              </div>
              <div className="relative mt-4 text-[13px] font-extrabold">{name}</div>
              <div className="relative mt-1.5 min-h-8 text-[9px] leading-4 text-slate-500">{sub}</div>
              <div className="mx-auto mt-3 h-0.5 w-0 rounded-full bg-amber-400 transition-all duration-500 group-hover:w-8" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IndustryGrid() {
  return (
    <section id="industries" className="bg-slate-50 py-14 sm:py-16">
      <div className="mx-auto max-w-[1450px] px-5 sm:px-8">
        <div className="mb-7 flex items-end justify-between sifo-reveal">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Specialised workspaces</div>
            <h2 className="text-3xl font-black tracking-tight">Solutions for Every Industry</h2>
            <p className="mt-1 text-sm text-slate-500">One connected platform with specialised workspaces.</p>
          </div>
          <span className="hidden items-center gap-2 text-sm font-bold text-emerald-700 sm:flex">Built for real businesses in Zambia <ArrowRight className="h-4 w-4"/></span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {industries.map(([name, sub, Icon, image], index) => (
            <div
              key={name}
              className="group relative min-h-[150px] overflow-hidden rounded-2xl border border-emerald-900/10 bg-emerald-950 text-white shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_rgba(0,59,50,.28)] sifo-reveal"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-110 group-hover:opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003b32] via-[#003b32]/70 to-emerald-900/20" />
              <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-emerald-300/15 blur-sm transition duration-500 group-hover:scale-125" />
              <div className="relative flex h-full min-h-[150px] flex-col justify-between p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/30 bg-[#003b32]/60 text-amber-300 backdrop-blur-sm transition duration-500 group-hover:scale-110 group-hover:bg-amber-300 group-hover:text-emerald-950">
                  <Icon className="h-5 w-5"/>
                </div>
                <div>
                  <div className="text-xs font-extrabold">{name}</div>
                  <div className="mt-1 text-[9px] text-emerald-50/80">{sub}</div>
                  <div className="mt-2 grid h-6 w-6 place-items-center rounded-full border border-white/40 text-white opacity-0 transition duration-500 group-hover:opacity-100">
                    <ArrowRight className="h-3 w-3"/>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Compliance() {
  const items = ["ZRA Smart Invoice & VAT Returns", "PAYE Calculations & Submissions", "NAPSA Contributions", "NHIMA Contributions", "Employee Tax Certificates (TP10)", "Compliance Reports & Audit Trail"];
  return <section id="compliance" className="bg-white py-14 sm:py-20"><div className="mx-auto grid max-w-[1450px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr]"><div className="sifo-reveal"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Stay compliant in Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Compliance without the paperwork maze.</h2><p className="mt-4 max-w-xl text-base leading-7 text-slate-600">Keep statutory workflows visible in the same system as accounting, payroll and sales.</p><ul className="mt-6 space-y-3">{items.map(x=><li key={x} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600"/>{x}</li>)}</ul></div><ComplianceMockup/></div></section>;
}

function ComplianceMockup() {
  return <div className="relative rounded-[30px] border border-slate-200 bg-slate-50 p-4 shadow-[0_25px_80px_rgba(15,23,42,.12)] sifo-reveal"><div className="absolute -top-5 right-6 rounded-xl bg-emerald-700 sifo-pulse px-4 py-2 text-xs font-extrabold text-white shadow-lg">✓ ZRA Smart Invoice Ready</div><div className="grid gap-3 md:grid-cols-[1fr_220px]"><div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between border-b pb-3"><div className="text-sm font-black">Sales Invoice</div><div className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[9px] font-bold text-white">Submit to ZRA</div></div><div className="mt-4 grid grid-cols-2 gap-3 text-[9px]"><span>Customer<br/><b>ABC Supplies Ltd</b></span><span>Invoice Date<br/><b>25 Sep 2026</b></span><span>Invoice No.<br/><b>INV-00045</b></span><span>Branch<br/><b>Ndola</b></span></div><div className="mt-4 overflow-hidden rounded-lg border"><div className="grid grid-cols-4 bg-slate-50 p-2 text-[8px] font-bold"><span>Item</span><span>Qty</span><span>VAT</span><span>Total</span></div>{["Maize Meal","Cooking Oil","Sugar"].map((x,i)=><div key={x} className="grid grid-cols-4 border-t p-2 text-[8px]"><span>{x}</span><span>{[12,5,8][i]}</span><span>16%</span><b>{["1,392","1,450","1,670"][i]}</b></div>)}</div><div className="mt-3 text-right text-sm font-black">ZMW 4,524.00</div></div><div className="rounded-2xl border bg-white p-5"><div className="text-[9px] font-black">ZRA SMART INVOICE</div><div className="mt-4 grid h-36 place-items-center rounded-lg border-2 border-dashed text-xs font-black text-slate-400">QR CODE</div><div className="mt-3 text-[8px] text-slate-500">Fiscal reference and receipt data appear here after a successful ZRA response.</div></div></div><div className="mt-4 grid grid-cols-3 gap-3">{[["ZRA","Smart Invoice"],["NAPSA","Contributions"],["NHIMA","Contributions"]].map(x=><div key={x[0]} className="rounded-xl border bg-white p-3 text-center"><div className="text-lg font-black text-emerald-800">{x[0]}</div><div className="text-[8px] text-slate-500">{x[1]}</div></div>)}</div></div>;
}

function Screens() {
  return <section id="screens" className="bg-slate-50 py-14 sm:py-20"><div className="mx-auto max-w-[1450px] px-5 sm:px-8"><div className="mb-7 sifo-reveal"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">See SifoBooks in action</div><h2 className="mt-2 text-4xl font-black tracking-tight">Modern screens for real business operations.</h2><p className="mt-2 text-sm text-slate-500">Clean workflows for cashiers, restaurant teams, payroll officers and accountants.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><PosScreen/><RestaurantScreen/><PayrollScreen/><ReportsScreen/></div></div></section>;
}

function ScreenFrame({ children, title, sub }: any) {
  return <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,.09)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(15,23,42,.14)] sifo-reveal"><div className="flex items-center gap-2 border-b bg-white px-3 py-2"><span className="h-2 w-2 rounded-full bg-red-300"/><span className="h-2 w-2 rounded-full bg-amber-300"/><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="ml-auto text-[8px] font-bold text-slate-400">{title}</span></div><div className="min-h-[215px] bg-slate-50 p-3">{children}</div><div className="border-t bg-white p-3"><div className="text-sm font-black">{title}</div><div className="mt-1 text-[10px] text-slate-500">{sub}</div></div></div>;
}

function PosScreen() {
  return <ScreenFrame title="POS Screen" sub="Fast, simple and reliable"><div className="grid h-[175px] grid-cols-[.7fr_1.3fr] gap-2"><div className="rounded-lg bg-[#003b32] p-2 text-white">{["Dashboard","Products","Customers","Sales","Reports"].map(x=><div key={x} className="mb-1 rounded bg-white/10 px-2 py-1 text-[7px]">{x}</div>)}</div><div className="rounded-lg border bg-white p-2"><div className="grid grid-cols-3 gap-1">{["Burger","Chips","Coke","Water","Chicken","Coffee"].map(x=><div key={x} className="rounded border p-2 text-center text-[7px] font-bold">{x}</div>)}</div><div className="mt-2 rounded bg-emerald-50 p-2 text-[8px] font-bold">Cart · ZMW 140.00</div><div className="mt-2 rounded bg-emerald-700 p-2 text-center text-[8px] font-bold text-white">Complete Sale</div></div></div></ScreenFrame>;
}

function RestaurantScreen() {
  return <ScreenFrame title="Restaurant Screen" sub="Table orders & kitchen display"><div className="grid h-[175px] grid-cols-[.7fr_1.3fr] gap-2"><div className="grid grid-cols-3 gap-1">{["T1","T2","T3","T4","T5","T6","T7","T8","T9"].map(x=><div key={x} className="grid place-items-center rounded-lg border bg-white text-[8px] font-black text-emerald-800">{x}</div>)}</div><div className="rounded-lg border bg-white p-2"><div className="text-[8px] font-black">Kitchen Display</div>{["2× Chicken Burger","1× Chips","2× Coffee"].map((x,i)=><div key={x} className={`mt-1 rounded p-2 text-[7px] font-bold ${i===0?"bg-amber-100":"bg-emerald-50"}`}>{x}<span className="float-right">{i===0?"Preparing":"New"}</span></div>)}</div></div></ScreenFrame>;
}

function PayrollScreen() {
  return <ScreenFrame title="Payroll Screen" sub="Employees, PAYE, NAPSA, NHIMA"><div className="rounded-lg border bg-white"><div className="grid grid-cols-5 bg-slate-50 p-2 text-[7px] font-bold"><span>Employee</span><span>PAYE</span><span>NAPSA</span><span>NHIMA</span><span>Net Pay</span></div>{["Chanda M.","Mulenga B.","Kasonde A.","Tembo R."].map((x,i)=><div key={x} className="grid grid-cols-5 border-t p-2 text-[7px]"><span className="font-bold">{x}</span><span>{[650,1200,520,980][i]}</span><span>{[500,700,450,600][i]}</span><span>{[450,630,405,540][i]}</span><span className="font-bold">{[3400,4470,3125,3880][i]}</span></div>)}</div><div className="mt-2 flex gap-1"><span className="rounded bg-emerald-700 px-2 py-1 text-[7px] font-bold text-white">Process Payroll</span><span className="rounded border px-2 py-1 text-[7px] font-bold">Generate Returns</span></div></ScreenFrame>;
}

function ReportsScreen() {
  return <ScreenFrame title="Accounting Reports" sub="Real-time financial insights"><div className="rounded-lg border bg-white p-3"><div className="flex items-center justify-between text-[8px] font-black"><span>Profit & Loss</span><span className="text-slate-400">This Year</span></div><div className="mt-4 flex h-28 items-end gap-2">{[30,42,35,55,50,68,62,78,92].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-600" style={{height:`${h}%`}}/>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded bg-slate-50 p-2"><div className="text-[7px] text-slate-400">Total Income</div><b className="text-[10px]">ZMW 425,600</b></div><div className="rounded bg-slate-50 p-2"><div className="text-[7px] text-slate-400">Net Profit</div><b className="text-[10px] text-emerald-700">ZMW 98,450</b></div></div></div></ScreenFrame>;
}

function FinalCta() {
  return <section className="relative overflow-hidden bg-[#003b32] py-16 text-white sm:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_100%,rgba(22,163,74,.35),transparent_35%)]"/><div className="relative mx-auto grid max-w-[1400px] sifo-reveal gap-8 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-emerald-300/20 bg-emerald-950/45 p-7"><div className="text-amber-300">★★★★★</div><p className="mt-4 text-lg font-semibold leading-7">“SifoBooks brings our sales, stock, payroll and accounts together in one place.”</p><div className="mt-5 text-xs text-emerald-100/70">SifoBooks customer · Zambia</div></div><div className="flex flex-col justify-center"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-amber-300">Built for Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Everything your business needs. One connected system.</h2><p className="mt-4 max-w-xl text-emerald-50/80">Start with accounting, POS, payroll or inventory and add the modules your business needs as you grow.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/auth" search={{tab:"signup"}} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950">Start Free Trial <ArrowRight className="h-4 w-4"/></Link><a href="mailto:sales@sifobooks.com" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3.5 text-sm font-bold">Contact Sales</a></div></div></div></section>;
}

function Footer() {
  return <footer className="bg-[#002c26] py-10 text-white"><div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between"><div><div className="text-xl font-black">SifoBooks</div><div className="mt-1 text-xs text-emerald-100/60">Accounting · POS · ERP · Zambia</div></div><div className="flex flex-wrap gap-5 text-xs font-semibold text-emerald-100/70"><a href="#features">Features</a><a href="#industries">Industries</a><a href="#compliance">Compliance</a><a href="#screens">Screens</a><Link to="/auth">Sign in</Link></div><div className="text-xs text-emerald-100/50">© {new Date().getFullYear()} SifoBooks</div></div></footer>;
}
