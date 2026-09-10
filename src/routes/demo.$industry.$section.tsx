import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getDemoSection } from "@/lib/demo";
import { DemoIndustryShell } from "@/components/demo/DemoShell";
import { DemoBlock, DemoKpis } from "@/components/demo/DemoBlocks";

export const Route = createFileRoute("/demo/$industry/$section")({
  loader: ({ params }) => {
    const found = getDemoSection(params.industry, params.section);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Demo unavailable — SifoBooks" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.section.name} — ${loaderData.industry.product} Demo | SifoBooks`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.section.blurb },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.section.blurb },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => <SectionMissing />,
  notFoundComponent: () => <SectionMissing />,
  component: SectionPage,
});

function SectionMissing() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">That demo screen isn't available</h1>
      <Link to="/demo" className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
        See all demos
      </Link>
    </div>
  );
}

function SectionPage() {
  const { industry, section } = Route.useLoaderData();
  const index = industry.sections.findIndex((s) => s.slug === section.slug);
  const prev = index > 0 ? industry.sections[index - 1] : undefined;
  const next = index < industry.sections.length - 1 ? industry.sections[index + 1] : undefined;

  return (
    <DemoIndustryShell industry={industry} activeSection={section.slug}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{section.group}</p>
          <h2 className="text-2xl font-bold">{section.name}</h2>
          <p className="mt-1 max-w-3xl text-muted-foreground">{section.blurb}</p>
        </div>
        {section.actions?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {section.actions.map((action) => {
              const cls =
                action.variant === "primary"
                  ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                  : action.variant === "ghost"
                    ? "text-muted-foreground hover:bg-muted"
                    : "border border-border bg-background hover:bg-muted";
              const inner = (
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold ${cls}`}>
                  {action.label}
                </span>
              );
              return action.section ? (
                <Link key={action.label} to="/demo/$industry/$section" params={{ industry: industry.slug, section: action.section }}>
                  {inner}
                </Link>
              ) : (
                <span key={action.label}>{inner}</span>
              );
            })}
          </div>
        ) : null}
      </div>

      {section.kpis?.length ? <DemoKpis kpis={section.kpis} /> : null}

      {section.blocks.map((block) => (
        <DemoBlock key={block.title} block={block} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {prev ? (
          <Link
            to="/demo/$industry/$section"
            params={{ industry: industry.slug, section: prev.slug }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/demo/$industry/$section"
            params={{ industry: industry.slug, section: next.slug }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {next.name} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Create your SifoBooks account <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </DemoIndustryShell>
  );
}
