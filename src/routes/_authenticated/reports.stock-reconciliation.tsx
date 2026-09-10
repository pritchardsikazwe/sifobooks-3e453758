import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolvePeriod } from "@/lib/reports/format";
import { loadStockReconciliation } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/stock-reconciliation")({
  head: () => ({ meta: [{ title: "Stock Reconciliation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: StockReconciliationPage,
});

function StockReconciliationPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const [locationId, setLocationId] = useState("all");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("inventory_locations").select("id,name").order("name");
      setLocations(data ?? []);
    })();
  }, []);

  const { from, to } = filters.range;
  const loc = locationId === "all" ? undefined : locationId;
  const { result, loading, error } = useReport(loadStockReconciliation, { from, to, locationId: loc }, [from, to, loc]);

  return (
    <SifoReportViewer
      reportId="stock-reconciliation"
      title="Stock Reconciliation"
      subtitle={`Expected stock from movement history compared with actual balances · ${from} → ${to}`}
      filename={`stock-reconciliation-${from}-to-${to}`}
      loading={loading}
      error={error}
      result={result}
      filters={
        <ReportFilterBar
          initial={{ periodKey: "this-month" }}
          onApply={setFilters}
          extraFilters={
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
        />
      }
    />
  );
}
