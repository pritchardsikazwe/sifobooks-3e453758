import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SifoMark, SifoWordmark, Eyebrow, SectionHead } from "@/components/landing/SifoBrand";
import {
  SifoFeatureGrid, SifoHero, SifoProductTabs, SifoTrust,
} from "@/components/landing/SifoLandingShowcase";
import { SifoIndustryRegistration } from "@/components/landing/SifoIndustryRegistration";
import { SifoPayrollProduct } from "@/components/landing/SifoPayrollProduct";

const NAV = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Payroll", href: "#payroll" },
  { label: "Industries", href: "#industries" },
  { label: "Features", href: "#features" },
  { label: "Compliance", href: "#compliance" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
];

export function SifoLandingHome() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-sifo-ink font-sans text-white">
      <SiteHeader />
      <SifoHero />
      <LogoBand />
      <SifoProductTabs />
      <div id="solutions"><SifoFeatureGrid /></div>
      <SifoPayrollProduct />
      <SifoIndustryRegistration />
      <div id="compliance"><SifoTrust /></div>
      <Pricing />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

/* ── header ───────────────────────────────────────────────────── */

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-sifo-line/70 bg-sifo-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 sm:px-6">
        <Link to="/" aria-label="SifoBooks home" className="shrink-0">
          <SifoWordmark />
        </Link>

        <nav aria-label="Main" className="ml-4 hidden flex-1 items-center gap-0.5 xl:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-sifo-haze transition-colors hover:bg-white/5 hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/demo" className="sifo-btn sifo-btn-quiet hidden !px-3 !py-2 lg:inline-flex">Demos</Link>
          <Link to="/auth" search={{ tab: "signin" }} className="sifo-btn sifo-btn-ghost !px-4 !py-2">Sign in</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="sifo-btn sifo-btn-primary !px-4 !py-2">Start free</Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button aria-label="Open menu" className="sifo-btn sifo-btn-ghost !px-2.5 !py-2 xl:hidden">
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[19rem] border-sifo-line bg-sifo-ink p-0 text-white">
              <SheetTitle className="sr-only">SifoBooks navigation</SheetTitle>
              <div className="flex items-center justify-between border-b border-sifo-line/70 px-5 py-4">
                <SifoWordmark />
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-sifo-haze hover:bg-white/5 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col p-3">
                {NAV.map((n) => (
                  <a key={n.label} href={n.href} onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-semibold text-sifo-haze transition-colors hover:bg-white/5 hover:text-white">
                    {n.label}
                  </a>
                ))}
              </nav>
              <div className="space-y-2 border-t border-sifo-line/70 p-4">
                <Link to="/demo" onClick={() => setOpen(false)} className="sifo-btn sifo-btn-ghost w-full">See a demo</Link>
                <Link to="/auth" search={{ tab: "signin" }} onClick={() => setOpen(false)} className="sifo-btn sifo-btn-ghost w-full">Sign in</Link>
                <Link to="/auth" search={{ tab: "signup" }} onClick={() => setOpen(false)} className="sifo-btn sifo-btn-primary w-full">Start free</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/* ── capability band ──────────────────────────────────────────── */

function LogoBand() {
  const items = ["Accounting", "Point of sale", "Inventory", "Payroll & HR", "Banking", "Purchasing", "Fixed assets", "Compliance"];
  return (
    <div className="border-y border-sifo-line/60 bg-sifo-ink-2/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-5 py-4 sm:px-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-sifo-copper">In the box</span>
        {items.map((i) => (
          <span key={i} className="text-[12px] font-semibold text-sifo-haze/80">{i}</span>
        ))}
      </div>
    </div>
  );
}

/* ── pricing ──────────────────────────────────────────────────── */

function Pricing() {
  const tiers = [
    { name: "Starter", who: "Single shop or office finding its feet.", has: ["One company, one branch", "Accounting, sales, purchases", "Point of sale and stock", "Standard reports"], cta: "Start free", accent: false },
    { name: "Business", who: "Growing operations with staff and stores.", has: ["Multiple branches and warehouses", "Payroll, HR and approvals", "Bank reconciliation", "Full report pack and exports"], cta: "Start free", accent: true },
    { name: "Payroll only", who: "Pay staff properly without buying the whole system.", has: ["Employees, grades and pay components", "Gross-to-net runs, review and approval", "Payslips and payment batches", "PAYE, NAPSA and NHIMA returns"], cta: "Start with Payroll", accent: false },
    { name: "Industry", who: "Hotels, restaurants, schools and mining.", has: ["Everything in Business", "Industry workspace of your choice", "Compliance and licence register", "Smart Invoice queue setup"], cta: "Talk to us", accent: false },
  ];
  return (
    <section id="pricing" className="relative border-t border-sifo-line/60 bg-sifo-ink py-16 sifo-edge md:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHead
          eyebrow="Pricing"
          align="center"
          title="Pay for the shape of your business"
          lede="Pricing scales with companies, users and the modules you switch on. Tell us your setup and we will quote it in kwacha — no per-feature surprises."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.name} className={`relative rounded-2xl border p-6 ${t.accent ? "border-sifo-mint/35 bg-sifo-mint/6" : "border-sifo-line/70 bg-sifo-ink-2"}`}>
              {t.accent ? <span className="absolute -top-2.5 left-6 rounded-full bg-sifo-green px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Most chosen</span> : null}
              <h3 className="font-display text-lg font-bold tracking-tight text-white">{t.name}</h3>
              <p className="mt-1.5 text-[13px] leading-6 text-sifo-haze">{t.who}</p>
              <ul className="mt-4 space-y-2">
                {t.has.map((h) => (
                  <li key={h} className="flex gap-2 text-[13px] font-medium text-white/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sifo-mint" /> {h}
                  </li>
                ))}
              </ul>
              {t.name === "Payroll only" ? (
                <div className="mt-4 rounded-lg border border-sifo-line/70 bg-sifo-ink px-3 py-2 text-[12px] leading-5 text-sifo-haze">
                  Upgrade to full SifoBooks at any time — payroll history carries over.
                </div>
              ) : null}
              {t.cta === "Talk to us"
                ? <a href="#contact" className="sifo-btn sifo-btn-ghost mt-6 w-full">{t.cta}</a>
                : <Link to="/auth" search={{ tab: "signup" }} className={`sifo-btn mt-6 w-full ${t.accent ? "sifo-btn-primary" : "sifo-btn-ghost"}`}>{t.cta}</Link>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── final CTA ────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section id="contact" className="relative overflow-hidden border-t border-sifo-line/60 bg-sifo-ink-2 py-16 sifo-grain md:py-24">
      <div className="pointer-events-none absolute inset-0 sifo-ledger opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60rem 24rem at 50% 110%, rgba(18,165,87,.2), transparent 65%)" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-6">
        <Eyebrow tone="copper">Get started</Eyebrow>
        <h2 className="mt-5 font-display text-3xl font-bold leading-[1.05] tracking-[-0.035em] text-white md:text-5xl">
          Put the whole business on one set of books.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-sifo-haze">
          Create your company, invite your team and start posting. Explore the demos first if you would rather look
          around before signing up.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ tab: "signup" }} className="sifo-btn sifo-btn-primary">Start free <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/demo" className="sifo-btn sifo-btn-ghost">See a demo</Link>
          <Link to="/auth" search={{ tab: "signin" }} className="sifo-btn sifo-btn-quiet">Sign in</Link>
        </div>
      </div>
    </section>
  );
}

/* ── footer ───────────────────────────────────────────────────── */

function SiteFooter() {
  const groups: { title: string; links: { label: string; href?: string; to?: string }[] }[] = [
    { title: "Product", links: [{ label: "Platform overview", href: "#platform" }, { label: "Point of sale", href: "#platform" }, { label: "Accounting", href: "#platform" }, { label: "Inventory", href: "#platform" }, { label: "Payroll & HR", href: "#solutions" }] },
    { title: "Industries", links: [{ label: "SifoHotel", href: "#industries" }, { label: "SifoRestaurant", href: "#industries" }, { label: "SifoSchool", href: "#industries" }, { label: "SifoMining", href: "#industries" }] },
    { title: "Company", links: [{ label: "Pricing", href: "#pricing" }, { label: "Contact", href: "#contact" }, { label: "Demos", to: "/demo" }] },
    { title: "Support", links: [{ label: "Sign in", to: "/auth" }, { label: "Compliance notes", href: "#compliance" }, { label: "Get in touch", href: "#contact" }] },
  ];
  return (
    <footer id="resources" className="border-t border-sifo-line/70 bg-sifo-ink">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div>
            <SifoWordmark sub="Business management platform" />
            <p className="mt-4 max-w-sm text-[13px] leading-6 text-sifo-haze">
              One connected workspace for accounting, operations and Zambian statutory compliance — from the first sale
              to the signed-off financial statements.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sifo-copper">{g.title}</p>
                <ul className="mt-3 space-y-2">
                  {g.links.map((l) => (
                    <li key={l.label}>
                      {l.to
                        ? <Link to={l.to} className="text-[13px] font-medium text-sifo-haze transition-colors hover:text-white">{l.label}</Link>
                        : <a href={l.href} className="text-[13px] font-medium text-sifo-haze transition-colors hover:text-white">{l.label}</a>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-sifo-line/70 bg-sifo-ink-2/60 p-4 text-[11.5px] leading-6 text-sifo-haze/85">
          Product screens on this page are previews with illustrative figures — no customer or company data is shown.
          SifoBooks supports ZRA Smart Invoice submission using credentials issued to your own business; certification of
          that connection is granted by ZRA, not by SifoBooks.
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-sifo-line/70 pt-6 sm:flex-row sm:items-center">
          <p className="text-[12px] text-sifo-haze/70">© {new Date().getFullYear()} SifoBooks. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-sifo-haze/70">
            <a href="#contact" className="transition-colors hover:text-white">Terms</a>
            <a href="#contact" className="transition-colors hover:text-white">Privacy</a>
            <a href="#contact" className="transition-colors hover:text-white">Data protection</a>
            <span className="inline-flex items-center gap-1.5"><SifoMark className="h-4 w-4" /> Lusaka, Zambia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
