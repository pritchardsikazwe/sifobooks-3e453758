import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolvePeriod } from "@/lib/reports/format";
import { loadCashbook } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

export const Route = createFileRoute("/_authenticated/reports/cashbook")({
  head: () => ({ meta: [{ title: "Cashbook & Bank — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CashbookReportPage,
});

function CashbookReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const [accountId, setAccountId] = useState("all");
  const [accounts, setAccounts] = useState<{ id: string; name: string; bank_name: string | null }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("bank_accounts").select("id,name,bank_name").order("name");
      setAccounts(data ?? []);
    })();
  }, []);

  const { from, to } = filters.range;
  const bank = accountId === "all" ? undefined : accountId;
  const { result, loading, error } = useReport(loadCashbook, { from, to, bankAccountId: bank }, [from, to, bank]);

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
        <ReportFilterBar
          initial={{ periodKey: "this-month" }}
          onApply={setFilters}
          extraFilters={
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
        />
      }
    />
  );
}
