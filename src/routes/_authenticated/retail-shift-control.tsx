import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Banknote, Calculator, Clock3, ExternalLink, RefreshCw, ShieldAlert, UserRound, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { shiftSummary } from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/retail-shift-control")({
  head: () => ({ meta: [{ title: "Retail Shift Control — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: RetailShiftControl,
});

type Shift = {
  id: string;
  register_id: string | null;
  cashier_name: string | null;
  opening_float: number | null;
  status: string;
  opened_at: string | null;
  closed_at: string | null;
  actual_cash: number | null;
  expected_cash: number | null;
  variance: number | null;
};

type Detail = { transactions: number; salesTotal: number; voids: number; refunds: number; byMethod: Record<string, number> };
const money = (v: number) => new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", maximumFractionDigits: 2 }).format(Number(v || 0));

function RetailShiftControl() {
  const { has } = usePermissions();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("pos_shifts")
        .select("id,register_id,cashier_name,opening_float,status,opened_at,closed_at,actual_cash,expected_cash,variance")
        .order("opened_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data ?? []) as Shift[];
      setShifts(rows);
      const open = rows.filter((s) => s.status === "open");
      const pairs = await Promise.all(open.map(async (s) => [s.id, await shiftSummary(s.id)] as const));
      setDetails(Object.fromEntries(pairs));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load shift control");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!has("reports.view")) return <div className="p-6"><Card><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto mb-3 h-8 w-8" /><h2 className="text-lg font-semibold">Manager access required</h2><p className="mt-1 text-sm text-muted-foreground">You need the reports.view permission to open Shift Control.</p></CardContent></Card></div>;

  const open = shifts.filter((s) => s.status === "open");
  const closedToday = shifts.filter((s) => s.status === "closed" && s.closed_at && new Date(s.closed_at).toDateString() === new Date().toDateString());
  const variance = closedToday.reduce((a, s) => a + Number(s.variance || 0), 0);

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><div className="flex items-center gap-2"><WalletCards className="h-6 w-6" /><h1 className="text-2xl font-semibold tracking-tight">Retail Shift Control</h1><Badge variant="secondary">Manager</Badge></div><p className="mt-1 text-sm text-muted-foreground">Control cashier shifts, opening floats, cash expectations and close variances.</p></div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link to="/pos"><ExternalLink className="mr-2 h-4 w-4" />Open POS</Link></Button><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Refresh</Button></div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Open Shifts</p><p className="mt-2 text-2xl font-semibold">{open.length}</p><p className="mt-1 text-xs text-muted-foreground">Active cashier sessions</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Opening Float</p><p className="mt-2 text-2xl font-semibold">{money(open.reduce((a, s) => a + Number(s.opening_float || 0), 0))}</p><p className="mt-1 text-xs text-muted-foreground">Across open shifts</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Closed Today</p><p className="mt-2 text-2xl font-semibold">{closedToday.length}</p><p className="mt-1 text-xs text-muted-foreground">Completed cashier closes</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Today's Variance</p><p className={`mt-2 text-2xl font-semibold ${variance === 0 ? "" : variance < 0 ? "text-destructive" : "text-amber-600"}`}>{money(variance)}</p><p className="mt-1 text-xs text-muted-foreground">Actual cash less expected cash</p></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" />Cashier Sessions</CardTitle></CardHeader><CardContent>
      {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading shifts…</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-2 text-left">Cashier</th><th className="text-left">Register</th><th className="text-left">Opened</th><th className="text-left">Status</th><th className="text-right">Float</th><th className="text-right">Sales</th><th className="text-right">Variance</th></tr></thead><tbody className="divide-y">{shifts.map((s) => { const d = details[s.id]; return <tr key={s.id}><td className="py-3 font-medium"><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" />{s.cashier_name || "Unnamed cashier"}</span></td><td className="text-muted-foreground">{s.register_id ? s.register_id.slice(0, 8) : "—"}</td><td className="text-muted-foreground">{s.opened_at ? new Date(s.opened_at).toLocaleString() : "—"}</td><td><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status}</Badge></td><td className="text-right">{money(Number(s.opening_float || 0))}</td><td className="text-right">{d ? money(d.salesTotal) : s.status === "closed" ? "—" : "Loading…"}</td><td className={`text-right font-medium ${Number(s.variance || 0) === 0 ? "" : Number(s.variance || 0) < 0 ? "text-destructive" : "text-amber-600"}`}>{s.status === "closed" ? money(Number(s.variance || 0)) : "Pending close"}</td></tr>; })}{!shifts.length && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No cashier shifts found.</td></tr>}</tbody></table></div>}
    </CardContent></Card>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />Close Control</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">At shift close, record actual cash and compare it against expected cash. Variances remain visible for manager review.</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4" />Payment Breakdown</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Open a cashier session to review cash, card, mobile-money and account collections before closing.</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Next Control Layer</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Manager approval, variance reasons and immutable shift-close audit records will sit on top of this control view.</CardContent></Card>
    </div>
  </div>;
}
