import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadPosStockDepletion } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/pos-stock-depletion")({
  head: () => ({
    meta: [
      { title: "POS Stock Depletion — SifoBooks" },
      { name: "description", content: "Stock taken out by till sales and put back by till returns, per item and store." },
      { property: "og:title", content: "POS Stock Depletion — SifoBooks" },
      { property: "og:description", content: "Till sales and returns as stock movements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PosDepletionPage,
});

function PosDepletionPage() {
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
  const { result, loading, error, refresh } = useReport(loadPosStockDepletion, { from, to, locationId: loc }, [from, to, loc]);

  return (
    <SifoReportViewer
      reportId="pos-stock-depletion"
      title="POS Stock Depletion"
      subtitle={`Till sales and returns as stock movements · ${from} → ${to}`}
      filename={`pos-stock-depletion-${from}-to-${to}`}
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
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Store / location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          }
        />
      }
    />
  );
}
