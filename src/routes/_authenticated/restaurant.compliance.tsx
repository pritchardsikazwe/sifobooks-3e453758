import { createFileRoute } from "@tanstack/react-router";
import { HospitalityCompliance } from "@/components/compliance/HospitalityCompliance";

export const Route = createFileRoute("/_authenticated/restaurant/compliance")({
  head: () => ({
    meta: [
      { title: "Restaurant Licences & Tax Compliance — SifoBooks" },
      { name: "description", content: "Track trading permits, health and fire certificates, VAT, tourism levy, service charge and ZRA Smart Invoice settings for your restaurant." },
      { property: "og:title", content: "Restaurant Licences & Tax Compliance — SifoBooks" },
      { property: "og:description", content: "Licence renewals, tax configuration and electronic invoicing status in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RestaurantCompliance,
});

function RestaurantCompliance() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Licences & tax compliance</h1>
        <p className="text-sm text-muted-foreground">
          Permits, certificates, VAT, service charge and ZRA Smart Invoice settings for this restaurant.
        </p>
      </div>
      <HospitalityCompliance scope="restaurant" />
    </div>
  );
}
