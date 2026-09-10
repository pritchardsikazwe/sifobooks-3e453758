import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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

  return (
    <DemoIndustryShell industry={industry}>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold">{industry.tagline}</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">{industry.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/demo/$industry/$section"
            params={{ industry: industry.slug, section: industry.sections[0].slug }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Start the walkthrough <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
            Create your SifoBooks account
          </Link>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{group}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industry.sections
              .filter((s) => s.group === group)
              .map((section) => (
                <Link
                  key={section.slug}
                  to="/demo/$industry/$section"
                  params={{ industry: industry.slug, section: section.slug }}
                  className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-muted/40"
                >
                  <p className="font-semibold">{section.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </DemoIndustryShell>
  );
}
