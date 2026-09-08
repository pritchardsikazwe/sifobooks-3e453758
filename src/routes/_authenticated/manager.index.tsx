import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { kw } from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_authenticated/manager/")({
  head: () => ({
    meta: [
      { title: "Manager Dashboard — SifoBooks" },
      { name: "description", content: "Today's branch sales, open cashier shifts, pending approvals, cash and stock variances, transfers and low stock at a glance." },
      { property: "og:title", content: "Manager Dashboard — SifoBooks" },
      { property: "og:description", content: "Run the branch: shifts, approvals, variances, transfers and cashier performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManagerDashboard,
});

type Metrics = {
  sales: number; transactions: number; openShifts: number; pending: number;
  cashVariance: number; returns: number; discounts: number; transfers: number; inTransit: number; lowStock: number;
};

function ManagerDashboard() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    void (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [salesRes, shiftsRes, transfersRes, stockRes] = await Promise.all([
        supabase.from("pos_sales").select("total,discount,status").gte("sold_at", start.toISOString()),
        supabase.from("pos_shifts").select("status,review_status,variance"),
        supabase.from("inventory_transfers").select("status"),
        supabase.from("stock_balances").select("qty, stock_items(reorder_level)"),
      ]);
      const sales = (salesRes.data ?? []) as any[];
      const shifts = (shiftsRes.data ?? []) as any[];
      const transfers = (transfersRes.data ?? []) as any[];
      const stock = (stockRes.data ?? []) as any[];
      const done = sales.filter((s) => s.status === "completed");
      setM({
        sales: done.reduce((a, s) => a + Number(s.total ?? 0), 0),
        transactions: done.length,
        openShifts: shifts.filter((s) => s.status === "open").length,
        pending: shifts.filter((s) => s.review_status === "pending_review").length,
        cashVariance: shifts.filter((s) => s.review_status === "pending_review").reduce((a, s) => a + Number(s.variance ?? 0), 0),
        returns: sales.filter((s) => s.status === "refunded").reduce((a, s) => a + Number(s.total ?? 0), 0),
        discounts: done.reduce((a, s) => a + Number(s.discount ?? 0), 0),
        transfers: transfers.filter((t) => ["draft", "dispatched", "pending"].includes(String(t.status))).length,
        inTransit: transfers.filter((t) => String(t.status) === "dispatched").length,
        lowStock: stock.filter((r) => Number(r.qty ?? 0) <= Number(r.stock_items?.reorder_level ?? 0)).length,
      });
    })();
  }, []);

  const cards: { label: string; value: string; icon: keyof typeof Icons; to: string }[] = [
    { label: "Today's sales", value: kw(m?.sales ?? 0), icon: "TrendingUp", to: "/pos-sales" },
    { label: "Transactions", value: String(m?.transactions ?? 0), icon: "Receipt", to: "/pos-sales" },
    { label: "Open shifts", value: String(m?.openShifts ?? 0), icon: "Clock", to: "/manager/shifts" },
    { label: "Pending approvals", value: String(m?.pending ?? 0), icon: "ClipboardCheck", to: "/manager/shifts" },
    { label: "Cash variance (pending)", value: kw(m?.cashVariance ?? 0), icon: "Wallet", to: "/manager/shifts" },
    { label: "Today's returns", value: kw(m?.returns ?? 0), icon: "Undo2", to: "/pos-sales" },
    { label: "Today's discounts", value: kw(m?.discounts ?? 0), icon: "Percent", to: "/pos-sales" },
    { label: "Pending transfers", value: String(m?.transfers ?? 0), icon: "Truck", to: "/inventory/transfers" },
    { label: "Stock in transit", value: String(m?.inTransit ?? 0), icon: "Boxes", to: "/inventory/transfers" },
    { label: "Low stock items", value: String(m?.lowStock ?? 0), icon: "TriangleAlert", to: "/inventory/control-center" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = (Icons as any)[c.icon] ?? Icons.Circle;
        return (
          <Link key={c.label} to={c.to} className="rounded-2xl border bg-card p-4 transition hover:border-primary">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4" /> {c.label}
            </div>
            <div className="mt-1 text-xl font-bold">{c.value}</div>
          </Link>
        );
      })}
    </div>
  );
}
