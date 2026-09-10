import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { demoIndustries } from "@/lib/demo";
import { DemoBanner } from "@/components/demo/DemoShell";

export const Route = createFileRoute("/demo/")({
  head: () => ({
    meta: [
      { title: "SifoBooks Industry Demos — Hotel, School & Restaurant" },
      { name: "description", content: "Explore fully navigable SifoBooks demos for hotels, schools and restaurants. Sample data only, no sign-up needed." },
      { property: "og:title", content: "SifoBooks Industry Demos — Hotel, School & Restaurant" },
      { property: "og:description", content: "Explore fully navigable SifoBooks demos for hotels, schools and restaurants. Sample data only, no sign-up needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoIndex,
});

function DemoIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DemoBanner />
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <Link to="/" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
          ← Back to SifoBooks
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Explore SifoBooks by industry</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Three complete sample businesses you can click through right now. No sign-up, no card, and none of the figures
          belong to a real business.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {demoIndustries.map((industry) => (
            <div key={industry.slug} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-bold">{industry.product}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{industry.tagline}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {industry.highlights.map((h) => (
                  <li key={h}>✓ {h}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/demo/$industry"
                  params={{ industry: industry.slug }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  View demo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/auth" className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
                  Start your own
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
