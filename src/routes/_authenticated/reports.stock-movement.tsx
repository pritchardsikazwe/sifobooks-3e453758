import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadStockMovement } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/stock-movement")({
  head: () => ({ meta: [{ title: "Stock Movement — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: StockMovementPage,
});

function StockMovementPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const [locationId, setLocationId] = useState("all");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("inventory_locations").select("id,name").order("name");
      setLocations(data ?? []);
    })();
  }, []);

  const { from, to } = range;
  const loc = locationId === "all" ? undefined : locationId;
  const { result, loading, error, refresh } = useReport(loadStockMovement, { from, to, locationId: loc }, [from, to, loc]);

  return (
    <SifoReportViewer
      reportId="stock-movement"
      title="Stock Movement"
      subtitle={`Opening, in, out, adjustments and closing by item and location · ${from} → ${to}`}
      filename={`stock-movement-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportPeriodBar
          range={range}
          onRange={setRange}
          onRefresh={refresh}
          refreshing={loading}
          customize={
            <div className="min-w-[14rem]">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <SaveViewButton defaultName={`Stock Movement — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
