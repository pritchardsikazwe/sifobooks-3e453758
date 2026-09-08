import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  loadAssignment, currentShiftFor, shiftTotals, expectedCash, kw,
  type CashierAssignment, type ShiftTotals,
} from "@/lib/cashier-workspace";
import { usePosContext } from "@/components/pos/PosContextProvider";

export const Route = createFileRoute("/_worker/w/")({
  head: () => ({
    meta: [
      { title: "Cashier Workspace — SifoBooks" },
      { name: "description", content: "Your till: today's sales, current shift, expected cash and the quick actions a cashier needs — nothing else." },
      { property: "og:title", content: "Cashier Workspace — SifoBooks" },
      { property: "og:description", content: "Sell, look up stock, check your shift and cash up from one simple screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CashierHome,
});

function CashierHome() {
  const ctx = usePosContext();
  const navigate = useNavigate();
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [shift, setShift] = useState<Record<string, any> | null>(null);
  const [totals, setTotals] = useState<ShiftTotals | null>(null);
  const [lowStock, setLowStock] = useState<number>(0);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void (async () => {
      const asg = await loadAssignment();
      setA(asg);
      if (!asg) return;
      const s = await currentShiftFor(asg.cashierUserId);
      setShift(s);
      if (s?.id) setTotals(await shiftTotals(s.id));
      if (asg.locationId) {
        const { data } = await supabase
          .from("stock_balances")
          .select("qty, stock_items(reorder_level)")
          .eq("location_id", asg.locationId);
        setLowStock(
          (data ?? []).filter((r: any) => Number(r.qty ?? 0) <= Number(r.stock_items?.reorder_level ?? 0)).length,
        );
      }
    })();
  }, []);

  const isRestaurant = ["waiter", "kitchen"].includes(a?.posRole ?? "");
  const expected = expectedCash(shift, totals ?? { transactions: 0, salesTotal: 0, itemsSold: 0, refunds: 0, discounts: 0, byMethod: {} });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const actions: { label: string; icon: keyof typeof Icons; to?: string; onClick?: () => void; tone?: string }[] = [
    { label: "New sale", icon: "ShoppingCart", to: isRestaurant ? "/w/pos" : "/pos", tone: "bg-emerald-500 text-slate-950" },
    { label: "My sales", icon: "ReceiptText", to: "/w/sales" },
    { label: "Stock lookup", icon: "Boxes", to: "/w/stock" },
    { label: "Returns", icon: "Undo2", to: isRestaurant ? "/w/orders" : "/pos" },
    { label: "My shift", icon: "Clock", to: "/w/shift" },
    { label: "Cash drawer", icon: "Banknote", to: "/w/cash" },
    { label: "Log out", icon: "LogOut", onClick: signOut, tone: "bg-rose-500/15 text-rose-300" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{a?.displayName ?? ctx?.displayName ?? "Cashier"}</h1>
            <p className="text-sm text-slate-400">
              {a?.branchName ?? a?.locationName ?? "Your store"}
              {a?.stationName ? ` · ${a.stationName}` : ""}
              {a?.drawerName ? ` · ${a.drawerName}` : ""}
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <div>{clock.toLocaleDateString("en-ZM", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
            <div>{clock.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className={shift ? "text-emerald-400" : "text-amber-400"}>
              {shift ? `Shift open since ${new Date(shift.opened_at).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}` : "No shift open"}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Today's sales" value={kw(totals?.salesTotal ?? 0)} icon="TrendingUp" />
        <Card label="Transactions" value={String(totals?.transactions ?? 0)} icon="Receipt" />
        <Card label="Items sold" value={String(totals?.itemsSold ?? 0)} icon="Package" />
        <Card label="Expected cash" value={kw(expected)} icon="Wallet" />
      </div>

      {lowStock > 0 && (
        <Link to="/w/stock" className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <Icons.TriangleAlert className="h-4 w-4" />
          {lowStock} item{lowStock === 1 ? "" : "s"} at or below reorder level at your store
        </Link>
      )}

      {!shift && (
        <Link to="/w/shift" className="block rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Start your shift before selling — tap here to enter your opening cash.
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((act) => {
          const Icon = (Icons as any)[act.icon] ?? Icons.Circle;
          const cls = `flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 px-3 py-6 text-sm font-semibold ${act.tone ?? "bg-slate-900/60 text-slate-100 hover:bg-slate-800"}`;
          return act.to ? (
            <Link key={act.label} to={act.to} className={cls}>
              <Icon className="h-6 w-6" /> {act.label}
            </Link>
          ) : (
            <button key={act.label} onClick={act.onClick} className={cls}>
              <Icon className="h-6 w-6" /> {act.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: string; icon: keyof typeof Icons }) {
  const Icon = (Icons as any)[icon] ?? Icons.Circle;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
