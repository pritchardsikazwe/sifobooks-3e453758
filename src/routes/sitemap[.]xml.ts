import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://sifobooks.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0 },
          { path: "/demo", changefreq: "weekly", priority: "0.9 },
          { path: "/public-jobs", changefreq: "weekly", priority: "0.8 },
          { path: "/accounting-software-zambia", changefreq: "weekly", priority: "0.9 },
          { path: "/pos-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/payroll-software-zambia", changefreq: "weekly", priority: "0.9 },
          { path: "/inventory-software-zambia", changefreq: "weekly", priority: "0.9 },
          { path: "/zra-smart-invoice-software", changefreq: "weekly", priority: "0.8 },
          { path: "/restaurant-pos-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/hotel-management-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/school-management-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/butchery-pos-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/erp-software-zambia", changefreq: "weekly", priority: "0.9 },
          { path: "/sales-invoicing-software-zambia", changefreq: "weekly", priority: "0.9 },
          { path: "/purchases-procurement-software-zambia", changefreq: "weekly", priority: "0.9 },
          { path: "/bank-reconciliation-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/fixed-assets-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/budgeting-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/multi-currency-accounting-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/expense-management-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/financial-reporting-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/zambian-compliance-software", changefreq: "weekly", priority: "0.9 },
          { path: "/college-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/university-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/hospital-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/pharmacy-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/phone-shop-pos-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/manufacturing-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/law-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/transport-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/fleet-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/car_hire-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/hire-purchase-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/land-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/sacco-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/real-estate-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/construction-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/ngo-management-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/church-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/agri-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/fuel-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/hardware-software-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/supermarket-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/salon-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/clinic-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/insurance-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/consultancy-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/internet-cafe-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/courier-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/logistics-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/mining-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/security-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/wholesale-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/property-zambia", changefreq: "weekly", priority: "0.8 },
          { path: "/lending-zambia", changefreq: "weekly", priority: "0.8 },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
