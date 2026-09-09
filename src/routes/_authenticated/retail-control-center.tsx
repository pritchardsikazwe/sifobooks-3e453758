import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Banknote, CircleDollarSign, Clock3, ExternalLink, Percent, RefreshCw, RotateCcw, ShieldAlert, ShoppingCart, Users, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { loadRetailControlSummary, type RetailControlSummary } from "@/lib/retail-control-center";

export const Route = createFileRoute("/_authenticated/retail-control-center")({
  head: () => ({ meta: [{ title: "Retail Control Center" }, { name: "description", content: "Retail sales, cashier shifts, refunds, voids and discount control." }] }),
  component: RetailControlCenter,
});

type ExceptionRow = { id: string; status: string; total: number; discount: number; sold_at: string; created_by: string | null };
const empty: RetailControlSummary = { openShifts: 0, activeCashiers: 0, todaySales: 0, todayRefunds: 0, todayVoids: 0, todayDiscounts: 0, offlinePending: 0 };
const money = (value: number) => new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", maximumFractionDigits: 2 }).format(value);

function Metric({ title, value, icon: Icon, description }: { title: string; value: string; icon: typeof Activity; description: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="rounded-xl border p-2.5"><Icon className="h-5 w-5" /></div></div></CardContent></Card>;
}

function RetailControlCenter() {
  const { can } = usePermissions();
  const [summary, setSummary] = useState(empty);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [next, result] = await Promise.all([
        loadRetailControlSummary(),
        supabase.from("pos_sales").select("id,status,total,discount,sold_at,created_by").in("status", ["refunded", "voided"]).order("sold_at", { ascending: false }).limit(12),
      ]);
      if (result.error) throw result.error;
      setSummary(next);
      setExceptions((result.data ?? []) as ExceptionRow[]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load retail control center"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!can("reports.view")) return <div className="p-6"><Card><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto mb-3 h-8 w-8" /><h2 className="text-lg font-semibold">Manager access required</h2><p className="mt-1 text-sm text-muted-foreground">You need the reports.view permission to open the Retail Control Center.</p></CardContent></Card></div>;

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><div className="flex items-center gap-2"><Activity className="h-6 w-6" /><h1 className="text-2xl font-semibold tracking-tight">Retail Control Center</h1><Badge variant="secondary">Manager</Badge></div><p className="mt-1 text-sm text-muted-foreground">Live control view for sales, shifts and POS exceptions.</p></div>
      <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Refresh</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Sales Today" value={money(summary.todaySales)} icon={CircleDollarSign} description="Completed POS sales" />
      <Metric title="Open Shifts" value={String(summary.openShifts)} icon={Clock3} description={`${summary.activeCashiers} active cashier${summary.activeCashiers === 1 ? "" : "s"}`} />
      <Metric title="Refunds" value={money(summary.todayRefunds)} icon={RotateCcw} description="Today's posted refunds" />
      <Metric title="Voids" value={money(summary.todayVoids)} icon={XCircle} description="Today's voided sales" />
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Metric title="Discounts" value={money(summary.todayDiscounts)} icon={Percent} description="Discount value on completed sales" />
      <Metric title="Cashier Activity" value={String(summary.activeCashiers)} icon={Users} description="Cashiers with an open shift" />
      <Metric title="Offline Queue" value={String(summary.offlinePending)} icon={ShoppingCart} description="Transactions waiting to sync" />
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Recent POS Exceptions</CardTitle></CardHeader><CardContent>
        {exceptions.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No refunds or voids found in the accessible POS records.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-2 text-left">Time</th><th className="text-left">Type</th><th className="text-right">Amount</th><th className="text-right">Discount</th></tr></thead><tbody className="divide-y">{exceptions.map((row) => <tr key={row.id}><td className="py-2 text-muted-foreground">{new Date(row.sold_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td><td><Badge variant={row.status === "voided" ? "destructive" : "outline"}>{row.status}</Badge></td><td className="text-right font-medium">{money(Math.abs(Number(row.total || 0)))}</td><td className="text-right text-muted-foreground">{money(Number(row.discount || 0))}</td></tr>)}</tbody></table></div>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" />Control Actions</CardTitle></CardHeader><CardContent className="space-y-2">
        <Button asChild className="w-full justify-between"><Link to="/pos"><span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Open Retail POS</span><ExternalLink className="h-4 w-4" /></Link></Button>
        <Button asChild variant="outline" className="w-full justify-between"><Link to="/reconciliation"><span className="flex items-center gap-2"><Banknote className="h-4 w-4" />Bank & Cash Reconciliation</span><ExternalLink className="h-4 w-4" /></Link></Button>
        <Button asChild variant="outline" className="w-full justify-between"><Link to="/audit-logs"><span className="flex items-center gap-2"><Activity className="h-4 w-4" />Audit Logs</span><ExternalLink className="h-4 w-4" /></Link></Button>
      </CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Manager Control Checklist</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{["Review open cashier shifts", "Review refunds and voids", "Review discount activity", "Reconcile cash at close"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border p-4"><Activity className="h-4 w-4 shrink-0" /><span className="text-sm">{item}</span></div>)}</CardContent></Card>
  </div>;
}
