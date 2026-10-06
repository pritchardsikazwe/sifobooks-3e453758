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
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/demo", changefreq: "weekly", priority: "0.9" },
          { path: "/public-jobs", changefreq: "weekly", priority: "0.5" },
          { path: "/accounting-software-zambia", changefreq: "weekly", priority: "0.9" },
          { path: "/pos-software-zambia", changefreq: "weekly", priority: "0.9" },
          { path: "/payroll-software-zambia", changefreq: "weekly", priority: "0.9" },
          { path: "/inventory-software-zambia", changefreq: "weekly", priority: "0.9" },
          { path: "/zra-smart-invoice-software", changefreq: "weekly", priority: "0.9" },
          { path: "/restaurant-pos-zambia", changefreq: "weekly", priority: "0.8" },
          { path: "/hotel-management-software-zambia", changefreq: "weekly", priority: "0.8" },
          { path: "/school-management-software-zambia", changefreq: "weekly", priority: "0.8" },
          { path: "/butchery-pos-zambia", changefreq: "weekly", priority: "0.8" },
          { path: "/erp-software-zambia", changefreq: "weekly", priority: "0.9" },
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
