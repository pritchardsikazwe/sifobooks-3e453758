import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Banknote, CircleDollarSign, Clock3, Percent, RefreshCw, RotateCcw, ShieldAlert, ShoppingCart, Users, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { loadRetailControlSummary, type RetailControlSummary } from "@/lib/retail-control-center";

export const Route = createFileRoute("/_authenticated/retail-control-center")({
  head: () => ({ meta: [{ title: "Retail Control Center" }, { name: "description", content: "Retail sales, cashier shifts, refunds, voids and discount control." }] }),
  component: RetailControlCenter,
});

const empty: RetailControlSummary = { openShifts: 0, activeCashiers: 0, todaySales: 0, todayRefunds: 0, todayVoids: 0, todayDiscounts: 0, offlinePending: 0 };
const money = (value: number) => new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", maximumFractionDigits: 2 }).format(value);

function Metric({ title, value, icon: Icon, description }: { title: string; value: string; icon: typeof Activity; description: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="rounded-xl border p-2.5"><Icon className="h-5 w-5" /></div></div></CardContent></Card>;
}

function RetailControlCenter() {
  const { can } = usePermissions();
  const [summary, setSummary] = useState(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setSummary(await loadRetailControlSummary()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load retail control center"); }
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

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" />Manager Control Checklist</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {["Review open cashier shifts", "Review refunds and voids", "Review discount activity", "Reconcile cash at close"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border p-4"><Activity className="h-4 w-4 shrink-0" /><span className="text-sm">{item}</span></div>)}
    </CardContent></Card>
  </div>;
}
