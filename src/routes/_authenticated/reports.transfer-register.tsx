import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadTransferRegister } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/transfer-register")({
  head: () => ({
    meta: [
      { title: "Transfer Register — SifoBooks" },
      { name: "description", content: "Every stock transfer between warehouses and stores with quantities, value and status." },
      { property: "og:title", content: "Transfer Register — SifoBooks" },
      { property: "og:description", content: "Warehouse to store transfers with value and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransferRegisterPage,
});

const STATUSES = ["all", "draft", "approved", "dispatched", "in_transit", "received", "cancelled"];

function TransferRegisterPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const [status, setStatus] = useState("all");
  const { from, to } = range;
  const { result, loading, error, refresh } = useReport(loadTransferRegister, { from, to, status }, [from, to, status]);

  return (
    <SifoReportViewer
      reportId="transfer-register"
      title="Transfer Register"
      subtitle={`Warehouse → store transfers · ${from} → ${to}`}
      filename={`transfer-register-${from}-to-${to}`}
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
            <div className="min-w-[12rem]">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          }
        />
      }
    />
  );
}
