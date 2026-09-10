import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Lock, Unlock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function PeriodClose() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("financial_periods")
      .select("*")
      .order("fiscal_year", { ascending: false })
      .order("period_month", { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setPeriods(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const closeMonth = async () => {
    if (!confirm(`Close ${MONTHS[month - 1]} ${year}? New or edited transactions dated in this month will be blocked.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("close_month", { _year: year, _month: month });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Closed ${MONTHS[month-1]} ${year}`);
    load();
  };

  const closeYear = async () => {
    if (!confirm(`Close year ${year}? This posts the year-end closing entry to Retained Earnings and should only be done after the year has been reviewed.`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("close_year", { _year: year });
    setBusy(false);
    if (error) return toast.error(error.message);
    const d = data as any;
    toast.success(`Year ${year} closed. Net ${Number(d?.net_income ?? 0).toFixed(2)}`);
    load();
  };

  const reopen = async (p: any) => {
    const label = p.period_type === "year" ? `year ${p.fiscal_year}` : `${MONTHS[(p.period_month||1)-1]} ${p.fiscal_year}`;
    if (!confirm(`Reopen ${label}? This restores the period for further accounting changes. Confirm only if you are authorized to reopen it.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("reopen_period", {
      _year: p.fiscal_year, _month: p.period_month ?? 1, _period_type: p.period_type,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${label} reopened`);
    load();
  };

  const periodColumns: DTColumn<any>[] = [
    { key: "period_type", header: "Type", cell: p => <span className="capitalize">{p.period_type}</span> },
    { key: "fiscal_year", header: "Year" },
    { key: "period_month", header: "Month", cell: p => p.period_month ? MONTHS[p.period_month - 1] : "—" },
    { key: "status", header: "Status", cell: p => (
      <Badge variant={p.status === "closed" ? "secondary" : "outline"} className="capitalize">
        {p.status || "open"}
      </Badge>
    ) },
    { key: "closed_at", header: "Closed At", cell: p => p.closed_at ? new Date(p.closed_at).toLocaleString() : "—" },
    { key: "notes", header: "Notes", cell: p => <span className="text-xs text-muted-foreground max-w-xs truncate block">{p.notes || ""}</span> },
    { key: "actions", header: "", sortable: false, cell: p => p.status === "closed" ? (
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => reopen(p)}>
        <Unlock className="h-4 w-4 mr-1" /> Reopen
      </Button>
    ) : null },
  ];

  return (
    <div className="min-h-full bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <SifoModuleHeader
            module="accounting"
            icon={CalendarClock}
            title="Period Close"
            description="Control accounting periods and protect posted financial history."
            breadcrumbs={[{ label: "Finance", to: "/banking" }, { label: "Period Close" }]}
            showTabs={false}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Close a period</CardTitle>
            <CardDescription>Closing blocks new or edited journal entries dated inside the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-w-2xl md:grid-cols-2">
              <div>
                <Label>Fiscal Year</Label>
                <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={2000} max={2100} />
              </div>
              <div>
                <Label>Month</Label>
                <select className="w-full border rounded h-10 px-2 bg-background" value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={closeMonth} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Close {MONTHS[month-1]} {year}
              </Button>
              <Button variant="secondary" onClick={closeYear} disabled={busy}>
                <Lock className="h-4 w-4 mr-2" /> Close Year {year}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Year-end close posts net income to Retained Earnings through the existing closing RPC.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Period control history</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              tableId="period-close-periods"
              columns={periodColumns}
              data={periods}
              loading={loading}
              searchPlaceholder={null}
              empty="No periods recorded yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/period-close")({
  head: () => ({ meta: [{ title: "Period Close — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PeriodClose,
});
