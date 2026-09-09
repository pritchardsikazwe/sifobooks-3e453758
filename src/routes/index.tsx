import { createFileRoute } from "@tanstack/react-router";
import { SifoIndustryRegistration } from "@/components/sifo/SifoIndustryRegistration";
import { SifoLandingShowcase } from "@/components/sifo/SifoLandingShowcase";

function SifoHome() {
  return (
    <>
      <SifoLandingShowcase />
      <SifoIndustryRegistration />
    </>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Smart Business. Simplified." },
      { name: "description", content: "SifoBooks connects accounting, sales, purchases, inventory, POS, banking, payroll, compliance, hotel, school and mining management in one controlled platform." },
      { name: "keywords", content: "SifoBooks, accounting software Zambia, POS Zambia, hotel management software, school management software, mining management software, inventory software, payroll, ZRA compliance, business management" },
      { property: "og:title", content: "SifoBooks — Smart Business. Simplified." },
      { property: "og:description", content: "Business software for accounting, retail, hotels, schools, mining and connected operations." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sifobooks.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SifoBooks — Smart Business. Simplified." },
    ],
    links: [{ rel: "canonical", href: "https://sifobooks.com/" }],
  }),
  component: SifoHome,
});
