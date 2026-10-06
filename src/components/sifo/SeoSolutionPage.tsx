import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export type SeoSolution = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  eyebrow: string;
  heading: string;
  intro: string;
  features: string[];
  related: { path: string; label: string }[];
};

export function SeoSolutionPage({ solution }: { solution: SeoSolution }) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link to="/" className="text-2xl font-black tracking-tight">Sifo<span className="text-blue-600">Books</span></Link>
          <div className="flex gap-2">
            <Link to="/auth" search={{ tab: "signin" }} className="rounded-lg border px-4 py-2 text-sm font-bold">Sign in</Link>
            <Link to="/auth" search={{ tab: "signup" }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Start free</Link>
          </div>
        </div>
      </header>
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="max-w-3xl">
            <div className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">{solution.eyebrow}</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{solution.heading}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{solution.intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-extrabold text-white">Start with SifoBooks <ArrowRight className="h-4 w-4"/></Link>
              <Link to="/demo" className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-bold">Explore demos</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-3xl font-black">Built for the way businesses work in Zambia</h2>
        <p className="mt-3 max-w-3xl text-slate-600">SifoBooks connects daily operations with accounting, reporting and compliance so your team can work from one business record.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {solution.features.map((feature) => <div key={feature} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><div className="mt-3 font-bold">{feature}</div></div>)}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-2xl font-black">Explore related SifoBooks solutions</h2>
          <div className="mt-5 flex flex-wrap gap-3">{solution.related.map(x => <Link key={x.path} to={x.path as any} className="rounded-xl border bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50">{x.label}</Link>)}</div>
        </div>
      </section>
      <footer className="bg-[#061b46] py-8 text-center text-sm text-blue-100">© {new Date().getFullYear()} SifoBooks · Accounting · POS · ERP</footer>
    </main>
  );
}

export function seoHead(solution: SeoSolution) {
  return {
    meta: [
      { title: solution.title },
      { name: "description", content: solution.description },
      { name: "keywords", content: solution.keywords },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: solution.title },
      { property: "og:description", content: solution.description },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: `https://sifobooks.com${solution.path}` },
      { rel: "alternate", hrefLang: "en-ZM", href: `https://sifobooks.com${solution.path}` },
      { rel: "alternate", hrefLang: "en", href: `https://sifobooks.com${solution.path}` },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: solution.title,
        description: solution.description,
        url: `https://sifobooks.com${solution.path}`,
        inLanguage: "en-ZM",
        about: { "@type": "SoftwareApplication", name: "SifoBooks", applicationCategory: "BusinessApplication", operatingSystem: "Web, Windows" }
      })
    }]
  };
}
