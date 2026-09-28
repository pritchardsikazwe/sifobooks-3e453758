import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClipboardEdit } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/stock-adjustments")({
  head: () => ({
    meta: [
      { title: "Stock Adjustments — SifoBooks" },
      { name: "description", content: "Register of stock adjustments with variance, reason and the stock count they came from." },
      { property: "og:title", content: "Stock Adjustments — SifoBooks" },
      { property: "og:description", content: "Auditable stock adjustment register." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockAdjustmentsPage,
});

/**
 * Register only. Adjustments come from approved stock counts (which write the
 * matching stock movement), so this screen never changes a quantity on its own.
 */
function StockAdjustmentsPage() {
  const navigate = useNavigate();
  return (
    <SimpleCrud
      module="inventory"
      description="Every stock adjustment with variance and reason. New adjustments are made through a stock count so the movement is recorded and approved."
      title="Stock Adjustments"
      icon={ClipboardEdit}
      table="stock_adjustments"
      orderBy={{ column: "adjustment_date", ascending: false }}
      searchKeys={["adjustment_number", "reason", "reason_code"]}
      onNew={() => navigate({ to: "/stock-counts" })}
      onOpenRow={(r) => { if (r.source_count_id) navigate({ to: "/stock-counts" }); }}
      columns={[
        { key: "adjustment_number", header: "Adj #" },
        { key: "adjustment_date", header: "Date" },
        { key: "adjustment_type", header: "Type" },
        { key: "quantity_before", header: "System qty", align: "right" },
        { key: "quantity_after", header: "Physical qty", align: "right" },
        {
          key: "variance", header: "Variance", align: "right",
          render: (r: any) => {
            const v = Number(r.quantity_after ?? 0) - Number(r.quantity_before ?? 0);
            return <span className={v < 0 ? "text-destructive" : v > 0 ? "text-emerald-600" : ""}>{v > 0 ? `+${v}` : v}</span>;
          },
        },
        { key: "reason_code", header: "Reason code" },
        { key: "reason", header: "Reason" },
        { key: "source_count_id", header: "From count", render: (r: any) => (r.source_count_id ? "Stock count" : "—") },
      ]}
      fields={[]}
    />
  );
}
