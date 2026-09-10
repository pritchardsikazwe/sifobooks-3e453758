import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CircleDollarSign, FileCheck2, Layers, PlayCircle, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, SectionHead } from "@/components/landing/SifoBrand";
import { AppWindow, SCREENS, SCREEN_ORDER, type ScreenKey } from "@/components/landing/ProductScreens";

/* ── Hero ─────────────────────────────────────────────────────── */

export function SifoHero() {
  return (
    <section className="relative isolate overflow-hidden bg-sifo-ink sifo-grain">
      {/* architectural depth: blueprint ruling, a copper horizon and a soft emerald wash */}
      <div className="pointer-events-none absolute inset-0 sifo-blueprint opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[46rem]"
        style={{ background: "radial-gradient(90rem 34rem at 12% -8%, rgba(18,165,87,.22), transparent 62%), radial-gradient(60rem 26rem at 92% 6%, rgba(200,122,60,.14), transparent 60%)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sifo-copper/45 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="sifo-reveal">
            <Eyebrow tone="copper">Built in Zambia for Zambian business</Eyebrow>
            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.1rem]">
              Business management,
              <span className="block text-sifo-mint">POS, accounting</span>
              and compliance — one platform.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-sifo-haze sm:text-lg sm:leading-8">
              SifoBooks runs the till, the stores, the payroll and the ledger on one record — so the figure a manager
              sees on the floor is the same figure the accountant files with ZRA.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth" search={{ tab: "signup" }} className="sifo-btn sifo-btn-primary">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#platform" className="sifo-btn sifo-btn-ghost">
                <Layers className="h-4 w-4" /> Explore platform
              </a>
              <Link to="/demo" className="sifo-btn sifo-btn-copper">
                <PlayCircle className="h-4 w-4" /> See demo
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 border-t border-sifo-line/70 pt-6 sm:grid-cols-4">
              {[["Multi-company", "one login"], ["Branches", "and cost centres"], ["ZMW", "+ multi-currency"], ["Role-based", "with audit trail"]].map(([t, s]) => (
                <div key={t}>
                  <dt className="font-display text-sm font-bold text-white">{t}</dt>
                  <dd className="text-[11px] font-medium text-sifo-haze/80">{s}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="sifo-reveal [animation-delay:120ms]">
            <HeroStack />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Layered hero composition — main app window with two offset supporting panels. */
function HeroStack() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-2xl bg-sifo-mint/8 blur-3xl" aria-hidden />
      <div className="relative transition-transform duration-500 ease-out will-change-transform hover:-translate-y-1">
        <AppWindow title="SifoBooks dashboard" crumb="/dashboard">{SCREENS.dashboard.render()}</AppWindow>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-sifo-line/70 bg-sifo-ink-2/90 p-3 backdrop-blur transition-transform duration-500 hover:-translate-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sifo-haze/70">Till · shift open</p>
          <p className="mt-1 font-display text-xl font-bold text-white">K 68,400</p>
          <p className="text-[10px] font-semibold text-sifo-mint">212 sales · cash, card, MoMo</p>
        </div>
        <div className="rounded-xl border border-sifo-copper/25 bg-sifo-copper/8 p-3 backdrop-blur transition-transform duration-500 hover:-translate-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sifo-copper">VAT return · Sep</p>
          <p className="mt-1 font-display text-xl font-bold text-white">Due 18 Oct</p>
          <p className="text-[10px] font-semibold text-sifo-haze">Prepared from posted invoices</p>
        </div>
      </div>
    </div>
  );
}

/* ── Product tabs ─────────────────────────────────────────────── */

export function SifoProductTabs() {
  const [active, setActive] = useState<ScreenKey>("pos");
  const s = SCREENS[active];

  return (
    <section id="platform" className="relative border-t border-sifo-line/60 bg-sifo-ink-2 py-16 sifo-edge md:py-24">
      <div className="pointer-events-none absolute inset-0 sifo-ledger opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHead
          eyebrow="One platform"
          title="Nine workspaces, one set of books"
          lede="Every module writes to the same ledger, the same stock record and the same audit trail. Choose a workspace to see it."
        />

        <div className="mt-8 -mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="SifoBooks workspaces" className="inline-flex min-w-full gap-1 rounded-xl border border-sifo-line/70 bg-sifo-ink/70 p-1.5 sm:min-w-0">
            {SCREEN_ORDER.map((k) => {
              const t = SCREENS[k];
              const on = k === active;
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(k)}
                  className={cn(
                    "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-[13px]",
                    on ? "text-white" : "text-sifo-haze hover:text-white",
                  )}
                  style={on ? { background: `${t.accent}1f` } : undefined}
                >
                  <t.icon className="h-3.5 w-3.5" style={{ color: on ? t.accent : undefined }} />
                  {t.label}
                  {on ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full" style={{ background: t.accent }} /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div key={active} className="sifo-reveal mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: `${s.accent}1a`, color: s.accent }}>
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight tracking-[-0.03em] text-white md:text-3xl">{s.title}</h3>
            <p className="mt-3 text-[15px] leading-7 text-sifo-haze">{s.lede}</p>
            <ul className="mt-5 space-y-2.5">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm font-medium text-white/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.accent }} /> {p}
                </li>
              ))}
            </ul>
            <Link to="/auth" search={{ tab: "signup" }} className="sifo-btn sifo-btn-ghost mt-6">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <AppWindow title={s.title} crumb={s.crumb} accent={s.accent}>{s.render()}</AppWindow>
        </div>
      </div>
    </section>
  );
}

/* ── Feature cards — deliberately unequal ─────────────────────── */

export function SifoFeatureGrid() {
  return (
    <section id="features" className="relative border-t border-sifo-line/60 bg-sifo-ink py-16 sifo-edge md:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHead
          eyebrow="What holds it together"
          title="Controls that keep the books defensible"
          lede="The parts of an accounting system you only notice when they are missing."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {/* wide feature */}
          <article className="group relative overflow-hidden rounded-2xl border border-sifo-line/70 bg-sifo-ink-2 p-6 lg:col-span-2 lg:row-span-2">
            <div className="pointer-events-none absolute inset-0 sifo-blueprint opacity-50" aria-hidden />
            <div className="relative">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sifo-mint/12 text-sifo-mint"><TrendingUp className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-white">Posting engine with maker–checker</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-sifo-haze">
                Documents raise balanced journals automatically. Approvals, closed periods and controlled reversals stop
                anyone quietly editing history, and every change carries who, when and why.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[["Balanced", "to the ngwee"], ["Reversal", "not deletion"], ["Closed periods", "enforced"]].map(([a, b]) => (
                  <div key={a} className="rounded-lg border border-sifo-line/70 bg-sifo-ink/70 px-3 py-2.5">
                    <p className="font-display text-sm font-bold text-white">{a}</p>
                    <p className="text-[11px] text-sifo-haze/80">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* tall accent card */}
          <article className="group relative overflow-hidden rounded-2xl border border-sifo-copper/25 bg-sifo-copper/6 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sifo-copper/15 text-sifo-copper"><ShieldCheck className="h-5 w-5" /></span>
            <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-white">Zambian tax, modelled properly</h3>
            <p className="mt-2 text-sm leading-6 text-sifo-haze">
              VAT, tourism levy and service charge are three separate rules with their own bases — never stacked blindly.
            </p>
            <div className="mt-4 space-y-1.5 font-mono text-[11px] text-white/80">
              {[["Net", "1,000.00"], ["Service 10%", "100.00"], ["Levy 1.5%", "15.00"], ["VAT 16%", "178.40"]].map(([a, b]) => (
                <div key={a} className="flex justify-between border-b border-dashed border-sifo-line/70 pb-1"><span>{a}</span><span className="tabular-nums">{b}</span></div>
              ))}
              <div className="flex justify-between pt-0.5 font-display text-sm font-bold text-sifo-copper"><span>Gross</span><span className="tabular-nums">1,293.40</span></div>
            </div>
          </article>

          {/* compact cards */}
          <article className="rounded-2xl border border-sifo-line/70 bg-sifo-ink-2 p-6 transition hover:-translate-y-0.5 hover:border-sifo-mint/35">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sifo-mint/12 text-sifo-mint"><CircleDollarSign className="h-5 w-5" /></span>
            <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-white">Money in, money out</h3>
            <p className="mt-2 text-sm leading-6 text-sifo-haze">Cash, card, MTN MoMo, Airtel Money and bank transfers reconciled against statements and till shifts.</p>
          </article>

          <article className="rounded-2xl border border-sifo-line/70 bg-sifo-ink-2 p-6 transition hover:-translate-y-0.5 hover:border-sifo-mint/35 lg:col-span-2">
            <div className="flex flex-wrap items-start gap-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#5AA9E6]/12 text-[#5AA9E6]"><FileCheck2 className="h-5 w-5" /></span>
              <div className="min-w-[15rem] flex-1">
                <h3 className="font-display text-lg font-bold tracking-tight text-white">Reports that answer a question</h3>
                <p className="mt-2 text-sm leading-6 text-sifo-haze">Trial balance, general ledger, P&amp;L, balance sheet, aging, stock valuation and sales analysis — each one drills back to the transaction that made it.</p>
              </div>
              <div className="flex w-full gap-1 sm:w-auto">
                {[38, 52, 44, 66, 58, 78].map((h, i) => (
                  <span key={i} className="w-3 self-end rounded-t bg-[#5AA9E6]/70" style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ── Trust ────────────────────────────────────────────────────── */

export function SifoTrust() {
  return (
    <section className="relative border-t border-sifo-line/60 bg-sifo-ink-2 py-14 sifo-edge">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <Eyebrow>Built for the way business runs here</Eyebrow>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-[-0.03em] text-white md:text-3xl">
              Kwacha first, branch-aware, and honest about compliance.
            </h2>
            <p className="mt-3 text-sm leading-7 text-sifo-haze">
              SifoBooks is designed around Zambian statutory work — VAT, PAYE, NAPSA, NHIMA, turnover tax and tourism
              levy — with multi-company, multi-branch and multi-currency handling on top.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Smart Invoice ready", "Queue, submit and track invoices through your own ZRA-issued VSDC credentials. ZRA certifies the connection — SifoBooks does not claim certification on your behalf."],
              ["Your data stays yours", "Row-level security per company, role-based permissions and a complete audit trail on every posting."],
              ["Runs on a modest connection", "Works on laptop, tablet and phone, installs as an app, and keeps the till usable when the line drops."],
              ["Nothing is a black box", "Every automated posting shows the Dr/Cr behind it in plain language before you commit."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-sifo-line/70 bg-sifo-ink/60 p-4">
                <p className="font-display text-sm font-bold text-white">{t}</p>
                <p className="mt-1.5 text-[12.5px] leading-6 text-sifo-haze">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
