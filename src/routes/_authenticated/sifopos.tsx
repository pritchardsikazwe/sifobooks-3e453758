import { createFileRoute, Link } from "@tanstack/react-router";
import { Barcode, ChefHat, LayoutGrid, ShoppingBag, UtensilsCrossed, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/sifopos")({
  head: () => ({
    meta: [
      { title: "SifoPOS — Choose Retail or Restaurant POS" },
      { name: "description", content: "Pick the right till: Retail POS for scan-scan-pay shop sales, or Restaurant POS for tables, guests, modifiers and kitchen orders." },
      { property: "og:title", content: "SifoPOS — Choose Retail or Restaurant POS" },
      { property: "og:description", content: "Two distinct point-of-sale experiences in one system: fast retail selling and full restaurant service." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SifoPosHub,
});

const RETAIL = [
  { icon: Barcode, title: "Barcode fast sales", desc: "Scan → scan → scan → Pay. Zero extra taps." },
  { icon: LayoutGrid, title: "Touch grid & favourites", desc: "Big product tiles, fast sellers, quick quantity." },
  { icon: ShoppingBag, title: "Cart, discounts, returns", desc: "Line discounts, price levels, refunds and voids." },
  { icon: ShoppingBag, title: "Cash / card / mobile money", desc: "Split tender, change calculator, drawer & shifts." },
];

const RESTAURANT = [
  { icon: UtensilsCrossed, title: "Tables, waiters, guests", desc: "Floor plan, covers, open checks per server." },
  { icon: ChefHat, title: "Modifiers & kitchen", desc: "Required/optional modifiers routed to the KDS." },
  { icon: LayoutGrid, title: "Dine-in & takeaway", desc: "Order types, hold/recall, course firing." },
  { icon: ShoppingBag, title: "Tips, loyalty, end of day", desc: "Tip declaration, gift cards, Z-read cash-up." },
];

function PosCard({
  tone, eyebrow, title, blurb, features, to, cta,
}: {
  tone: "retail" | "restaurant";
  eyebrow: string; title: string; blurb: string;
  features: typeof RETAIL; to: string; cta: string;
}) {
  const isRetail = tone === "retail";
  return (
    <Card className="relative overflow-hidden rounded-3xl border-border/60 p-6 md:p-8 flex flex-col gap-6">
      <div
        className={
          isRetail
            ? "absolute inset-x-0 top-0 h-1.5 bg-primary"
            : "absolute inset-x-0 top-0 h-1.5 bg-accent"
        }
      />
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</span>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <ul className="grid gap-3">
        {features.map((f) => (
          <li key={f.title} className="flex gap-3 rounded-2xl bg-muted/40 p-3">
            <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium leading-tight">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" variant={isRetail ? "default" : "secondary"} className="mt-auto rounded-xl">
        <Link to={to}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}

function SifoPosHub() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">SifoPOS</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Two distinct point-of-sale experiences on one database, stock ledger and set of accounts.
          Retail is built for speed; Restaurant is built for service.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <PosCard
          tone="retail"
          eyebrow="Shops, supermarkets, pharmacies, hardware"
          title="Retail POS"
          blurb="Extremely fast selling: scan, scan, scan, pay. Minimum clicks, touch-first, works offline."
          features={RETAIL}
          to="/pos"
          cta="Open Retail POS"
        />
        <PosCard
          tone="restaurant"
          eyebrow="Restaurants, bars, cafés, takeaways"
          title="Restaurant POS"
          blurb="Operationally rich: table → guests → items → modifiers → kitchen → payment."
          features={RESTAURANT}
          to="/restaurant/pos"
          cta="Open Restaurant POS"
        />
      </div>

      <Card className="rounded-3xl border-dashed p-6">
        <p className="text-sm text-muted-foreground">
          Both tills share the same products, customers, stock movements, VAT settings and general ledger —
          every completed sale posts automatically, online or once you reconnect.
        </p>
      </Card>
    </div>
  );
}
