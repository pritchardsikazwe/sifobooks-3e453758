import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Building2, CheckCircle2, GraduationCap, Hotel, Package, ReceiptText, ShieldCheck, ShoppingCart, Smartphone, Utensils, WalletCards, Wifi, Zap } from "lucide-react";

const industries = [
  { name: "Retail & POS", sub: "Shops & supermarkets", icon: ShoppingCart },
  { name: "Restaurant", sub: "Cafés & bars", icon: Utensils },
  { name: "Hotel", sub: "Accommodation", icon: Hotel },
  { name: "School", sub: "Education institutions", icon: GraduationCap },
  { name: "Property", sub: "Rentals & estates", icon: Building2 },
  { name: "Microfinance", sub: "SACCOs & lending", icon: WalletCards },
  { name: "Manufacturing", sub: "Production & inventory", icon: Package },
  { name: "Services", sub: "Agencies & SMEs", icon: Zap },
];

const features = [
  "Easy to use, modern interface",
  "Accurate financial reports",
  "ZRA Smart Invoice integration",
  "Multi-branch and multi-company",
  "Works online and offline",
  "Secure cloud backup and data sync",
];

export function SifoLandingHome() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white font-sans text-slate-950">
      <LandingHeader />
      <Hero />
      <IndustryStrip />
      <PowerSection />
      <TrustStats />
      <FinalCta />
      <Footer />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-sm">
            <span className="text-xl font-black">S</span>
          </div>
          <div className="leading-none">
            <div className="text-[20px] font-extrabold tracking-tight text-emerald-950">SifoBooks</div>
            <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Accounting · POS · ERP</div>
          </div>
        </Link>
        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex">
          {["Home", "Features", "Industries", "Pricing", "Resources", "Support"].map((item, i) => (
            <a key={item} href={i === 0 ? "#" : `#${item.toLowerCase()}`} className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-800 ${i === 0 ? "text-emerald-800" : "text-slate-600"}`}>
              {item}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth" search={{ tab: "signin" }} className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">Sign in</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#003b32] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(22,163,74,.38),transparent_34%),radial-gradient(circle_at_8%_100%,rgba(234,179,8,.14),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-[600px] max-w-[1400px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.82fr_1.18fr] lg:py-20">
        <div className="relative z-10 max-w-[620px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-100">
            🇿🇲 Built for Zambian Businesses
          </div>
          <h1 className="text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-6xl xl:text-[70px]">
            Accounting, POS &<br /><span className="text-amber-400">Business Management</span><br />Made Simple
          </h1>
          <p className="mt-6 max-w-[560px] text-base leading-7 text-emerald-50/85 sm:text-lg">
            SifoBooks helps you run your business, stay compliant with ZRA, and make smarter decisions — all in one powerful system.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-950/20 hover:bg-amber-300">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10">▶ Watch Demo</Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <HeroProof icon={ReceiptText} text="ZRA Smart Invoice Ready" />
            <HeroProof icon={Wifi} text="Works Online & Offline" />
            <HeroProof icon={Package} text="All-in-One Modules" />
            <HeroProof icon={ShieldCheck} text="Built for Zambia" />
          </div>
        </div>
        <DashboardMockup />
      </div>
    </section>
  );
}

function HeroProof({ icon: Icon, text }: any) {
  return <div className="flex items-center gap-2 text-[11px] font-semibold leading-4 text-emerald-50/85"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-900/60"><Icon className="h-4 w-4 text-amber-300" /></span>{text}</div>;
}

function DashboardMockup() {
  return (
    <div className="relative min-h-[410px] lg:min-h-[520px]">
      <div className="absolute right-[-8%] top-[6%] w-[105%] rotate-[-2deg] rounded-[28px] border border-white/30 bg-white p-2 shadow-[0_30px_90px_rgba(0,0,0,.4)]">
        <div className="overflow-hidden rounded-[21px] bg-slate-50">
          <div className="flex h-10 items-center gap-2 border-b bg-white px-4"><span className="h-2 w-2 rounded-full bg-red-400"/><span className="h-2 w-2 rounded-full bg-amber-400"/><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="ml-auto text-[8px] text-slate-400">SifoBooks Dashboard</span></div>
          <div className="grid grid-cols-[125px_1fr]">
            <div className="hidden bg-[#003b32] p-4 sm:block"><div className="mb-7 text-xs font-black text-white">SifoBooks</div>{["Dashboard","Sales","Purchases","Inventory","Accounting","Payroll","ZRA","Reports"].map((x,i)=><div key={x} className={`mb-1 rounded-md px-2 py-2 text-[8px] font-semibold ${i===0?"bg-emerald-500/20 text-white":"text-emerald-100/60"}`}>{x}</div>)}</div>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between"><div><div className="text-[9px] text-slate-400">Dashboard</div><div className="text-base font-black text-slate-900">Business Overview</div></div><div className="rounded-md border bg-white px-2 py-1 text-[8px]">01–30 Sep 2026</div></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Sales","ZMW 125,430","+12%"],["Purchases","ZMW 48,200","-5%"],["Profit","ZMW 46,890","+18%"],["VAT (ZRA)","ZMW 18,450","Synced"]].map(x=><div key={x[0]} className="rounded-xl border bg-white p-3 shadow-sm"><div className="text-[7px] text-slate-400">{x[0]}</div><div className="mt-1 text-sm font-black">{x[1]}</div><div className="mt-1 text-[7px] font-bold text-emerald-600">{x[2]}</div></div>)}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]"><div className="rounded-xl border bg-white p-3"><div className="mb-3 text-[8px] font-bold">Sales Performance</div><div className="flex h-36 items-end gap-2">{[32,45,38,58,52,70,62,83,92].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-600/80" style={{height:`${h}%`}}/>)}</div><div className="mt-2 flex justify-between text-[6px] text-slate-400">Jan Feb Mar Apr May Jun Jul Aug Sep</div></div><div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-bold">Business Summary</div><div className="mx-auto my-5 grid h-28 w-28 place-items-center rounded-full border-[18px] border-emerald-700 border-r-amber-400 border-b-slate-200"><div className="text-center"><div className="text-[7px] text-slate-400">Total</div><div className="text-[10px] font-black">125,430</div></div></div><div className="space-y-1 text-[7px] text-slate-500">Retail 45% · Restaurant 20% · Hotel 15%</div></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[-4%] left-[3%] z-20 w-[150px] rounded-[24px] border-4 border-white bg-[#063f35] p-3 shadow-2xl sm:w-[175px]">
        <div className="mb-3 flex items-center justify-between text-[8px] font-bold text-white"><span>SifoBooks</span><Smartphone className="h-3 w-3"/></div>
        <div className="rounded-xl bg-white p-3 text-slate-900"><div className="text-[7px] text-slate-400">Today's Sales</div><div className="mt-1 text-lg font-black">ZMW 12,450</div><div className="mt-1 text-[7px] font-bold text-emerald-600">+18%</div><div className="mt-4 grid grid-cols-2 gap-2">{["POS","Invoice","Inventory","Customers"].map(x=><div key={x} className="rounded-lg bg-slate-50 p-2 text-center text-[7px] font-bold">{x}</div>)}</div></div>
      </div>
    </div>
  );
}

function IndustryStrip() {
  return <section id="industries" className="bg-white py-10"><div className="mx-auto max-w-[1400px] px-5 sm:px-8"><div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-black tracking-tight">Solutions for Every Industry</h2><a href="#features" className="hidden text-sm font-bold text-emerald-700 sm:block">All modules work together in one system →</a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{industries.map(({name,sub,icon:Icon})=><div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_5px_20px_rgba(15,23,42,.06)] transition hover:-translate-y-1 hover:border-emerald-200"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5"/></div><div className="mt-3 text-xs font-extrabold">{name}</div><div className="mt-1 text-[9px] text-slate-500">{sub}</div></div>)}</div></div></section>;
}

function PowerSection() {
  return <section id="features" className="relative overflow-hidden bg-slate-50 py-16 sm:py-24"><div className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[.75fr_1.25fr]"><div><div className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Grow your business</div><h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Powerful Tools<br/>to Run and Grow</h2><p className="mt-5 max-w-xl text-base leading-7 text-slate-600">From accounting to inventory, payroll, POS and ZRA compliance — SifoBooks gives you everything you need to manage your business efficiently.</p><ul className="mt-6 space-y-3">{features.map(x=><li key={x} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600"/>{x}</li>)}</ul><div className="mt-8 flex flex-wrap gap-3"><a href="#features" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold">Explore Features <ArrowRight className="h-4 w-4"/></a><Link to="/auth" search={{tab:"signup"}} className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 px-5 py-3 text-sm font-bold text-emerald-800">Start Free</Link></div></div><InvoiceMockup/></div></section>;
}

function InvoiceMockup() {
  return <div className="relative"><div className="absolute -right-2 top-5 z-20 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800 shadow-lg">✓ ZRA Smart Invoice Ready</div><div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_25px_70px_rgba(15,23,42,.12)]"><div className="overflow-hidden rounded-[20px] border bg-slate-50"><div className="flex items-center justify-between border-b bg-white px-4 py-3"><div className="text-xs font-black">Sales Invoices</div><button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[9px] font-bold text-white">+ New Invoice</button></div><div className="p-4"><div className="mb-3 rounded-lg border bg-white px-3 py-2 text-[9px] text-slate-400">Search invoices...</div>{[["INV-00045","Mrs. Chanda","ZMW 12,450","Submitted"],["INV-00044","ABC Supplies Ltd","ZMW 8,700","Submitted"],["INV-00043","John Mwansa","ZMW 5,200","Pending"],["INV-00042","Zambezi Traders","ZMW 3,400","Submitted"],["INV-00041","Green Fields Ltd","ZMW 7,900","Pending"]].map(r=><div key={r[0]} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 border-b py-3 text-[9px]"><span className="font-bold">{r[0]}</span><span className="text-slate-500">{r[1]}</span><span className="font-bold">{r[2]}</span><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${r[3]==="Submitted"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{r[3]}</span></div>)}</div></div></div><div className="absolute -bottom-5 -left-5 rounded-2xl border bg-white p-3 shadow-xl"><div className="text-[8px] font-bold text-rose-500">⚠ Low Stock Alert</div><div className="mt-2 space-y-1 text-[8px] text-slate-600"><div>Cooking Oil <b className="ml-5">5 pcs</b></div><div>Maize Meal <b className="ml-5">8 pcs</b></div><div>Sugar <b className="ml-5">10 pcs</b></div></div></div><div className="absolute -right-5 bottom-12 hidden w-32 rounded-xl border bg-white p-2 shadow-xl sm:block"><div className="text-[7px] font-black">ZRA INVOICE</div><div className="mt-2 grid h-20 place-items-center border-2 border-slate-100 text-[9px] font-bold">QR</div></div></div>;
}

function TrustStats() {
  return <section className="bg-white py-5"><div className="mx-auto grid max-w-[1300px] grid-cols-2 divide-x divide-slate-200 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 shadow-sm sm:grid-cols-4">{[["500+","Active businesses"],["99.9%","Uptime & reliability"],["8+","Industry modules"],["🇿🇲","Built for Zambia"]].map(x=><div key={x[1]} className="px-4 text-center"><div className="text-2xl font-black text-emerald-800">{x[0]}</div><div className="mt-1 text-xs font-semibold text-slate-500">{x[1]}</div></div>)}</div></section>;
}

function FinalCta() {
  return <section className="relative overflow-hidden bg-[#003b32] py-16 text-white sm:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(22,163,74,.32),transparent_36%)]"/><div className="relative mx-auto grid max-w-[1300px] gap-8 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-emerald-300/20 bg-emerald-950/40 p-7"><div className="text-5xl">★★★★★</div><p className="mt-4 text-lg font-semibold leading-7">“SifoBooks puts our sales, stock and accounts in one place and makes the numbers much easier to understand.”</p><div className="mt-5 text-xs text-emerald-100/70">SifoBooks customer · Zambia</div></div><div className="flex flex-col justify-center"><div className="text-xs font-extrabold uppercase tracking-[.18em] text-amber-300">Built for Zambia</div><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Run your business with confidence.</h2><p className="mt-4 max-w-xl text-emerald-50/80">Start with accounting, POS or inventory and add the modules your business needs as you grow.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/auth" search={{tab:"signup"}} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-slate-950">Start Free Trial <ArrowRight className="h-4 w-4"/></Link><a href="mailto:sales@sifobooks.com" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-6 py-3.5 text-sm font-bold">Contact Sales</a></div></div></div></section>;
}

function Footer() {
  return <footer className="bg-[#002c26] py-10 text-white"><div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between"><div><div className="text-xl font-black">SifoBooks</div><div className="mt-1 text-xs text-emerald-100/60">Accounting · POS · ERP · Zambia</div></div><div className="flex flex-wrap gap-5 text-xs font-semibold text-emerald-100/70"><a href="#features">Features</a><a href="#industries">Industries</a><a href="#pricing">Pricing</a><Link to="/auth">Sign in</Link></div><div className="text-xs text-emerald-100/50">© {new Date().getFullYear()} SifoBooks</div></div></footer>;
}
