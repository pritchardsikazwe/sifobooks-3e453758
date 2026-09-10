import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { loadStockValuation } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/inventory-valuation")({
  head: () => ({ meta: [{ title: "Stock Valuation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: StockValuationPage,
});

function StockValuationPage() {
  const [locationId, setLocationId] = useState("all");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("inventory_locations").select("id,name").order("name");
      setLocations(data ?? []);
    })();
  }, []);

  const loc = locationId === "all" ? undefined : locationId;
  const { result, loading, error } = useReport(loadStockValuation, { locationId: loc }, [loc]);

  return (
    <SifoReportViewer
      reportId="stock-valuation"
      title="Stock Valuation"
      subtitle="Quantity on hand valued at the recorded unit cost — no cost is ever estimated"
      filename="stock-valuation"
      loading={loading}
      error={error}
      result={result}
      filters={
        <Card className="flex flex-wrap items-end gap-3 p-3">
          <div className="min-w-[14rem]">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      }
    />
  );
}
