import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Zap,
  Globe2,
  BarChart3,
  Wallet,
  Bell,
  Menu,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
} from "lucide-react";
import heroImg from "@/assets/hero-dashboard.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

const brands = ["Coca-Cola", "SANDVIK", "Adbims", "Dharti", "Zamtel", "Airtel"];

const testimonials = [
  {
    company: "Coca-Cola Beverages Zambia",
    quote:
      "We partnered with Kopelacode to handle our invoice fiscalization needs in Zambia and have been very satisfied. Their platform keeps us fully compliant with ZRA through a seamless integration.",
  },
  {
    company: "SANDVIK",
    quote:
      "Kopelacode's API made it simple to meet every ZRA compliance requirement without internal complexity. We confidently recommend them as a dependable fiscalization partner in Zambia.",
  },
  {
    company: "Adbims Sales & Distribution",
    quote:
      "Kopelacode has been an incredible support company to us. Their response is always timely and we truly appreciate the dedication and support they provide.",
  },
  {
    company: "Dharti Technology",
    quote:
      "In an era where digital transformation is a regulatory necessity, Kopelacode is an indispensable partner in navigating Zambia's e-invoicing landscape.",
  },
];

const posts = [
  {
    tag: "Guide",
    title: "Integrating your ERP with Kopelacode",
    excerpt: "A step-by-step walkthrough for connecting SAP, Odoo, and QuickBooks to the Kopelacode fiscal engine.",
  },
  {
    tag: "Product",
    title: "Unlimited invoices, one flat plan",
    excerpt: "Introducing our new EdgeCore plan — send as many invoices as your business needs, no per-document fees.",
  },
  {
    tag: "Compliance",
    title: "What Zambia's e-invoice mandate means for you",
    excerpt: "Everything African SMEs need to know about real-time fiscalization and staying ahead of tax authorities.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Brands />
        <WhoWeAre />
        <WhatWeDo />
        <Testimonials />
        <Blog />
        <Growth />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="font-display text-lg font-bold">K</span>
      </div>
      <span className="font-display text-xl font-bold tracking-tight">
        Kopela<span className="text-accent">code</span>
      </span>
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#solutions" className="hover:text-foreground">Solutions</a>
          <a href="#about" className="hover:text-foreground">About</a>
          <a href="#testimonials" className="hover:text-foreground">Customers</a>
          <a href="#blog" className="hover:text-foreground">Blog</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div
        aria-hidden
        className="absolute -top-40 -right-40 -z-10 h-[500px] w-[500px] rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--gradient-brand)" }}
      />
      <div className="container-page grid gap-14 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            What&apos;s new — Unlimited invoices with EdgeCore
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Africa&apos;s No. 1 platform for{" "}
            <span className="text-gradient-brand">fiscal compliance</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Kopelacode helps businesses in Africa manage everyday invoicing
            with centralized invoice management and stay tax-compliant by
            integrating directly with government tax authorities.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Book a demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              See solutions
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["ZRA-certified", "Real-time fiscalization", "Free 14-day trial"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div
            className="overflow-hidden rounded-2xl border border-border bg-card"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <img
              src={heroImg}
              alt="Kopelacode invoicing dashboard preview"
              width={1600}
              height={1200}
              className="h-auto w-full"
            />
          </div>
          <FloatingStat
            className="-left-4 top-8 md:-left-10"
            icon={<Wallet className="h-4 w-4" />}
            label="Paid this month"
            value="ZMW 128,540"
          />
          <FloatingStat
            className="-right-4 bottom-10 md:-right-8"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="ZRA compliant"
            value="100%"
            accent
          />
        </div>
      </div>
    </section>
  );
}

function FloatingStat({
  icon,
  label,
  value,
  className = "",
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`absolute hidden items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className={`grid h-8 w-8 place-items-center rounded-lg ${
          accent ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Brands() {
  return (
    <section className="border-y border-border bg-surface/50 py-12">
      <div className="container-page">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by global brands
        </p>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
          {brands.map((b) => (
            <div
              key={b}
              className="text-center font-display text-lg font-semibold text-muted-foreground/70 transition hover:text-foreground"
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoWeAre() {
  return (
    <section id="about" className="py-24">
      <div className="container-page grid gap-14 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionEyebrow>Who we are</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">
            Simplifying invoicing, strengthening fiscal compliance.
          </h2>
          <p className="mt-5 max-w-lg text-muted-foreground">
            Kopelacode simplifies invoicing for freelancers, small business
            owners, and large enterprises — ensuring full tax compliance
            through direct integration with government tax authorities.
          </p>
          <Button variant="link" className="mt-4 px-0 text-primary">
            Learn more <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: FileText, label: "Invoices sent", value: "2.4M+" },
            { icon: Globe2, label: "Countries", value: "5" },
            { icon: BarChart3, label: "Compliance rate", value: "99.9%" },
            { icon: Zap, label: "Avg. fiscalization", value: "<2s" },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="border-border/70 p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-3xl font-bold">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
      {children}
    </span>
  );
}

function WhatWeDo() {
  return (
    <section id="solutions" className="bg-surface py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>What we do</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">
            One platform, many possibilities
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <ProductCard
            badge="For all business types"
            title="EdgeCore"
            description="Create, customize and send invoices in minutes. Track payments, manage expenses, get paid faster and stay compliant with tax authorities — all from one dashboard."
            features={["Unlimited invoices", "Payment tracking", "Expense management", "Multi-currency"]}
            icon={<FileText className="h-5 w-5" />}
          />
          <ProductCard
            badge="For tax-compliant businesses"
            title="EdgeComply"
            description="Built for businesses operating in countries with e-invoice mandates. Live in Zambia with ZRA integration — offering real-time compliance, ERP integrations, alerts and fiscal device syncing."
            features={["ZRA integration", "ERP connectors", "Real-time alerts", "Fiscal device sync"]}
            icon={<ShieldCheck className="h-5 w-5" />}
            accent
          />
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  badge,
  title,
  description,
  features,
  icon,
  accent = false,
}: {
  badge: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="group relative overflow-hidden border-border/70 p-8 transition hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
          accent
            ? "bg-accent/10 text-accent"
            : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
        {badge}
      </div>
      <h3 className="mt-5 font-display text-3xl font-bold">{title}</h3>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <ul className="mt-6 grid grid-cols-2 gap-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-foreground/80">
            <CheckCircle2
              className={`h-4 w-4 ${accent ? "text-accent" : "text-primary"}`}
            />
            {f}
          </li>
        ))}
      </ul>
      <Button variant="link" className={`mt-6 px-0 ${accent ? "text-accent" : "text-primary"}`}>
        Learn more <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </Card>
  );
}

function Testimonials() {
  return (
    <section id="testimonials" className="py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Customer testimonials</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">
            Trusted by 200+ businesses across Africa
          </h2>
          <p className="mt-4 text-muted-foreground">
            Over 200+ businesses trust Kopelacode to keep them compliant. Here&apos;s what some of them have to say.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {testimonials.map((t) => (
            <Card key={t.company} className="border-border/70 p-8">
              <div className="mb-4 flex gap-1 text-accent">
                {"★★★★★"}
              </div>
              <p className="text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 border-t border-border pt-4 font-display font-semibold">
                {t.company}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Blog() {
  return (
    <section id="blog" className="bg-surface py-24">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <SectionEyebrow>From our blog</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Latest news, technologies and resources from our team
            </h2>
          </div>
          <Button variant="outline">View all posts</Button>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <Card
              key={p.title}
              className="group overflow-hidden border-border/70 p-0 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="h-40 w-full"
                style={{ background: "var(--gradient-brand)", opacity: 0.9 }}
              />
              <div className="p-6">
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {p.tag}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold leading-snug">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Read article <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Growth() {
  return (
    <section className="py-24">
      <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionEyebrow>Why Kopelacode</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">
            Powering growth for businesses in Africa.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Kopelacode is a growth engine for innovative, forward-looking
            organizations operating in Africa. Our system integrates with
            government e-invoicing systems and supports businesses across
            retail, hospitality, wholesale and manufacturing.
          </p>
          <p className="mt-4 text-muted-foreground">
            As we grow, we&apos;re expanding to support other countries rolling
            out fiscal reforms — helping businesses stay ahead of tax
            compliance requirements across the continent.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Zap, title: "Send in seconds", body: "Create and dispatch professional invoices with a couple of clicks." },
            { icon: ShieldCheck, title: "Always compliant", body: "Live integrations with ZRA and other African revenue authorities." },
            { icon: Bell, title: "Smart alerts", body: "Get notified about overdue invoices, failed fiscalizations and more." },
            { icon: Globe2, title: "Multi-country ready", body: "Built for cross-border teams operating in multiple markets." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/70 p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 font-display text-lg font-semibold">{title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="pb-24">
      <div className="container-page">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-primary-foreground md:px-16 md:py-20"
          style={{ background: "var(--gradient-brand)" }}
        >
          <div
            aria-hidden
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl font-bold leading-tight md:text-5xl">
              Send invoices or get tax-compliant in minutes.
            </h2>
            <p className="mt-5 text-primary-foreground/90">
              Whether you need an invoice app for day-to-day billing or an
              integrated solution to stay compliant with tax authorities,
              Kopelacode is your competitive advantage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90">
                Book a demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                See solutions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    {
      title: "Company",
      links: ["Home", "About", "Solutions", "Pricing", "Teams", "Careers"],
    },
    {
      title: "Resources",
      links: ["Blog", "Documentation", "Help Center", "FAQs"],
    },
    {
      title: "Legal",
      links: ["Privacy Policy", "Terms of Service", "Contact Us"],
    },
  ];
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Get in touch or stay in the loop with company updates.
            </p>
            <div className="mt-5 flex gap-3">
              {[Facebook, Instagram, Linkedin, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-foreground">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Kopelacode. All rights reserved.</span>
          <span>Made for Africa · Built for the world</span>
        </div>
      </div>
    </footer>
  );
}
