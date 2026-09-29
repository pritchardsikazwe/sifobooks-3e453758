import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Building2, CheckCircle2, ClipboardList, FileSpreadsheet, GraduationCap, Hotel, Package, ReceiptText, ShieldCheck, ShoppingCart, Smartphone, Utensils, Users, WalletCards, Wifi, Zap } from "lucide-react";

const modules = [
  ["Accounting", "General ledger, reports & financials", BarChart3],
  ["POS", "Retail & supermarket point of sale", ShoppingCart],
  ["Restaurant", "Table orders & kitchen display", Utensils],
  ["Payroll", "Employees, PAYE, NAPSA, NHIMA", Users],
  ["ZRA Compliance", "Smart Invoice, VAT & returns", ReceiptText],
  ["Inventory", "Stock control & warehouses", Package],
  ["Consultants", "Multi-company client management", ClipboardList],
  ["All-in-One", "One subscription, multiple businesses", Zap],
];

const industries = [
  ["Retail & POS", "Shops & supermarkets", ShoppingCart],
  ["Restaurant", "Cafés & bars", Utensils],
  ["Hotel", "Accommodation", Hotel],
  ["School", "Education institutions", GraduationCap],
  ["Property", "Rentals & estates", Building2],
  ["Microfinance", "SACCOs & lending", WalletCards],
  ["Manufacturing", "Production & inventory", Package],
  ["Services", "Agencies & NGOs", Users],
];

const featureChecks = [
  "ZRA Smart Invoice & VAT workflows",
  "PAYE calculation and payroll submissions",
  "NAPSA contributions",
  "NHIMA contributions",
  "TP10 and payroll compliance reports",
  "Compliance reports and audit trail",
];

export function SifoLandingHome() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white font-sans text-slate-950">
      <LandingHeader />
      <Hero />
      <ModuleStrip />
      <IndustryStrip />
      <ComplianceSection />
      <ProductScreens />
      <TrustCta />
      <Footer />
    </main>
  );
}

function LandingHeader() {
  const nav = ["Home", "Features", "Industries", "Compliance", "Pricing", "Resources", "Support"];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-5 px-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-sm">
            <span className="text-xl font-black">S</span><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <div className="leading-none">
            <div className="text-[20px] font-extrabold tracking-tight text-emerald-950">SifoBooks</div>
            <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Accounting · POS · ERP</div>
          </div>
        </Link>
        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((item, i) => (
            <a key={item} href={i === 0 ? "#" : `#${item.toLowerCase()}`} className={`rounded-lg px-3 py-2 text-[13px] font-semibold hover:bg-emerald-50 hover:text-emerald-800 ${i === 0 ? "text-emerald-800" : "text-slate-600"}`}>{item}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" search={{ tab: "signin" }} className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">Sign in</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-amber-300">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#003b32] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(22,163,74,.42),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(234,179,8,.16),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-[610px] max-w-[1440px] items-center gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.84fr_1.16fr] lg:py-16">
        <div className="relative z-10 max-w-[650px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-100">🇿🇲 Built for Zambian Businesses</div>
          <h1 className="text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-6xl xl:text-[68px]">Accounting, POS &<br /><span className="text-amber-400">Business Management</span><br />Made Simple</h1>
          <p className="mt-6 max-w-[580px] text-base leading-7 text-emerald-50/85 sm:text-lg">One system for everything — accounting, inventory, POS, payroll, compliance and industry solutions. Run your business, stay organized and grow with SifoBooks.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-amber-300">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10">▶ Watch Demo</Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Proof icon={ReceiptText} text="ZRA Ready" />
            <Proof icon={Wifi} text="Online & Offline" />
            <Proof icon={Package} text="All-in-One" />
            <Proof icon={ShieldCheck} text="Secure" />
            <Proof icon={Building2} text="Built for Zambia" />
          </div>
        </div>
        <DashboardMockup />
      </div>
    </section>
  );
}

function Proof({ icon: Icon, text }: any) {
  return <div className="flex items-center gap-2 text-[10px] font-semibold leading-4 text-emerald-50/85"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-900/60"><Icon className="h-4 w-4 text-amber-300" /></span>{text}</div>;
}

function DashboardMockup() {
  const menu = ["Dashboard", "Sales", "Purchases", "Inventory", "Accounting", "POS", "Payroll", "ZRA", "NAPSA", "NHIMA", "Reports", "Settings"];
  return (
    <div className="relative min-h-[430px] lg:min-h-[535px]">
      <div className="absolute right-[-6%] top-[4%] w-[106%] rotate-[-2deg] rounded-[28px] border border-white/30 bg-white p-2 shadow-[0_35px_100px_rgba(0,0,0,.45)]">
        <div className="overflow-hidden rounded-[21px] bg-slate-50">
          <div className="flex h-10 items-center gap-2 border-b bg-white px-4"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="ml-auto text-[8px] text-slate-400">SifoBooks Business Demo</span></div>
          <div className="grid grid-cols-[120px_1fr]">
            <div className="hidden bg-[#003b32] p-3 sm:block"><div className="mb-5 text-xs font-black text-white">SifoBooks</div>{menu.map((x,i)=><div key={x} className={`mb-0.5 rounded-md px-2 py-1.5 text-[7px] font-semibold ${i===0?"bg-emerald-500/20 text-white":"text-emerald-100/65"}`}>{x}</div>)}</div>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between"><div><div className="text-[9px] text-slate-400">SifoBooks Demo Ltd</div><div className="text-base font-black text-slate-900">Dashboard</div></div><div className="rounded-md border bg-white px-2 py-1 text-[8px]">01–30 Sep 2026</div></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Total Sales","ZMW 125,430","+12%"],["Purchases","ZMW 48,200","-5%"],["Profit","ZMW 46,890","+18%"],["VAT (ZRA)","ZMW 18,450","Ready"]].map(x=><div key={x[0]} className="rounded-xl border bg-white p-3 shadow-sm"><div className="text-[7px] text-slate-400">{x[0]}</div><div className="mt-1 text-sm font-black">{x[1]}</div><div className="mt-1 text-[7px] font-bold text-emerald-600">{x[2]}</div></div>)}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]"><div className="rounded-xl border bg-white p-3"><div className="mb-3 text-[8px] font-bold">Sales Performance</div><div className="flex h-36 items-end gap-2">{[32,45,38,58,52,70,62,83,92].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-600/80" style={{height:`${h}%`}} />)}</div><div className="mt-2 flex justify-between text-[6px] text-slate-400">Jan Feb Mar Apr May Jun Jul Aug Sep</div></div><div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-bold">Business Summary</div><div className="mx-auto my-5 grid h-28 w-28 place-items-center rounded-full border-[18px] border-emerald-700 border-r-amber-400 border-b-slate-200"><div className="text-center"><div className="text-[7px] text-slate-400">Total sales</div><div className="text-[10px] font-black">ZMW 125,430</div></div></div><div className="text-[7px] text-slate-500">Retail 45% · Restaurant 20% · Hotel 15%</div></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[-3%] left-[2%] z-20 w-[155px] rounded-[24px] border-4 border-white bg-[#063f35] p-3 shadow-2xl sm:w-[180px]"><div className="mb-3 flex items-center justify-between text-[8px] font-bold text-white"><span>SifoBooks</span><Smartphone className="h-3 w-3" /></div><div className="rounded-xl bg-white p-3 text-slate-900"><div className="text-[7px] text-slate-400">Today's Sales</div><div className="mt-1 text-lg font-black">ZMW 12,450</div><div className="mt-1 text-[7px] font-bold text-emerald-600">+18%</div><div className="mt-4 grid grid-cols-2 gap-2">{["POS","Invoice","Inventory","Customers"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-center text-[7px] font-bold">{x}</div>)}</div></div></div>
    </div>
  );
}

function ModuleStrip() {
  return <section id="features" className="bg-white py-10"><div className="mx-auto max-w-[1440px] px-5 sm:px-8"><div className="mb-5 flex items-end justify-between"><div><h2 className="text-2xl font-black tracking-tight">Complete Solution for Every Business Need</h2><p className="mt-1 text-sm text-slate-500">All the tools you need in one powerful system — designed for Zambian businesses, consultants and organizations.</p></div><a href="#screens" className="hidden text-sm font-bold text-emerald-700 sm:block">Explore all modules →</a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{modules.map(([name,sub,Icon]: any)=><a key={name} href={`#${String(name).toLowerCase().replaceAll(" ","-")}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_5px_20px_rgba(15,23,42,.06)] transition hover:-translate-y-1 hover:border-emerald-200"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div><div className="mt-3 text-xs font-extrabold">{name}</div><div className="mt-1 text-[9px] leading-4 text-slate-500">{sub}</div></a>)}</div></div></section>;
}

function IndustryStrip() {
  return <section id="industries" className="border-t border-slate-100 bg-white py-9"><div className="mx-auto max-w-[1440px] px-5 sm:px-8"><div className="mb-5 flex items-end justify-between"><div><h2 className="text-2xl font-black tracking-tight">Solutions for Every Industry</h2><p className="mt-1 text-sm text-slate-500">One platform, with specialized workflows for the way each business operates.</p></div><a href="#screens" className="hidden text-sm font-bold text-emerald-700 sm:block">Built for real businesses in Zambia →</a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{industries.map(([name,sub,Icon]: any)=><div key={name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_20px_rgba(15,23,42,.06)] transition hover:-translate-y-1"><div className="grid h-24 place-items-center bg-gradient-to-br from-emerald-50 to-slate-100"><Icon className="h-9 w-9 text-emerald-700" /></div><div className="bg-[#063f35] px-3 py-3 text-white"><div className="text-xs font-extrabold">{name}</div><div className="mt-1 text-[9px] text-emerald-100/80">{sub}</div></div></div>)}</div></div></section>;
}

function ComplianceSection() {
  return <section id="compliance" className="bg-white py-14 sm:py-20"><div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.82fr_1.18fr]"><div><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Stay compliant in Zambia</div><h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Compliance built into the workflow.</h2><p className="mt-4 max-w-xl text-base leading-7 text-slate-600">SifoBooks brings accounting, payroll and statutory workflows together so your team can prepare, review and track compliance from one place.</p><ul className="mt-6 space-y-3">{featureChecks.map(x=><li key={x} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />{x}</li>)}</ul></div><ComplianceMockup /></div></section>;
}

function ComplianceMockup() {
  return <div className="relative"><div className="absolute -right-2 top-0 z-20 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800 shadow-lg">✓ ZRA Smart Invoice Ready</div><div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_25px_70px_rgba(15,23,42,.12)]"><div className="overflow-hidden rounded-[20px] border bg-slate-50"><div className="flex items-center justify-between border-b bg-white px-4 py-3"><div className="text-xs font-black">Sales Invoice · ZRA</div><div className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[9px] font-bold text-white">Submit to ZRA</div></div><div className="grid gap-3 p-4 sm:grid-cols-[1fr_110px]"><div><div className="grid grid-cols-3 gap-2">{["ABC Supplies Ltd","25 Sep 2026","INV-00045"].map(x=><div key={x} className="rounded-lg border bg-white p-2 text-[8px] font-semibold text-slate-600">{x}</div>)}</div><div className="mt-3 overflow-hidden rounded-lg border bg-white"><div className="grid grid-cols-5 bg-slate-100 px-3 py-2 text-[7px] font-bold"><span>Item</span><span>Qty</span><span>Unit</span><span>VAT</span><span>Total</span></div>{[["Maize Meal","10","120","16%","1,392"],["Cooking Oil","5","250","16%","1,450"],["Sugar","8","180","16%","1,670"]].map(r=><div key={r[0]} className="grid grid-cols-5 border-t px-3 py-2 text-[7px]"><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><b>{r[4]}</b></div>)}</div><div className="mt-3 flex justify-end text-sm font-black">ZMW 4,524.00</div></div><div className="rounded-xl border bg-white p-3 text-center"><div className="text-[8px] font-black">ZRA SMART INVOICE</div><div className="mt-3 grid h-24 place-items-center border-2 border-slate-100 text-[10px] font-bold text-slate-500">QR</div><div className="mt-2 text-[7px] text-slate-500">Fiscal receipt preview</div></div></div></div></div></div>;
}

function ProductScreens() {
  const screens = [
    ["POS Screen", "Fast, simple and reliable", "pos"],
    ["Restaurant Screen", "Table orders & kitchen display", "restaurant"],
    ["Payroll Screen", "Employees, PAYE, NAPSA, NHIMA", "payroll"],
    ["Accounting Reports", "Real-time financial insights", "accounting"],
  ];
  return <section id="screens" className="bg-slate-50 py-14 sm:py-18"><div className="mx-auto max-w-[1440px] px-5 sm:px-8"><div className="mb-6"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">See SifoBooks in action</div><h2 className="mt-2 text-3xl font-black tracking-tight">Modern screens for real business operations</h2><p className="mt-1 text-sm text-slate-500">Designed for owners, accountants, cashiers, restaurant teams, payroll officers and consultants.</p></div><div className="grid gap-4 lg:grid-cols-4">{screens.map(([title,sub,type])=><ScreenCard key={type} title={title} sub={sub} type={type} />)}</div></div></section>;
}

function ScreenCard({ title, sub, type }: { title:string; sub:string; type:string }) {
  if (type === "pos") return <Mini title={title} sub={sub}><div className="grid grid-cols-[1fr_90px] gap-2"><div className="grid grid-cols-3 gap-1">{["Burger","Chips","Coke","Chicken","Water","Coffee"].map(x=><div key={x} className="rounded bg-emerald-50 p-2 text-[7px] font-bold">{x}</div>)}</div><div className="rounded bg-white p-2 shadow-sm"><div className="text-[7px] font-bold">Cart</div><div className="mt-2 space-y-1 text-[6px]">Burger ×2<br/>Coke ×2<br/>Chips ×1</div><div className="mt-3 border-t pt-2 text-[8px] font-black">ZMW 140.00</div><div className="mt-2 rounded bg-emerald-700 px-2 py-1 text-center text-[6px] font-bold text-white">Complete Sale</div></div></div></Mini>;
  if (type === "restaurant") return <Mini title={title} sub={sub}><div className="grid grid-cols-4 gap-1">{["T1","T2","T3","T4","T5","T6","T7","T8"].map((x,i)=><div key={x} className={`rounded p-2 text-center text-[7px] font-bold ${i%3===0?"bg-amber-100 text-amber-800":"bg-emerald-50 text-emerald-800"}`}>{x}</div>)}</div><div className="mt-2 rounded bg-white p-2 text-[7px] shadow-sm"><b>Kitchen Display</b><div className="mt-2 flex justify-between"><span>Order #046 · Table 6</span><span className="text-amber-600">Preparing</span></div></div></Mini>;
  if (type === "payroll") return <Mini title={title} sub={sub}><div className="grid grid-cols-4 bg-emerald-50 px-2 py-2 text-[6px] font-bold"><span>Employee</span><span>PAYE</span><span>NAPSA</span><span>Net</span></div>{["Chanda M.","Mulenga B.","Kaonde R.","Tembo R."].map((x,i)=><div key={x} className="grid grid-cols-4 border-b bg-white px-2 py-2 text-[6px]"><span>{x}</span><span>{[650,1200,540,980][i]}</span><span>{[500,700,455,540][i]}</span><b>{[3400,4470,3125,3120][i]}</b></div>)}<div className="mt-2 flex gap-2"><span className="rounded bg-emerald-700 px-2 py-1 text-[6px] font-bold text-white">Process Payroll</span><span className="rounded border px-2 py-1 text-[6px] font-bold">Generate Returns</span></div></Mini>;
  return <Mini title={title} sub={sub}><div className="rounded bg-white p-2"><div className="flex justify-between text-[7px] font-bold"><span>Profit & Loss</span><span>This Year</span></div><div className="mt-3 flex h-24 items-end gap-1">{[25,35,31,50,44,65,58,76,88].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-600" style={{height:`${h}%`}} />)}</div><div className="mt-2 flex justify-between text-[6px] text-slate-400"><span>Total Income ZMW 425,600</span><b className="text-emerald-700">Net Profit ZMW 98,450</b></div></div></Mini>;
}

function Mini({ title, sub, children }: any) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_35px_rgba(15,23,42,.08)]"><div className="mb-3 flex h-7 items-center gap-1 border-b pb-2"><span className="h-1.5 w-1.5 rounded-full bg-red-300"/><span className="h-1.5 w-1.5 rounded-full bg-amber-300"/><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/></div><div className="mb-3 text-[9px] font-black">{title}<span className="ml-1 font-normal text-slate-400">· {sub}</span></div>{children}</div>;
}

function TrustCta() {
  return <section className="relative overflow-hidden bg-[#003b32] py-16 text-white sm:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(22,163,74,.35),transparent_36%)]"/><div className="relative mx-auto grid max-w-[1400px] gap-8 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-emerald-300/20 bg-emerald-950/40 p-7"><div className="text-4xl text-amber-300">★★★★★</div><p className="mt-4 text-lg font-semibold leading-7">“SifoBooks brings sales, stock, payroll and accounts together in one place.”</p><div className="mt-5 text-xs text-emerald-100/70">SifoBooks product showcase</div></div><div className="flex flex-col justify-center"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-amber-300">Built for Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">One system. Every part of the business.</h2><p className="mt-4 max-w-xl text-emerald-50/80">Start with accounting, POS, payroll or inventory and add the workflows your business needs as it grows.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950">Start Free Trial <ArrowRight className="h-4 w-4" /></Link><a href="mailto:sales@sifobooks.com" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3.5 text-sm font-bold">Contact Sales</a></div></div></div></section>;
}

function Footer() {
  return <footer className="bg-[#002c26] py-10 text-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between"><div><div className="text-xl font-black">SifoBooks</div><div className="mt-1 text-xs text-emerald-100/60">Accounting · POS · ERP · Zambia</div></div><div className="flex flex-wrap gap-5 text-xs font-semibold text-emerald-100/70"><a href="#features">Features</a><a href="#industries">Industries</a><a href="#compliance">Compliance</a><a href="#screens">Screens</a><Link to="/auth">Sign in</Link></div><div className="text-xs text-emerald-100/50">© {new Date().getFullYear()} SifoBooks</div></div></footer>;
}
