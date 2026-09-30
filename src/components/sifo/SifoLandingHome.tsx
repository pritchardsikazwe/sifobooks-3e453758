import { useEffect, useState, type ReactNode } from "react";
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
        @keyframes sifoPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,.16); } 50% { box-shadow: 0 0 0 12px rgba(37,99,235,0); } }
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
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-950 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1500px] items-center gap-4 px-4 sm:px-7 lg:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-200/50 sifo-pulse">
            <span className="text-xl font-black italic">S</span>
          </div>
          <div className="leading-none">
            <div className="text-[22px] font-extrabold tracking-tight text-slate-950">Sifo<span className="text-blue-600">Books</span></div>
            <div className="mt-1 hidden text-[8px] font-bold uppercase tracking-[.2em] text-slate-400 sm:block">Accounting · POS · ERP</div>
          </div>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((n, i) => <a key={n} href={i ? `#${n.toLowerCase()}` : "#"} className={`rounded-lg px-3 py-2 text-[12px] font-semibold ${i === 0 ? "text-blue-600" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{n}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" search={{ tab: "signin" }} className="hidden rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 sm:inline-flex">Sign in</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200 hover:from-blue-500 hover:to-blue-800">Start free</Link>
          <button aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-blue-700 transition hover:bg-blue-50 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-xl lg:hidden">
          <nav className="mx-auto grid max-w-[1500px] gap-1 sm:grid-cols-2">
            {nav.map((n, i) => (
              <a key={n} href={i ? `#${n.toLowerCase()}` : "#"} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">{n}</a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white text-slate-950">
      <div className="absolute inset-0 opacity-70 bg-[linear-gradient(rgba(37,99,235,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,.055)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_20%,rgba(37,99,235,.13),transparent_34%),radial-gradient(circle_at_8%_80%,rgba(245,158,11,.13),transparent_28%)]" /><div className="sifo-glow absolute -right-20 top-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1500px] items-center gap-8 px-4 pb-10 pt-10 sm:px-7 sm:pb-14 sm:pt-14 lg:min-h-[690px] lg:grid-cols-[.84fr_1.16fr] lg:gap-4 lg:px-10 lg:py-16">
        <div className="relative z-10 max-w-[690px] sifo-reveal">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-700">
            🇿🇲 Built in Zambia for Zambian business
          </div>
          <h1 className="max-w-[720px] text-[44px] font-black leading-[.94] tracking-[-.06em] sm:text-6xl lg:text-[76px]">
            One platform.<br />
            <span className="text-blue-600">Every operation.</span><br />
            Fully accounted<br className="sm:hidden" /> for.
          </h1>
          <p className="mt-6 max-w-[650px] text-[16px] leading-7 text-slate-600 sm:text-xl">
            SifoBooks runs the till, the stores, the payroll and the ledger on one record — so the figure a manager sees on the floor is the same figure the accountant files with ZRA.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-7 text-base font-extrabold text-white shadow-xl shadow-blue-200/50">
              Start free <ArrowRight className="h-5 w-5" />
            </Link>
            <a href="#features" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-blue-200 bg-white px-7 text-base font-bold text-blue-800 hover:bg-blue-50">
              <span className="text-xl">◈</span> Explore platform
            </a>
            <a href="#screens" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 px-7 text-base font-extrabold text-slate-950 shadow-xl shadow-amber-950/30">
              <span className="text-lg">▷</span> See demo
            </a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-slate-200 pt-7 sm:grid-cols-4">
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
      <div className="text-base font-extrabold text-slate-950 sm:text-lg">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-[11px]">{label}</div>
    </div>
  );
}

function HeroDashboard() {
  const kpis = [["Sales", "ZMW 125,430", "+12%"], ["Stock", "ZMW 84,200", "Healthy"], ["Payroll", "ZMW 46,890", "Processed"], ["ZRA", "Synced", "Ready"]];
  return (
    <div className="relative mt-2 min-h-[340px] sm:min-h-[430px] lg:mt-0 lg:min-h-[560px]">
      <div className="sifo-float absolute right-[-7%] top-[3%] w-[111%] sm:right-[-5%] sm:w-[114%] rotate-[-1deg] rounded-[30px] border border-blue-100 bg-white p-2 shadow-[0_35px_90px_rgba(15,23,42,.18)]">
        <div className="overflow-hidden rounded-[22px] bg-slate-50">
          <div className="flex h-11 items-center border-b bg-white px-4"><div className="text-[9px] font-bold text-slate-500">SifoBooks · Business Control Centre</div><div className="ml-auto flex gap-1.5"><span className="h-2 w-2 rounded-full bg-red-300"/><span className="h-2 w-2 rounded-full bg-amber-300"/><span className="h-2 w-2 rounded-full bg-emerald-500"/></div></div>
          <div className="grid grid-cols-[116px_1fr]">
            <div className="bg-[#06265f] p-3"><div className="mb-6 text-xs font-black text-white">SifoBooks</div>{["Dashboard","Sales & POS","Purchases","Inventory","Accounting","Payroll","ZRA","NAPSA","NHIMA","Reports"].map((x,i)=><div key={x} className={`mb-1 rounded-md px-2 py-1.5 text-[7px] font-semibold ${i===0?"bg-blue-500/25 text-white":"text-blue-100/60"}`}>{x}</div>)}</div>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between"><div><div className="text-[8px] text-slate-400">SifoBooks Business</div><div className="text-base font-black text-slate-900">Operations Overview</div></div><div className="rounded-md border bg-white px-2 py-1 text-[8px]">September 2026</div></div>
              <div className="grid grid-cols-4 gap-2">{kpis.map(k=><div key={k[0]} className="rounded-xl border bg-white p-2.5 shadow-sm"><div className="text-[7px] text-slate-400">{k[0]}</div><div className="mt-1 text-[11px] font-black text-slate-900">{k[1]}</div><div className="mt-1 text-[7px] font-bold text-blue-600">{k[2]}</div></div>)}</div>
              <div className="mt-3 grid grid-cols-[1.4fr_.6fr] gap-3">
                <div className="rounded-xl border bg-white p-3"><div className="mb-2 text-[8px] font-bold text-slate-800">Money in vs money out</div><div className="flex h-36 items-end gap-1.5">{[38,52,44,62,57,74,68,86,94].map((h,i)=><div key={i} className="flex-1 rounded-t bg-blue-600/85" style={{height:`${h}%`}} />)}</div><div className="mt-2 flex justify-between text-[6px] text-slate-400">Jan Feb Mar Apr May Jun Jul Aug Sep</div></div>
                <div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-bold text-slate-800">Connected operations</div><div className="mt-4 space-y-2">{["POS → Sales","Stock → COGS","Payroll → Ledger","Invoice → ZRA"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-[7px] font-bold text-slate-600">{x}<span className="float-right text-blue-600">✓</span></div>)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[-2%] left-[1%] z-20 w-[158px] sm:w-[190px] rounded-[28px] border-4 border-white bg-[#0b3b8f] p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between text-[8px] font-bold text-white"><span>SifoBooks Mobile</span><Smartphone className="h-3 w-3"/></div>
        <div className="rounded-xl bg-white p-3 text-slate-900"><div className="text-[7px] text-slate-400">Today's Sales</div><div className="mt-1 text-lg font-black">ZMW 12,450</div><div className="mt-1 text-[7px] font-bold text-blue-600">+18%</div><div className="mt-3 grid grid-cols-2 gap-1.5">{["POS","Invoice","Payroll","Reports"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-center text-[7px] font-bold">{x}</div>)}</div></div>
      </div>
    </div>
  );
}

function ModuleGrid() {
  return (
    <section id="features" className="relative bg-white py-12 sm:py-16"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />
      <div className="mx-auto max-w-[1450px] px-5 sm:px-8">
        <div className="mb-7 flex items-end justify-between sifo-reveal">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-700">One connected platform</div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Complete Solution for Every Business Need</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">All the tools you need in one powerful system — designed for Zambian businesses, consultants and organisations.</p>
          </div>
          <a href="#screens" className="hidden items-center gap-2 text-sm font-bold text-blue-700 transition hover:gap-3 sm:flex">Explore all modules <ArrowRight className="h-4 w-4"/></a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-8">
          {modules.map(([name, sub, Icon], index) => (
            <div
              key={name}
              className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-5 text-center shadow-[0_8px_30px_rgba(15,23,42,.055)] transition duration-500 hover:-translate-y-2 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(37,99,235,.13)] sifo-reveal"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="absolute inset-x-8 -top-12 h-20 rounded-full bg-blue-100/60 blur-2xl opacity-0 transition duration-500 group-hover:opacity-100" />
              <div className="relative mx-auto grid h-13 w-13 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition duration-500 group-hover:scale-110 group-hover:bg-blue-700 group-hover:text-white group-hover:rotate-3">
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
    <section id="industries" className="relative bg-slate-50 py-12 sm:py-16"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      <div className="mx-auto max-w-[1450px] px-5 sm:px-8">
        <div className="mb-7 flex items-end justify-between sifo-reveal">
          <div>
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-700">Specialised workspaces</div>
            <h2 className="text-3xl font-black tracking-tight">Solutions for Every Industry</h2>
            <p className="mt-1 text-sm text-slate-500">One connected platform with specialised workspaces.</p>
          </div>
          <span className="hidden items-center gap-2 text-sm font-bold text-blue-700 sm:flex">Built for real businesses in Zambia <ArrowRight className="h-4 w-4"/></span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {industries.map(([name, sub, Icon, image], index) => (
            <div
              key={name}
              className="group relative min-h-[172px] overflow-hidden rounded-2xl border border-blue-900/10 bg-blue-950 text-white shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_rgba(0,59,50,.28)] sifo-reveal"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-110 group-hover:opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06265f]/95 via-[#06265f]/55 to-blue-900/5" />
              <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-blue-300/15 blur-sm transition duration-500 group-hover:scale-125" />
              <div className="relative flex h-full min-h-[172px] flex-col justify-between p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/30 bg-[#06265f]/60 text-amber-300 backdrop-blur-sm transition duration-500 group-hover:scale-110 group-hover:bg-amber-300 group-hover:text-emerald-950">
                  <Icon className="h-5 w-5"/>
                </div>
                <div>
                  <div className="text-xs font-extrabold">{name}</div>
                  <div className="mt-1 text-[9px] text-blue-50/80">{sub}</div>
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
  return <section id="compliance" className="bg-white py-12 sm:py-16"><div className="mx-auto grid max-w-[1450px] items-center gap-8 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr]"><div className="sifo-reveal"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">Stay compliant in Zambia</div><h2 className="mt-3 text-3xl font-black sm:text-5xl tracking-tight sm:text-5xl">Compliance without the paperwork maze.</h2><p className="mt-4 max-w-xl text-base leading-7 text-slate-600">Keep statutory workflows visible in the same system as accounting, payroll and sales.</p><ul className="mt-5 space-y-2.5">{items.map(x=><li key={x} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600"/>{x}</li>)}</ul></div><ComplianceMockup/></div></section>;
}

function ComplianceMockup() {
  return <div className="relative rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-3 sm:p-4 shadow-[0_25px_80px_rgba(15,23,42,.12)] sifo-reveal"><div className="absolute -top-5 right-6 rounded-xl bg-blue-700 sifo-pulse px-4 py-2 text-xs font-extrabold text-white shadow-lg">✓ ZRA Smart Invoice Ready</div><div className="grid gap-3 md:grid-cols-[1fr_220px]"><div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between border-b pb-3"><div className="text-sm font-black">Sales Invoice</div><div className="rounded-lg bg-blue-700 px-3 py-1.5 text-[9px] font-bold text-white">Submit to ZRA</div></div><div className="mt-4 grid grid-cols-2 gap-3 text-[9px]"><span>Customer<br/><b>ABC Supplies Ltd</b></span><span>Invoice Date<br/><b>25 Sep 2026</b></span><span>Invoice No.<br/><b>INV-00045</b></span><span>Branch<br/><b>Ndola</b></span></div><div className="mt-4 overflow-hidden rounded-lg border"><div className="grid grid-cols-4 bg-slate-50 p-2 text-[8px] font-bold"><span>Item</span><span>Qty</span><span>VAT</span><span>Total</span></div>{["Maize Meal","Cooking Oil","Sugar"].map((x,i)=><div key={x} className="grid grid-cols-4 border-t p-2 text-[8px]"><span>{x}</span><span>{[12,5,8][i]}</span><span>16%</span><b>{["1,392","1,450","1,670"][i]}</b></div>)}</div><div className="mt-3 text-right text-sm font-black">ZMW 4,524.00</div></div><div className="rounded-2xl border bg-white p-5"><div className="text-[9px] font-black">ZRA SMART INVOICE</div><div className="mt-4 grid h-36 place-items-center rounded-lg border-2 border-dashed text-xs font-black text-slate-400">QR CODE</div><div className="mt-3 text-[8px] text-slate-500">Fiscal reference and receipt data appear here after a successful ZRA response.</div></div></div><div className="mt-4 grid grid-cols-3 gap-3">{[["ZRA","Smart Invoice"],["NAPSA","Contributions"],["NHIMA","Contributions"]].map(x=><div key={x[0]} className="rounded-xl border bg-white p-3 text-center"><div className="text-lg font-black text-blue-800">{x[0]}</div><div className="text-[8px] text-slate-500">{x[1]}</div></div>)}</div></div>;
}

function Screens() {
  const slides = [
    { key: "pos", label: "POS Screens", title: "Fast checkout that feels simple.", sub: "Retail, supermarket and multi-branch point of sale.", tone: "blue", view: <PosGallery /> },
    { key: "payroll", label: "Payroll Screens", title: "Payroll and statutory workflows together.", sub: "Employees, PAYE, NAPSA and NHIMA in one workspace.", tone: "gold", view: <PayrollGallery /> },
    { key: "accounting", label: "Accounting Screens", title: "Accounting your team can understand.", sub: "Ledgers, invoices, financial statements and controls.", tone: "blue", view: <AccountingGallery /> },
    { key: "analytics", label: "Reports & Analytics", title: "See the business clearly.", sub: "Management dashboards and financial performance.", tone: "gold", view: <ReportsGallery /> },
    { key: "mobile", label: "Mobile App", title: "Business visibility wherever you work.", sub: "Mobile-friendly views for owners and managers.", tone: "blue", view: <MobileGallery /> },
  ];

  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((v) => (v + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section id="screens" className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1450px] px-5 sm:px-8">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sifo-reveal">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-700">See it in action</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Real screens. Real workflows.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Explore the SifoBooks experience across POS, payroll, accounting, analytics and mobile.</p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button onClick={() => setActive((active - 1 + slides.length) % slides.length)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm hover:bg-blue-50" aria-label="Previous screen"><span className="text-lg">‹</span></button>
            <button onClick={() => setActive((active + 1) % slides.length)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm hover:bg-blue-50" aria-label="Next screen"><span className="text-lg">›</span></button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {slides.map((slide, i) => (
            <button key={slide.key} onClick={() => setActive(i)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${active === i ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"}`}>
              {slide.label}
            </button>
          ))}
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[30px] border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50/50 p-3 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-6">
          <div key={slides[active].key} className="sifo-reveal">
            <div className="mb-4 flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-950 sm:text-2xl">{slides[active].title}</h3>
                <p className="text-xs text-slate-500 sm:text-sm">{slides[active].sub}</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-extrabold ${slides[active].tone === "gold" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>SifoBooks 2026</span>
            </div>
            {slides[active].view}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {slides.map((slide, i) => <button key={slide.key} onClick={() => setActive(i)} aria-label={`Show ${slide.label}`} className={`h-2 rounded-full transition-all ${active === i ? "w-7 bg-blue-600" : "w-2 bg-slate-300"}`} />)}
        </div>
      </div>
    </section>
  );
}

function GalleryFrame({ children }: { children: ReactNode }) {
  return <div className="grid min-h-[270px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-inner sm:min-h-[360px] sm:p-5">{children}</div>;
}

function PosGallery() {
  return <GalleryFrame><div className="grid w-full max-w-5xl gap-3 lg:grid-cols-[1.2fr_.8fr]">
    <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-lg sm:p-5">
      <div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] text-slate-400">Retail POS</div><div className="text-lg font-black text-slate-950">Checkout</div></div><div className="rounded-lg bg-blue-50 px-3 py-2 text-[9px] font-bold text-blue-700">Online</div></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["Milk","Bread","Cooking Oil","Sugar","Rice","Soft Drinks"].map((x,i)=><div key={x} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100 text-blue-700"><Package className="h-4 w-4"/></div><div className="mt-2 text-xs font-bold">{x}</div><div className="text-[9px] text-slate-400">ZMW {[18,14,85,12,30,10][i]}.00</div></div>)}</div>
    </div>
    <div className="rounded-2xl bg-[#06265f] p-4 text-white shadow-lg sm:p-5"><div className="text-xs font-bold text-blue-100">Current sale</div><div className="mt-5 text-3xl font-black">ZMW 285.00</div><div className="mt-5 space-y-2">{["Milk × 2","Bread × 1","Rice × 3"].map(x=><div key={x} className="rounded-lg bg-white/10 p-2 text-xs">{x}<span className="float-right">✓</span></div>)}</div><button className="mt-5 w-full rounded-xl bg-amber-400 py-3 text-xs font-black text-slate-950">Pay & Complete</button></div>
  </div></GalleryFrame>;
}

function PayrollGallery() {
  return <GalleryFrame><div className="w-full max-w-5xl rounded-2xl border bg-white p-3 shadow-lg sm:p-5">
    <div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] text-slate-400">Payroll workspace</div><div className="text-lg font-black">September Payroll</div></div><span className="rounded-lg bg-amber-100 px-3 py-2 text-[9px] font-bold text-amber-700">Ready to process</span></div>
    <div className="overflow-x-auto"><div className="min-w-[620px] rounded-xl border"><div className="grid grid-cols-5 bg-blue-50 p-3 text-[9px] font-black text-blue-800"><span>Employee</span><span>PAYE</span><span>NAPSA</span><span>NHIMA</span><span>Net Pay</span></div>{["Chanda M.","Mulenga B.","Kasonde A.","Tembo R.","Banda C."].map((x,i)=><div key={x} className="grid grid-cols-5 border-t p-3 text-[9px]"><span className="font-bold">{x}</span><span>ZMW {[650,1200,520,980,740][i]}</span><span>ZMW {[500,700,450,600,550][i]}</span><span>ZMW {[450,630,405,540,470][i]}</span><span className="font-bold text-blue-700">ZMW {[3400,4470,3125,3880,3650][i]}</span></div>)}</div></div>
    <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black text-white">Process Payroll</button><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black text-slate-700">Generate Returns</button></div>
  </div></GalleryFrame>;
}

function AccountingGallery() {
  return <GalleryFrame><div className="grid w-full max-w-5xl gap-3 md:grid-cols-2"><div className="rounded-2xl border bg-white p-4 shadow-lg"><div className="text-[9px] text-slate-400">Financial control</div><div className="mt-1 text-lg font-black">Trial Balance</div><div className="mt-5 space-y-2">{["Cash & Bank","Receivables","Inventory","Payables","Capital"].map((x,i)=><div key={x} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs"><span>{x}</span><b>ZMW {[124500,82400,67800,36200,238500][i].toLocaleString()}</b></div>)}</div></div><div className="rounded-2xl bg-blue-950 p-5 text-white"><div className="text-xs text-blue-200">Profit & Loss</div><div className="mt-2 text-3xl font-black">ZMW 98,450</div><div className="mt-5 flex h-28 items-end gap-2">{[35,48,42,60,52,72,66,85].map((h,i)=><div key={i} className="flex-1 rounded-t bg-blue-400" style={{height:`${h}%`}} />)}</div></div></div></GalleryFrame>;
}

function ReportsGallery() {
  return <GalleryFrame><div className="grid w-full max-w-5xl gap-3 md:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border bg-white p-4 shadow-lg"><div className="flex justify-between"><div className="text-sm font-black">Business Performance</div><span className="text-[9px] text-slate-400">Sep 2026</span></div><div className="mt-5 flex h-40 items-end gap-2">{[38,52,44,62,57,74,68,86,94].map((h,i)=><div key={i} className="flex-1 rounded-t bg-blue-600" style={{height:`${h}%`}} />)}</div><div className="mt-3 grid grid-cols-3 gap-2">{[["Sales","125,430"],["Costs","48,200"],["Profit","46,890"]].map(x=><div key={x[0]} className="rounded-lg bg-slate-50 p-2"><div className="text-[8px] text-slate-400">{x[0]}</div><b className="text-[10px]">ZMW {x[1]}</b></div>)}</div></div><div className="rounded-2xl bg-white p-5 shadow-lg border"><div className="text-xs font-black">Business Summary</div><div className="mx-auto mt-6 grid h-28 w-28 place-items-center rounded-full border-[18px] border-blue-600"><span className="text-center text-xs font-black">ZMW<br/>125,430</span></div></div></div></GalleryFrame>;
}

function MobileGallery() {
  return <GalleryFrame><div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 sm:flex-row"><div className="w-[190px] rounded-[28px] border-4 border-slate-800 bg-[#06265f] p-2 shadow-xl"><div className="rounded-[20px] bg-white p-3"><div className="text-[8px] text-slate-400">Today's Sales</div><div className="mt-1 text-xl font-black">ZMW 12,450</div><div className="mt-4 grid grid-cols-2 gap-2">{["POS","Invoice","Inventory","Payroll"].map(x=><div key={x} className="rounded-lg bg-blue-50 p-3 text-center text-[8px] font-black text-blue-700">{x}</div>)}</div></div></div><div className="max-w-md text-center sm:text-left"><div className="text-2xl font-black">Mobile visibility for owners.</div><p className="mt-2 text-sm text-slate-500">Check sales, stock, payroll and reports without being tied to the office.</p></div></div></GalleryFrame>;
}

function FinalCta() {
  return <section className="relative overflow-hidden bg-[#06265f] py-14 text-white sm:py-18"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_100%,rgba(37,99,235,.35),transparent_35%)]"/><div className="relative mx-auto grid max-w-[1400px] sifo-reveal gap-8 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-blue-300/20 bg-blue-950/45 p-7"><div className="text-amber-300">★★★★★</div><p className="mt-4 text-lg font-semibold leading-7">“SifoBooks brings our sales, stock, payroll and accounts together in one place.”</p><div className="mt-5 text-xs text-blue-100/70">SifoBooks customer · Zambia</div></div><div className="flex flex-col justify-center"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-amber-300">Built for Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Everything your business needs. One connected system.</h2><p className="mt-4 max-w-xl text-blue-50/80">Start with accounting, POS, payroll or inventory and add the modules your business needs as you grow.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/auth" search={{tab:"signup"}} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950">Start Free Trial <ArrowRight className="h-4 w-4"/></Link><a href="mailto:sales@sifobooks.com" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3.5 text-sm font-bold">Contact Sales</a></div></div></div></section>;
}

function Footer() {
  return <footer className="bg-[#061b46] py-10 text-white"><div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between"><div><div className="text-xl font-black">SifoBooks</div><div className="mt-1 text-xs text-blue-100/60">Accounting · POS · ERP · Zambia</div></div><div className="flex flex-wrap gap-5 text-xs font-semibold text-blue-100/70"><a href="#features">Features</a><a href="#industries">Industries</a><a href="#compliance">Compliance</a><a href="#screens">Screens</a><Link to="/auth">Sign in</Link></div><div className="text-xs text-blue-100/50">© {new Date().getFullYear()} SifoBooks</div></div></footer>;
}
