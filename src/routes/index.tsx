import { createFileRoute } from "@tanstack/react-router";
import { SifoLandingHome } from "@/components/sifo/SifoLandingHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Accounting Software, POS & ERP for Zambia" },
      { name: "description", content: "SifoBooks is accounting software, POS and business management ERP for Zambian businesses. Manage accounting, invoicing, inventory, payroll, VAT and ZRA Smart Invoice workflows in one platform." },
      { name: "keywords", content: "SifoBooks, accounting software Zambia, accounting software in Zambia, ERP Zambia, POS Zambia, payroll software Zambia, inventory software Zambia, ZRA Smart Invoice, VAT software Zambia, business management software Zambia" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "author", content: "SifoBooks" },
      { property: "og:site_name", content: "SifoBooks" },
      { property: "og:title", content: "SifoBooks — Connected Business Management Platform" },
      { property: "og:description", content: "One connected workspace for the whole business." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sifobooks.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://sifobooks.com/" },
      { rel: "alternate", hrefLang: "en-zm", href: "https://sifobooks.com/" },
      { rel: "alternate", hrefLang: "en", href: "https://sifobooks.com/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SifoBooks",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Windows",
          description: "Accounting software, POS and business management ERP for Zambian businesses.",
          url: "https://sifobooks.com/",
          brand: { "@type": "Brand", name: "SifoBooks" },
          offers: { "@type": "Offer", price: "0", priceCurrency: "ZMW", description: "Free start available" },
          areaServed: { "@type": "Country", name: "Zambia" }
        })
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SifoBooks",
          url: "https://sifobooks.com/"
        })
      }
    ],
  }),
  component: SifoLandingHome,
});
