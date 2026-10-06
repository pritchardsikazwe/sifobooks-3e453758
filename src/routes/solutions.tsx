import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "SifoBooks Solutions | Business Software for Zambia" },
      { name: "description", content: "Explore SifoBooks accounting, POS, payroll, inventory, compliance and industry management software for businesses and organisations in Zambia." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: "https://sifobooks.com/solutions" }],
  }),
  component: SolutionsPage,
});

function SolutionsPage() {
  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-2xl font-black">Sifo<span className="text-blue-600">Books</span></Link>
        <Link to="/auth" search={{ tab: "signup" }} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white">Start free</Link>
      </div>
    </header>
    <section className="mx-auto max-w-6xl px-5 py-14">
      <div className="max-w-3xl">
        <div className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">SifoBooks solutions</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Business software for Zambia — by module and industry</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">Choose the standalone workspace that matches what you need today, then connect more SifoBooks modules as your business grows.</p>
      </div>
      <div className="mt-10 space-y-6">
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<h2 className="text-2xl font-black">Core modules</h2>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([path,label])=><Link key={path} to={path as any} className="rounded-xl border border-slate-200 p-4 font-bold text-blue-700 hover:bg-blue-50">{label}</Link>)}</div>
</section>
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<h2 className="text-2xl font-black">Education & healthcare</h2>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([path,label])=><Link key={path} to={path as any} className="rounded-xl border border-slate-200 p-4 font-bold text-blue-700 hover:bg-blue-50">{label}</Link>)}</div>
</section>
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<h2 className="text-2xl font-black">Retail & services</h2>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([path,label])=><Link key={path} to={path as any} className="rounded-xl border border-slate-200 p-4 font-bold text-blue-700 hover:bg-blue-50">{label}</Link>)}</div>
</section>
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<h2 className="text-2xl font-black">Property, finance & professional services</h2>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([path,label])=><Link key={path} to={path as any} className="rounded-xl border border-slate-200 p-4 font-bold text-blue-700 hover:bg-blue-50">{label}</Link>)}</div>
</section>
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<h2 className="text-2xl font-black">Transport, logistics & industry</h2>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([path,label])=><Link key={path} to={path as any} className="rounded-xl border border-slate-200 p-4 font-bold text-blue-700 hover:bg-blue-50">{label}</Link>)}</div>
</section>
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
<h2 className="text-2xl font-black">Projects, agriculture & nonprofit</h2>
<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([path,label])=><Link key={path} to={path as any} className="rounded-xl border border-slate-200 p-4 font-bold text-blue-700 hover:bg-blue-50">{label}</Link>)}</div>
</section>
      </div>
    </section>
  </main>;
}
