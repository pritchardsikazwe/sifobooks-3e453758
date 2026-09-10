import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadCashbook } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/cashbook")({
  head: () => ({ meta: [{ title: "Cashbook & Bank — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CashbookReportPage,
});

function CashbookReportPage() {
  const [range, setRange] = useState<Range>(() => resolveRange("this-month"));
  const [accountId, setAccountId] = useState("all");
  const [accounts, setAccounts] = useState<{ id: string; name: string; bank_name: string | null }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("bank_accounts").select("id,name,bank_name").order("name");
      setAccounts(data ?? []);
    })();
  }, []);

  const { from, to } = range;
  const bank = accountId === "all" ? undefined : accountId;
  const { result, loading, error, refresh } = useReport(loadCashbook, { from, to, bankAccountId: bank }, [from, to, bank]);

  return (
    <SifoReportViewer
      reportId="cashbook"
      title="Cashbook / Bank"
      subtitle={`Opening, receipts, payments and closing · ${from} → ${to}`}
      filename={`cashbook-${from}-to-${to}`}
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
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cash / bank account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.bank_name ? ` — ${a.bank_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <SaveViewButton defaultName={`Cashbook — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
