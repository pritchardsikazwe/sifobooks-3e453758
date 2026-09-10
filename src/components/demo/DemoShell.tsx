import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
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

export function DemoIndustryShell({
  industry,
  activeSection,
  children,
}: {
  industry: DemoIndustry;
  activeSection?: string;
  children: React.ReactNode;
}) {
  const groups = industry.sections.reduce<Record<string, typeof industry.sections>>((acc, section) => {
    (acc[section.group] ||= []).push(section);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DemoBanner />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <Link to="/" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
              SifoBooks
            </Link>
            <h1 className="truncate text-xl font-bold">{industry.product} demo</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demoIndustries.map((other) => (
              <Link
                key={other.slug}
                to="/demo/$industry"
                params={{ industry: other.slug }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                  other.slug === industry.slug ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                )}
              >
                {other.product}
              </Link>
            ))}
            <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              Start your own <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row">
        <nav className="lg:w-60 lg:shrink-0">
          <div className="space-y-4 lg:sticky lg:top-20">
            {Object.entries(groups).map(([group, sections]) => (
              <div key={group}>
                <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group}</p>
                <ul className="space-y-0.5">
                  {sections.map((section) => (
                    <li key={section.slug}>
                      <Link
                        to="/demo/$industry/$section"
                        params={{ industry: industry.slug, section: section.slug }}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm transition",
                          section.slug === activeSection ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {section.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <main className="min-w-0 flex-1 space-y-5">{children}</main>
      </div>
    </div>
  );
}
