import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SifoReportViewer } from "@/components/reports/SifoReportViewer";
import { ReportPeriodBar } from "@/components/reports/ReportPeriodBar";
import { SaveViewButton } from "@/components/reports/SaveViewButton";
import { resolveRange, type Range } from "@/lib/reports/periods";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadGeneralLedger } from "@/lib/reports/engine";
import { useReport } from "@/lib/reports/use-report";

type Search = { account?: string; from?: string; to?: string };

export const Route = createFileRoute("/_authenticated/reports/general-ledger")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    account: typeof s.account === "string" ? s.account : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  head: () => ({ meta: [{ title: "General Ledger — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: GeneralLedgerPage,
});

function GeneralLedgerPage() {
  const search = Route.useSearch();
  const [range, setRange] = useState<Range>(() =>
    resolveRange(search.from && search.to ? "custom" : "ytd", { from: search.from ?? "", to: search.to ?? "" }),
  );
  const [accountId, setAccountId] = useState<string>(search.account ?? "all");
  const [accounts, setAccounts] = useState<{ id: string; account_code: string; account_name: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("chart_of_accounts")
        .select("id,account_code,account_name")
        .order("account_code");
      setAccounts(data ?? []);
    })();
  }, []);

  const { from, to } = range;
  const account = accountId === "all" ? undefined : accountId;
  const { result, loading, error, refresh } = useReport(loadGeneralLedger, { from, to, accountId: account }, [from, to, account]);

  const accountLabel = accounts.find((a) => a.id === account);

  return (
    <SifoReportViewer
      reportId="general-ledger"
      title="General Ledger"
      subtitle={`${accountLabel ? `${accountLabel.account_code} ${accountLabel.account_name}` : "All accounts"} · ${from} → ${to}`}
      filename={`general-ledger-${from}-to-${to}`}
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
            <div className="min-w-[16rem]">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_code} — {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <SaveViewButton defaultName={`General Ledger — ${range.label}`} />
        </ReportPeriodBar>
      }
    />
  );
}
