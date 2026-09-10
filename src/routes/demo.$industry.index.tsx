import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";
import { getDemoIndustry } from "@/lib/demo";
import { DemoIndustryShell } from "@/components/demo/DemoShell";

export const Route = createFileRoute("/demo/$industry/")({
  loader: ({ params }) => {
    const industry = getDemoIndustry(params.industry);
    if (!industry) throw notFound();
    return { industry };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Demo unavailable — SifoBooks" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.industry.product} Demo — SifoBooks`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.industry.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.industry.tagline },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => <DemoMissing />,
  notFoundComponent: () => <DemoMissing />,
  component: IndustryOverview,
});

function DemoMissing() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">That demo isn't available</h1>
      <p className="mt-2 text-muted-foreground">Pick one of the sample businesses instead.</p>
      <Link to="/demo" className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
        See all demos
      </Link>
    </div>
  );
}

function IndustryOverview() {
  const { industry } = Route.useLoaderData();
  const groups = Array.from(new Set(industry.sections.map((s) => s.group)));
  const first = industry.sections[0];

  return (
    <DemoIndustryShell industry={industry}>
      <div className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${industry.accent?.gradient ?? "from-primary/10 to-background"}`}>
        <div className="p-6 md:p-8">
          <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Demo · sample data only
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">{industry.tagline}</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">{industry.description}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {industry.highlights.map((h) => (
              <div key={h} className="rounded-xl border border-border bg-background/70 p-3 text-sm font-semibold">
                {h}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/demo/$industry/$section"
              params={{ industry: industry.slug, section: first.slug }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
            >
              Open the {first.name.toLowerCase()} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold hover:bg-muted">
              Create your SifoBooks account
            </Link>
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{group}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industry.sections
              .filter((s) => s.group === group)
              .map((section) => {
                const Icon = (section.iconName && (Icons as unknown as Record<string, Icons.LucideIcon>)[section.iconName]) || Icons.Circle;
                return (
                  <Link
                    key={section.slug}
                    to="/demo/$industry/$section"
                    params={{ industry: industry.slug, section: section.slug }}
                    className="group flex gap-3 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ${industry.accent?.text ?? "text-primary"}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{section.name}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{section.blurb}</span>
                    </span>
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </DemoIndustryShell>
  );
}
