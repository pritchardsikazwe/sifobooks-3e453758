import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronRight, Menu, ShieldCheck, X } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_BANNER, demoIndustries } from "@/lib/demo";
import type { DemoIndustry } from "@/lib/demo/types";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-amber-950">
      <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {DEMO_BANNER}</span>
      <span className="font-semibold normal-case tracking-normal">Nothing here is a real customer, and nothing you do can affect a real account.</span>
    </div>
  );
}

function iconFor(name?: string) {
  return (name && (Icons as unknown as Record<string, Icons.LucideIcon>)[name]) || Icons.Circle;
}

export function DemoIndustryShell({
  industry,
  activeSection,
  children,
}: {
  industry: DemoIndustry;
  activeSection?: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const groups = industry.sections.reduce<Record<string, typeof industry.sections>>((acc, section) => {
    (acc[section.group] ||= []).push(section);
    return acc;
  }, {});
  const active = industry.sections.find((s) => s.slug === activeSection);
  const accent = industry.accent;

  const nav = (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, sections]) => (
        <div key={group}>
          <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group}</p>
          <ul className="space-y-0.5">
            {sections.map((section) => {
              const Icon = iconFor(section.iconName);
              const isActive = section.slug === activeSection;
              return (
                <li key={section.slug}>
                  <Link
                    to="/demo/$industry/$section"
                    params={{ industry: industry.slug, section: section.slug }}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                      isActive
                        ? cn("bg-primary/10 font-semibold text-primary ring-1", accent?.ring ?? "ring-primary/30")
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{section.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DemoBanner />

      <header className={cn("border-b border-border bg-gradient-to-r text-foreground", accent?.gradient ?? "from-primary/10 to-background")}>
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <nav className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Link to="/" className="hover:text-foreground">SifoBooks</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/demo" className="hover:text-foreground">Demos</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/demo/$industry" params={{ industry: industry.slug }} className="hover:text-foreground">
                  {industry.product}
                </Link>
                {active ? (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="truncate text-foreground">{active.name}</span>
                  </>
                ) : null}
              </nav>
              <h1 className={cn("mt-1 truncate text-2xl font-black tracking-tight", accent?.text)}>
                {industry.product}
              </h1>
              <p className="text-sm text-muted-foreground">{industry.name} operations workspace · sample data</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {demoIndustries.map((other) => (
                <Link
                  key={other.slug}
                  to="/demo/$industry"
                  params={{ industry: other.slug }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                    other.slug === industry.slug ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/70 hover:bg-muted",
                  )}
                >
                  {other.product}
                </Link>
              ))}
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm">
                Start your own <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold lg:hidden"
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {active ? active.name : "Browse screens"}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row">
        {navOpen ? (
          <nav className="rounded-xl border border-border bg-card p-3 lg:hidden">{nav}</nav>
        ) : null}
        <nav className="hidden lg:block lg:w-60 lg:shrink-0">
          <div className="lg:sticky lg:top-20">{nav}</div>
        </nav>
        <main className="min-w-0 flex-1 space-y-5">{children}</main>
      </div>

      <footer className="border-t border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
        {DEMO_BANNER} · Demo screens are static illustrations, fully isolated from any real company, ledger or customer record.
      </footer>
    </div>
  );
}
