import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Building2, CheckCircle2, ChefHat, CircleDollarSign, ClipboardCheck,
  FileText, GraduationCap, Hotel, Package, ReceiptText, ShieldCheck, ShoppingCart,
  Smartphone, Users, Utensils, WalletCards, Wifi, Zap
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
  ["Retail & POS", "Shops & Supermarkets", ShoppingCart],
  ["Restaurant", "Cafés & Bars", Utensils],
  ["Hotel", "Accommodation", Hotel],
  ["School", "Education Institutions", GraduationCap],
  ["Property", "Rentals & Estates", Building2],
  ["Microfinance", "SACCOs & Lending", WalletCards],
  ["Manufacturing", "Production & Inventory", Package],
  ["Services", "Agencies & NGOs", BriefcaseIcon],
] as const;

function BriefcaseIcon({ className }: { className?: string }) {
  return <Zap className={className} />;
}

export function SifoLandingHome() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950">
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1450px] items-center gap-6 px-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-950 text-white shadow-md">
            <span className="text-xl font-black">S</span>
          </div>
          <div className="leading-none">
            <div className="text-[20px] font-extrabold tracking-tight text-emerald-950">SifoBooks</div>
            <div className="mt-1 text-[8px] font-bold uppercase tracking-[.2em] text-slate-500">Accounting · POS · ERP</div>
          </div>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((n, i) => <a key={n} href={i ? `#${n.toLowerCase()}` : "#"} className={`rounded-lg px-3 py-2 text-[13px] font-semibold ${i === 0 ? "text-emerald-800" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}`}>{n}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" search={{ tab: "signin" }} className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">Sign In</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm hover:bg-amber-300">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#003b32] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(22,163,74,.42),transparent_34%),radial-gradient(circle_at_15%_100%,rgba(234,179,8,.14),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-[620px] max-w-[1450px] items-center gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[.86fr_1.14fr] lg:py-16">
        <div className="relative z-10 max-w-[620px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-50">🇿🇲 Built for Zambian Businesses</div>
          <h1 className="text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl xl:text-[66px]">Accounting, POS &<br /><span className="text-amber-400">Business Management</span><br />Made Simple</h1>
          <p className="mt-5 max-w-[570px] text-base leading-7 text-emerald-50/85 sm:text-lg">One system for accounting, inventory, POS, payroll and Zambian compliance. Built for businesses, consultants and organisations that want everything connected.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-amber-950/20">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/5 px-6 py-3.5 text-sm font-bold">▶ Watch Demo</Link>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Proof icon={ReceiptText} text="ZRA Ready" />
            <Proof icon={Wifi} text="Online & Offline" />
            <Proof icon={Package} text="All-in-One" />
            <Proof icon={ShieldCheck} text="Secure" />
            <Proof icon={Users} text="For Consultants" />
          </div>
        </div>
        <HeroDashboard />
      </div>
    </section>
  );
}

function Proof({ icon: Icon, text }: any) {
  return <div className="flex items-center gap-2 text-[10px] font-semibold leading-4 text-emerald-50/85"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-950/60"><Icon className="h-4 w-4 text-amber-300" /></span>{text}</div>;
}

function HeroDashboard() {
  const kpis = [["Total Sales", "ZMW 125,430", "+12%"], ["Purchases", "ZMW 48,200", "-5%"], ["Profit", "ZMW 46,890", "+18%"], ["VAT (ZRA)", "ZMW 18,450", "Synced"]];
  return (
    <div className="relative min-h-[410px] lg:min-h-[520px]">
      <div className="absolute right-[-8%] top-[4%] w-[108%] rotate-[-2deg] rounded-[28px] border border-white/30 bg-white p-2 shadow-[0_35px_100px_rgba(0,0,0,.45)]">
        <div className="overflow-hidden rounded-[21px] bg-slate-50">
          <div className="flex h-10 items-center border-b bg-white px-4"><div className="text-[9px] font-bold text-slate-500">SifoBooks Business Dashboard</div><div className="ml-auto flex gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="h-2 w-2 rounded-full bg-slate-300"/><span className="h-2 w-2 rounded-full bg-slate-300"/></div></div>
          <div className="grid grid-cols-[118px_1fr]">
            <div className="hidden bg-[#003b32] p-3 sm:block"><div className="mb-6 text-xs font-black text-white">SifoBooks</div>{["Dashboard","Sales","Purchases","Inventory","Accounting","POS","Payroll","ZRA","NAPSA","NHIMA","Reports"].map((x,i)=><div key={x} className={`mb-0.5 rounded-md px-2 py-1.5 text-[7px] font-semibold ${i===0?"bg-emerald-500/25 text-white":"text-emerald-100/60"}`}>{x}</div>)}</div>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between"><div><div className="text-[8px] text-slate-400">SifoBooks Demo Ltd</div><div className="text-base font-black">Business Overview</div></div><div className="rounded-md border bg-white px-2 py-1 text-[8px]">01–30 Sep 2026</div></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{kpis.map(k=><div key={k[0]} className="rounded-xl border bg-white p-2.5 shadow-sm"><div className="text-[7px] text-slate-400">{k[0]}</div><div className="mt-1 text-[12px] font-black">{k[1]}</div><div className="mt-1 text-[7px] font-bold text-emerald-600">{k[2]}</div></div>)}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]"><div className="rounded-xl border bg-white p-3"><div className="mb-2 text-[8px] font-bold">Sales Performance</div><div className="flex h-32 items-end gap-1.5">{[32,45,38,58,52,70,62,83,92].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-600/80" style={{height:`${h}%`}} />)}</div><div className="mt-2 flex justify-between text-[6px] text-slate-400">Jan Feb Mar Apr May Jun Jul Aug Sep</div></div><div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-bold">Business Summary</div><div className="mx-auto my-4 grid h-24 w-24 place-items-center rounded-full border-[16px] border-emerald-700 border-r-amber-400 border-b-slate-200"><div className="text-center"><div className="text-[7px] text-slate-400">Total</div><div className="text-[9px] font-black">125,430</div></div></div><div className="text-[7px] text-slate-500">Retail · Restaurant · Hotel · Services</div></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[-3%] left-[2%] z-20 w-[155px] rounded-[24px] border-4 border-white bg-[#063f35] p-3 shadow-2xl sm:w-[175px]">
        <div className="mb-2 flex items-center justify-between text-[8px] font-bold text-white"><span>SifoBooks</span><Smartphone className="h-3 w-3"/></div>
        <div className="rounded-xl bg-white p-3 text-slate-900"><div className="text-[7px] text-slate-400">Today's Sales</div><div className="mt-1 text-lg font-black">ZMW 12,450</div><div className="mt-1 text-[7px] font-bold text-emerald-600">+18%</div><div className="mt-3 grid grid-cols-2 gap-1.5">{["POS","Invoice","Payroll","Reports"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-center text-[7px] font-bold">{x}</div>)}</div></div>
      </div>
    </div>
  );
}

function ModuleGrid() {
  return <section id="features" className="bg-white py-10 sm:py-12"><div className="mx-auto max-w-[1450px] px-5 sm:px-8"><div className="mb-5 flex items-end justify-between"><div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Complete Solution for Every Business Need</h2><p className="mt-1 text-sm text-slate-500">All the tools you need in one powerful system — designed for Zambian businesses, consultants and organisations.</p></div><a href="#screens" className="hidden text-sm font-bold text-emerald-700 sm:block">Explore all modules →</a></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{modules.map(([name,sub,Icon])=><div key={name} className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_6px_24px_rgba(15,23,42,.06)] transition hover:-translate-y-1 hover:border-emerald-200"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white"><Icon className="h-5 w-5"/></div><div className="mt-3 text-xs font-extrabold">{name}</div><div className="mt-1 text-[9px] leading-4 text-slate-500">{sub}</div></div>)}</div></div></section>;
}

function IndustryGrid() {
  return <section id="industries" className="bg-slate-50 py-12"><div className="mx-auto max-w-[1450px] px-5 sm:px-8"><div className="mb-6 flex items-end justify-between"><div><h2 className="text-3xl font-black tracking-tight">Solutions for Every Industry</h2><p className="mt-1 text-sm text-slate-500">One connected platform with specialised workspaces.</p></div><span className="hidden text-sm font-bold text-emerald-700 sm:block">Built for real businesses in Zambia →</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{industries.map(([name,sub,Icon])=><div key={name} className="relative min-h-[118px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-600 p-4 text-white shadow-lg"><div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-300/20"/><Icon className="relative h-7 w-7 text-amber-300"/><div className="relative mt-6 text-xs font-extrabold">{name}</div><div className="relative mt-1 text-[9px] text-emerald-50/75">{sub}</div></div>)}</div></div></section>;
}

function Compliance() {
  const items = ["ZRA Smart Invoice & VAT Returns", "PAYE Calculations & Submissions", "NAPSA Contributions", "NHIMA Contributions", "Employee Tax Certificates (TP10)", "Compliance Reports & Audit Trail"];
  return <section id="compliance" className="bg-white py-14 sm:py-20"><div className="mx-auto grid max-w-[1450px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr]"><div><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Stay compliant in Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Compliance without the paperwork maze.</h2><p className="mt-4 max-w-xl text-base leading-7 text-slate-600">Keep statutory workflows visible in the same system as accounting, payroll and sales.</p><ul className="mt-6 space-y-3">{items.map(x=><li key={x} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600"/>{x}</li>)}</ul></div><ComplianceMockup/></div></section>;
}

function ComplianceMockup() {
  return <div className="relative rounded-[30px] border border-slate-200 bg-slate-50 p-4 shadow-[0_25px_80px_rgba(15,23,42,.12)]"><div className="absolute -top-5 right-6 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-lg">✓ ZRA Smart Invoice Ready</div><div className="grid gap-3 md:grid-cols-[1fr_220px]"><div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between border-b pb-3"><div className="text-sm font-black">Sales Invoice</div><div className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[9px] font-bold text-white">Submit to ZRA</div></div><div className="mt-4 grid grid-cols-2 gap-3 text-[9px]"><span>Customer<br/><b>ABC Supplies Ltd</b></span><span>Invoice Date<br/><b>25 Sep 2026</b></span><span>Invoice No.<br/><b>INV-00045</b></span><span>Branch<br/><b>Ndola</b></span></div><div className="mt-4 overflow-hidden rounded-lg border"><div className="grid grid-cols-4 bg-slate-50 p-2 text-[8px] font-bold"><span>Item</span><span>Qty</span><span>VAT</span><span>Total</span></div>{["Maize Meal","Cooking Oil","Sugar"].map((x,i)=><div key={x} className="grid grid-cols-4 border-t p-2 text-[8px]"><span>{x}</span><span>{[12,5,8][i]}</span><span>16%</span><b>{["1,392","1,450","1,670"][i]}</b></div>)}</div><div className="mt-3 text-right text-sm font-black">ZMW 4,524.00</div></div><div className="rounded-2xl border bg-white p-5"><div className="text-[9px] font-black">ZRA SMART INVOICE</div><div className="mt-4 grid h-36 place-items-center rounded-lg border-2 border-dashed text-xs font-black text-slate-400">QR CODE</div><div className="mt-3 text-[8px] text-slate-500">Fiscal reference and receipt data appear here after a successful ZRA response.</div></div></div><div className="mt-4 grid grid-cols-3 gap-3">{[["ZRA","Smart Invoice"],["NAPSA","Contributions"],["NHIMA","Contributions"]].map(x=><div key={x[0]} className="rounded-xl border bg-white p-3 text-center"><div className="text-lg font-black text-emerald-800">{x[0]}</div><div className="text-[8px] text-slate-500">{x[1]}</div></div>)}</div></div>;
}

function Screens() {
  return <section id="screens" className="bg-slate-50 py-14 sm:py-20"><div className="mx-auto max-w-[1450px] px-5 sm:px-8"><div className="mb-7"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">See SifoBooks in action</div><h2 className="mt-2 text-4xl font-black tracking-tight">Modern screens for real business operations.</h2><p className="mt-2 text-sm text-slate-500">Clean workflows for cashiers, restaurant teams, payroll officers and accountants.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><PosScreen/><RestaurantScreen/><PayrollScreen/><ReportsScreen/></div></div></section>;
}

function ScreenFrame({ children, title, sub }: any) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,.09)]"><div className="flex items-center gap-2 border-b bg-white px-3 py-2"><span className="h-2 w-2 rounded-full bg-red-300"/><span className="h-2 w-2 rounded-full bg-amber-300"/><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="ml-auto text-[8px] font-bold text-slate-400">{title}</span></div><div className="min-h-[215px] bg-slate-50 p-3">{children}</div><div className="border-t bg-white p-3"><div className="text-sm font-black">{title}</div><div className="mt-1 text-[10px] text-slate-500">{sub}</div></div></div>;
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
  return <section className="relative overflow-hidden bg-[#003b32] py-16 text-white sm:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_100%,rgba(22,163,74,.35),transparent_35%)]"/><div className="relative mx-auto grid max-w-[1400px] gap-8 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-emerald-300/20 bg-emerald-950/45 p-7"><div className="text-amber-300">★★★★★</div><p className="mt-4 text-lg font-semibold leading-7">“SifoBooks brings our sales, stock, payroll and accounts together in one place.”</p><div className="mt-5 text-xs text-emerald-100/70">SifoBooks customer · Zambia</div></div><div className="flex flex-col justify-center"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-amber-300">Built for Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Everything your business needs. One connected system.</h2><p className="mt-4 max-w-xl text-emerald-50/80">Start with accounting, POS, payroll or inventory and add the modules your business needs as you grow.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/auth" search={{tab:"signup"}} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950">Start Free Trial <ArrowRight className="h-4 w-4"/></Link><a href="mailto:sales@sifobooks.com" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3.5 text-sm font-bold">Contact Sales</a></div></div></div></section>;
}

function Footer() {
  return <footer className="bg-[#002c26] py-10 text-white"><div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between"><div><div className="text-xl font-black">SifoBooks</div><div className="mt-1 text-xs text-emerald-100/60">Accounting · POS · ERP · Zambia</div></div><div className="flex flex-wrap gap-5 text-xs font-semibold text-emerald-100/70"><a href="#features">Features</a><a href="#industries">Industries</a><a href="#compliance">Compliance</a><a href="#screens">Screens</a><Link to="/auth">Sign in</Link></div><div className="text-xs text-emerald-100/50">© {new Date().getFullYear()} SifoBooks</div></div></footer>;
}
