import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Lock, Unlock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DTColumn } from "@/components/data-table";
import { toast } from "sonner";

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
    setBusy(true);
    const { error } = await supabase.rpc("close_month", { _year: year, _month: month });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Closed ${MONTHS[month-1]} ${year}`);
    load();
  };

  const closeYear = async () => {
    if (!confirm(`Close year ${year}? This posts the year-end closing entry to Retained Earnings.`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("close_year", { _year: year });
    setBusy(false);
    if (error) return toast.error(error.message);
    const d = data as any;
    toast.success(`Year ${year} closed. Net ${Number(d?.net_income ?? 0).toFixed(2)}`);
    load();
  };

  const reopen = async (p: any) => {
    if (!confirm(`Reopen ${p.period_type === "year" ? "year "+p.fiscal_year : MONTHS[(p.period_month||1)-1]+" "+p.fiscal_year}?`)) return;
    const { error } = await supabase.rpc("reopen_period", {
      _year: p.fiscal_year, _month: p.period_month ?? 1, _period_type: p.period_type,
    });
    if (error) return toast.error(error.message);
    toast.success("Reopened");
    load();
  };

  const periodColumns: DTColumn<any>[] = [
    { key: "period_type", header: "Type", cell: p => <span className="capitalize">{p.period_type}</span> },
    { key: "fiscal_year", header: "Year" },
    { key: "period_month", header: "Month", cell: p => p.period_month ? MONTHS[p.period_month - 1] : "\u2014" },
    { key: "status", header: "Status" },
    { key: "closed_at", header: "Closed At", cell: p => p.closed_at ? new Date(p.closed_at).toLocaleString() : "\u2014" },
    { key: "notes", header: "Notes", cell: p => <span className="text-xs text-muted-foreground max-w-xs truncate block">{p.notes || ""}</span> },
    { key: "actions", header: "", sortable: false, cell: p => p.status === "closed" ? (
        <Button size="sm" variant="ghost" onClick={() => reopen(p)}><Unlock className="h-4 w-4 mr-1" /> Reopen</Button>
      ) : null },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarClock className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Period Close</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Close a period</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div>
              <Label>Year</Label>
              <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
            <div>
              <Label>Month</Label>
              <select className="w-full border rounded h-10 px-2 bg-background"
                value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={closeMonth} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
              Close Month
            </Button>
            <Button variant="secondary" onClick={closeYear} disabled={busy}>
              <Lock className="h-4 w-4 mr-2" />
              Close Year {year}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Closing a period blocks new or edited journal entries dated inside it. Year-end close also posts the net income to Retained Earnings via an Income Summary account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Closed periods</CardTitle></CardHeader>
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
  );
}

export const Route = createFileRoute("/_authenticated/period-close")({
  head: () => ({ meta: [{ title: "Period Close — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PeriodClose,
});
