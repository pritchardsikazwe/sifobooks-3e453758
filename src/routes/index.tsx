import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle2, ShieldCheck, Zap, BarChart3, Wallet,
  FileText, ReceiptText, Boxes, Landmark, Banknote, Building2,
  Phone, Mail, MessageCircle, GraduationCap, Quote, PlayCircle, Star, HelpCircle,
} from "lucide-react";
import logo from "@/assets/sifobooks-logo.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Zambian Accounting Software | Payroll, VAT, PAYE, NAPSA" },
      { name: "description", content: "Zambia's modern accounting & payroll ERP. VAT invoicing, ZRA compliance, PAYE/NAPSA/NHIMA payroll, bank reconciliation, IFRS-for-SME reports. Built for Zambian businesses." },
      { name: "keywords", content: "accounting software Zambia, payroll Zambia, ZRA VAT software, PAYE calculator Zambia, NAPSA payroll, IFRS SME Zambia, SifoBooks, best accounting software Zambia" },
      { property: "og:title", content: "SifoBooks — Zambian Accounting & Payroll ERP" },
      { property: "og:description", content: "VAT invoicing, PAYE/NAPSA/NHIMA payroll, ZRA compliance and IFRS-for-SME reports — built for Zambia." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sifobooks.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SifoBooks — Zambian Accounting & Payroll ERP" },
      { name: "twitter:description", content: "Zambia-focused accounting, payroll and compliance in one platform." },
    ],
    links: [{ rel: "canonical", href: "https://sifobooks.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SifoBooks",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: "Zambian accounting, payroll and compliance ERP.",
          url: "https://sifobooks.com/",
          offers: { "@type": "Offer", price: "0", priceCurrency: "ZMW", description: "14-day free trial" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "42" },
          publisher: {
            "@type": "Organization",
            name: "Sifonet Technologies",
            url: "https://sifobooks.com/",
            address: { "@type": "PostalAddress", addressCountry: "ZM", addressLocality: "Lusaka" },
          },
        }),
      },
    ],
  }),
  component: Landing,
});


const WHATSAPP = "260777204440";
const PHONE = "+260777204440";
const EMAIL = "sifonettechnologies@gmail.com";

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} transition-all duration-700 ${className}`}
    >
      {children}
    </div>
  );
}

function Landing() {
  const heading = { fontFamily: "Outfit, sans-serif" } as const;
  const body = { fontFamily: "Figtree, sans-serif" } as const;
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);


  return (
    <div className="min-h-screen bg-[#06110c] text-slate-200 selection:bg-[#0e8f4a]/40 selection:text-white" style={body}>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#06110c]/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo} alt="SifoBooks" className="h-8 w-8 object-contain transition-transform group-hover:scale-110" width={32} height={32} />
            <span className="text-xl font-bold tracking-tight text-white" style={heading}>SifoBooks</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#modules" className="hover:text-[#0e8f4a] transition-colors">Modules</a>
            <a href="#features" className="hover:text-[#0e8f4a] transition-colors">Features</a>
            <a href="#compliance" className="hover:text-[#0e8f4a] transition-colors">Compliance</a>
            <a href="#contact" className="hover:text-[#0e8f4a] transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Link
                to="/dashboard"
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-[#0e8f4a] text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_-5px_rgba(14,143,74,0.8)]"
              >
                Open Dashboard
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-[#0e8f4a] text-white rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_-5px_rgba(14,143,74,0.8)]"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </>
            )}
          </div>
        </nav>
        {/* Zambian flag stripe */}
        <div aria-hidden className="h-1 w-full flex">
          <span className="flex-1 bg-[#0e8f4a]" />
          <span className="flex-1 bg-[#d21034]" />
          <span className="flex-1 bg-[#000000]" />
          <span className="flex-1 bg-[#f39200]" />
        </div>
      </header>



      {/* HERO — split screen */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#0e8f4a]/20 blur-[120px]" />
        <div className="absolute top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#f39200]/15 blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <Reveal className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0f3a24] border border-[#0e8f4a]/30 text-[#7dd3a5] text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0e8f4a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0e8f4a]" />
              </span>
              Zambia-focused · Aligned with IFRS-for-SMEs · Configurable statutory rules
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-white tracking-tight" style={heading}>
              A Finance Operating System{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0e8f4a] via-[#f39200] to-[#d21034]">
                built for Zambia.
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              Accounting engine, reporting engine, compliance centre, audit trail and in-app training — one system for owners, bookkeepers, accountants, finance managers and auditors.
              Aligned with applicable financial reporting frameworks and configurable Zambian statutory rules (PAYE, NAPSA, NHIMA, WCF, SDL, VAT, TOT, WHT).
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-[#0e8f4a] text-white rounded-xl font-bold transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_35px_-5px_#0e8f4a]"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP}?text=Hi%20SifoBooks%2C%20I%27d%20like%20a%20demo.`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-[#0d1f16] text-white border border-white/10 rounded-xl font-bold hover:bg-[#0f3a24] hover:border-[#0e8f4a]/40 transition-all duration-300"
              >
                <MessageCircle className="w-5 h-5 text-[#0e8f4a] transition-transform duration-300 group-hover:scale-110" />
                Chat on WhatsApp
              </a>
            </div>
          </Reveal>

          <Reveal delay={120} className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-[#0e8f4a]/30 to-transparent blur-3xl opacity-70" />
            <div className="relative bg-[#0d1f16] rounded-3xl border border-white/10 p-2 shadow-2xl">
              <div className="bg-[#06110c] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-white/10 rounded-full" />
                    <div className="h-2.5 w-20 bg-white/5 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5" />
                    <div className="w-8 h-8 rounded-full bg-[#0e8f4a]/30 border border-[#0e8f4a]/30" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-gradient-to-br from-[#0f3a24]/60 to-[#0e8f4a]/10 border border-[#0e8f4a]/20 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-lg bg-[#0e8f4a]/40 mb-3 grid place-items-center">
                      <ReceiptText className="w-5 h-5 text-white" />
                    </div>
                    <div className="h-3 w-full bg-white/10 rounded mb-2" />
                    <div className="h-3 w-2/3 bg-white/5 rounded" />
                  </div>
                  <div className="h-32 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 mb-3 grid place-items-center">
                      <BarChart3 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="h-3 w-full bg-white/10 rounded mb-2" />
                    <div className="h-3 w-2/3 bg-white/5 rounded" />
                  </div>
                  <div className="col-span-2 h-24 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-end gap-2">
                    {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-[#0e8f4a]/70 to-[#d21034]/70"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MODULES — 2026 colour-coded grid, mirrors the in-app module identity system */}
      <section id="modules" className="max-w-7xl mx-auto px-6 py-24">
        <Reveal className="mb-12 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-[#7dd3a5] mb-3">Everything in one place</div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight" style={heading}>
            Nine departments. One clean ledger.
          </h2>
          <p className="mt-4 text-slate-400">
            Every module carries its own colour inside SifoBooks, so you always know exactly which part of the business you are working in.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Accounting", hex: "#15803D", icon: Wallet, desc: "Chart of accounts, journals, cashbook, general ledger and period close.", span: "lg:col-span-2" },
            { name: "Sales", hex: "#0D9488", icon: ReceiptText, desc: "Quotes, VAT invoices, receipts, credit notes and customer statements." },
            { name: "Purchases", hex: "#EA580C", icon: FileText, desc: "Purchase orders, supplier bills, payments and expense capture." },
            { name: "Inventory", hex: "#CA8A04", icon: Boxes, desc: "Stock items, warehouses, adjustments, counts and valuation." },
            { name: "Banking", hex: "#2563EB", icon: Landmark, desc: "Statement import, smart matching, allocations and reconciliation." },
            { name: "Payroll & HR", hex: "#7C3AED", icon: Banknote, desc: "PAYE, NAPSA, NHIMA, WCF & SDL with branded payslips.", span: "lg:col-span-2" },
            { name: "Reports", hex: "#4F46E5", icon: BarChart3, desc: "P&L, balance sheet, cash flow, IFRS-for-SME annual statements." },
            { name: "Compliance", hex: "#DC2626", icon: ShieldCheck, desc: "ZRA calendar, VAT, turnover tax, WHT and statutory returns." },
          ].map((m, i) => (
            <Reveal key={m.name} delay={i * 50} className={m.span ?? ""}>
              <div
                className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-[#0d1f16] p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ ["--hue" as any]: m.hex }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ background: m.hex }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
                  style={{ background: m.hex }}
                />
                <div
                  className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${m.hex}22`, borderColor: `${m.hex}55`, color: m.hex }}
                >
                  <m.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white" style={heading}>{m.name}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>


      {/* FEATURES strip */}
      <section id="features" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "Automatic posting", desc: "Every invoice, bill and receipt flows straight into the GL — no manual journals." },
            { icon: ShieldCheck, title: "Bank-grade security", desc: "Row-level security, full audit trail, and role-based access on every record." },
            { icon: Building2, title: "Multi-company", desc: "Run all your entities from one login — switch companies without signing out." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="h-full bg-[#0d1f16] border border-white/10 rounded-2xl p-6 hover:border-[#0e8f4a]/40 hover:-translate-y-1 transition-all duration-300">
                <div className="w-11 h-11 bg-[#0e8f4a]/15 border border-[#0e8f4a]/30 rounded-xl grid place-items-center mb-4">
                  <f.icon className="w-5 h-5 text-[#7dd3a5]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5" style={heading}>{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* COMPLIANCE strip */}
      <div id="compliance" className="border-y border-white/5 bg-[#06110c]">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0e8f4a]/15 border border-[#0e8f4a]/30 grid place-items-center">
              <span className="font-bold text-[#7dd3a5] text-xs">ZRA</span>
            </div>
            <span className="text-sm font-semibold tracking-widest text-slate-300 uppercase">Officially ZRA Compliant</span>
          </div>
          <div className="hidden lg:block h-px flex-1 bg-white/5 mx-4" />
          <div className="flex flex-wrap items-center gap-2">
            {["VAT", "TPIN", "PAYE", "NAPSA", "NHIMA", "Turnover Tax", "WHT"].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-[#0e8f4a]/40 hover:text-white transition-colors">
                <CheckCircle2 className="w-3 h-3 text-[#0e8f4a]" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* LEARN & RESOURCES */}
      <section id="learn" className="max-w-7xl mx-auto px-6 py-24">
        <Reveal className="mb-12 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-[#7dd3a5] mb-3 inline-flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5" /> SifoBooks Academy
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight" style={heading}>
            Learn accounting the Zambian way.
          </h2>
          <p className="mt-4 text-slate-400">
            Short, practical guides written for owners, bookkeepers and accountants. Real ZMW examples, real statutory rates — no jargon.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Quick Start (10 min)", desc: "Company setup → chart of accounts → first invoice → first report.", href: signedIn ? "/learn/quick-start" : "/auth", tag: "Beginner" },
            { title: "Zambian Payroll", desc: "2026 PAYE bands, NAPSA, NHIMA, WCF & SDL — worked examples in ZMW.", href: signedIn ? "/learn/payroll" : "/auth", tag: "Intermediate" },
            { title: "VAT & ZRA Compliance", desc: "Standard, zero-rated, exempt and TOT — plus the filing calendar.", href: signedIn ? "/learn/vat-zra" : "/auth", tag: "Intermediate" },
            { title: "Bank Reconciliation", desc: "Import statements, rules, splits and formal reconciliation sessions.", href: signedIn ? "/learn/bank-reconciliation" : "/auth", tag: "Beginner" },
            { title: "Reading Reports", desc: "P&L, Balance Sheet, TB and Cash Flow — what each really tells you.", href: signedIn ? "/learn/reports" : "/auth", tag: "Intermediate" },
            { title: "Accounting Basics", desc: "Debits, credits, double-entry and the Zambian statutory framework.", href: signedIn ? "/learn/accounting-basics" : "/auth", tag: "Beginner" },
          ].map((t, i) => (
            <Reveal key={t.title} delay={i * 60}>
              <Link
                to={t.href}
                className="group block h-full bg-[#0d1f16] border border-white/10 rounded-2xl p-6 hover:border-[#0e8f4a]/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#0e8f4a]/15 border border-[#0e8f4a]/30 grid place-items-center">
                    <PlayCircle className="w-5 h-5 text-[#7dd3a5]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-white/10 rounded-full px-2 py-1">{t.tag}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5" style={heading}>{t.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{t.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7dd3a5] group-hover:gap-2.5 transition-all">
                  {signedIn ? "Open lesson" : "Start free to unlock"} <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <Reveal className="mb-12 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-[#7dd3a5] mb-3">What operators say</div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight" style={heading}>
            Trusted by Zambian teams.
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Mwansa K.", role: "Finance Manager · Mining Services", body: "We closed month-end in four days instead of two weeks. The bank rules alone paid for the year." },
            { name: "Chola B.", role: "Owner · Retail & Distribution", body: "Payroll used to be a nightmare. PAYE, NAPSA and NHIMA now run in one click and the ZRA schedule is ready to file." },
            { name: "Natasha M.", role: "Bookkeeper · NGO", body: "Grant tracking with fund sources and cost centres is the reason we picked SifoBooks. Reports are audit-ready." },
          ].map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div className="h-full bg-[#0d1f16] border border-white/10 rounded-2xl p-6 hover:border-[#0e8f4a]/40 transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-4 h-4 fill-[#f39200] text-[#f39200]" />)}
                </div>
                <Quote className="w-6 h-6 text-[#0e8f4a]/40 mb-3" />
                <p className="text-slate-300 leading-relaxed">{t.body}</p>
                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="text-sm font-bold text-white" style={heading}>{t.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.role}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <Reveal className="text-center mb-10">
          <div className="text-xs font-bold uppercase tracking-widest text-[#7dd3a5] mb-3 inline-flex items-center gap-2 justify-center">
            <HelpCircle className="w-3.5 h-3.5" /> Answers
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight" style={heading}>Frequently asked</h2>
        </Reveal>
        <div className="space-y-3">
          {[
            { q: "Do I need an accountant to use SifoBooks?", a: "No. SifoBooks posts every invoice, receipt, bill and bank allocation to the correct GL accounts automatically. You just classify — we handle the debits and credits." },
            { q: "Is it Zambia-compliant out of the box?", a: "Yes. TPIN & VAT on documents, PAYE 2026 bands, NAPSA & NHIMA caps, WCF (1.5%) and SDL (0.5%) are shipped. Rates are configurable per financial year." },
            { q: "Can I run multiple companies?", a: "Yes — one login, unlimited companies. Every module respects the active company and role-based permissions per user." },
            { q: "Does it work offline?", a: "Yes. Invoices, receipts, expenses and CRUD forms queue on your device and sync automatically when you're back online." },
            { q: "How does pricing work?", a: "Start free for 14 days, no credit card. After that, pick a plan that fits your team size and modules." },
            { q: "Can I import from Excel / QuickBooks / Sage?", a: "Yes — CSV/Excel imports for customers, suppliers, inventory, journals and bank statements. Use the Opening Balances wizard for balances." },
          ].map((f, i) => (
            <Reveal key={f.q} delay={i * 40}>
              <details className="group rounded-2xl border border-white/10 bg-[#0d1f16] p-5 open:bg-[#0f3a24]/40 open:border-[#0e8f4a]/30 transition-colors">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-bold text-white" style={heading}>{f.q}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-slate-400 leading-relaxed">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="max-w-7xl mx-auto px-6 py-24">
        <Reveal className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-[#7dd3a5] mb-3">Talk to us</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight" style={heading}>We're one message away.</h2>
          <p className="mt-4 text-slate-400">Real humans. Same-day replies. In Lusaka, serving all of Zambia.</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { href: `https://wa.me/${WHATSAPP}`, icon: MessageCircle, label: "WhatsApp", value: PHONE, sub: "Fastest replies · Mon–Sat", external: true },
            { href: `tel:${PHONE}`, icon: Phone, label: "Phone", value: PHONE, sub: "Call our support desk", external: false },
            { href: `mailto:${EMAIL}`, icon: Mail, label: "Email", value: EMAIL, sub: "Sales & billing", external: false },
          ].map((c, i) => (
            <Reveal key={c.label} delay={i * 80}>
              <a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group block h-full bg-[#0d1f16] border border-white/10 rounded-2xl p-6 hover:border-[#0e8f4a]/50 hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_#0e8f4a] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[#0e8f4a]/15 border border-[#0e8f4a]/30 grid place-items-center mb-4 group-hover:bg-[#0e8f4a] group-hover:border-[#0e8f4a] transition-colors">
                  <c.icon className="w-5 h-5 text-[#7dd3a5] group-hover:text-white transition-colors" />
                </div>
                <div className="text-lg font-bold text-white" style={heading}>{c.label}</div>
                <div className="text-sm font-medium text-[#7dd3a5] mt-1 break-all">{c.value}</div>
                <div className="text-xs text-slate-500 mt-2">{c.sub}</div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <Reveal className="relative bg-gradient-to-r from-[#0f3a24] via-[#0a6d3a] to-[#0e8f4a] rounded-[2.5rem] p-12 md:p-20 overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight" style={heading}>
              Ready to streamline your accounting?
            </h2>
            <p className="text-lg text-white/80 mb-10 leading-relaxed">
              Join the fastest-growing businesses in Zambia. No credit card required — start your 14-day free trial today.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#06110c] rounded-xl font-bold transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)]"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP}?text=Hi%20SifoBooks%2C%20talk%20to%20sales.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-transparent border border-white/30 text-white rounded-xl font-bold hover:bg-white/10 hover:border-white transition-all"
              >
                Talk to Sales
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SifoBooks" className="h-6 w-6 object-contain" width={24} height={24} />
            <span className="font-bold text-white" style={heading}>SifoBooks</span>
            <span>© {new Date().getFullYear()} · Accounting ERP</span>
          </div>
          <div className="flex gap-6 font-medium">
            <a href={`tel:${PHONE}`} className="hover:text-[#7dd3a5] transition-colors">{PHONE}</a>
            <a href={`mailto:${EMAIL}`} className="hover:text-[#7dd3a5] transition-colors break-all">{EMAIL}</a>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP */}
      <a
        href={`https://wa.me/${WHATSAPP}?text=Hi%20SifoBooks%20support%2C%20I%20need%20help.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp support"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#25D366] shadow-2xl grid place-items-center hover:scale-110 transition-transform"
        style={{ boxShadow: "0 10px 30px -5px rgba(37, 211, 102, 0.6)" }}
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        <MessageCircle className="h-7 w-7 text-white relative" />
      </a>
    </div>
  );
}
