import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, ReceiptText, Banknote, UtensilsCrossed, LayoutGrid, ClipboardList, ChefHat, Boxes, Users, FileText, BarChart3, ShieldCheck, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hasPerm, type Access } from "@/lib/rbac";
import { fmtMoney } from "@/lib/format";

type Tile = { title: string; sub: string; to: string; icon: any; show: boolean };

/** Simple, least-privilege home for staff: only the things they may use. */
export function StaffDashboard({ access }: { access: Access }) {
  const [name, setName] = useState("");
  const [todaySales, setTodaySales] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [openShift, setOpenShift] = useState<boolean | null>(null);

  const retail = hasPerm(access, "pos.retail.access");
  const resto = hasPerm(access, "pos.restaurant.access");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setName(access.full_name || (u.user.user_metadata as any)?.full_name || (u.user.email ?? "").split("@")[0]);
      const start = new Date(); start.setHours(0, 0, 0, 0);
      if (retail) {
        const q = supabase.from("pos_sales").select("total, status").gte("created_at", start.toISOString()).eq("status", "completed");
        const { data } = await q;
        setTodaySales((data ?? []).reduce((s: number, r: any) => s + Number(r.total || 0), 0));
        setTodayCount((data ?? []).length);
        const { data: sh } = await supabase.from("pos_shifts").select("id").eq("status", "open").limit(1);
        setOpenShift(Boolean(sh?.length));
      } else if (resto) {
        const { data } = await supabase.from("restaurant_orders").select("total, status").gte("created_at", start.toISOString()).in("status", ["paid", "closed", "completed"]);
        setTodaySales((data ?? []).reduce((s: number, r: any) => s + Number(r.total || 0), 0));
        setTodayCount((data ?? []).length);
        const { data: sh } = await supabase.from("restaurant_shifts").select("id").is("clock_out", null).limit(1);
        setOpenShift(Boolean(sh?.length));
      }
    })();
  }, [access, retail, resto]);

  const tiles: Tile[] = [
    { title: "New Sale", sub: "Open the till", to: "/pos", icon: ShoppingCart, show: retail },
    { title: "My Sales", sub: "Today's transactions & receipts", to: "/pos-sales", icon: ReceiptText, show: retail },
    { title: "My Shift", sub: openShift ? "Shift open — close at end of day" : "Open a cash shift", to: "/pos", icon: Banknote, show: retail && hasPerm(access, "cash_shift.open") },
    { title: "Retail Command Center", sub: "Cashier activity, shifts, refunds", to: "/pos/retail-command-center", icon: Gauge, show: retail && hasPerm(access, "pos.sales.view_all") },
    { title: "Restaurant POS", sub: "Take orders", to: "/restaurant/pos", icon: UtensilsCrossed, show: resto },
    { title: "Tables", sub: "Seat guests & manage tables", to: "/restaurant/tables", icon: LayoutGrid, show: resto },
    { title: "Orders", sub: "Open & recent orders", to: "/restaurant/orders", icon: ClipboardList, show: resto },
    { title: "Kitchen", sub: "Order tickets", to: "/restaurant/kitchen", icon: ChefHat, show: hasPerm(access, "kitchen.access") },
    { title: "My Shift / Cash", sub: openShift ? "Shift open" : "Open a shift", to: "/restaurant/cash", icon: Banknote, show: resto && hasPerm(access, "cash_shift.open") },
    { title: "Products & Stock", sub: "Inventory on hand", to: "/inventory", icon: Boxes, show: hasPerm(access, "inventory.view") },
    { title: "Customers", sub: "Customer accounts", to: "/customers", icon: Users, show: hasPerm(access, "accounting.view") },
    { title: "Invoices", sub: "Sales invoices", to: "/invoices", icon: FileText, show: hasPerm(access, "accounting.view") },
    { title: "Reports", sub: "Financial reports", to: "/reports", icon: BarChart3, show: hasPerm(access, "financial_reports.view") },
    { title: "Team & Roles", sub: "Users and permissions", to: "/roles", icon: ShieldCheck, show: hasPerm(access, "users.manage") },
  ].filter(t => t.show);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome{name ? `, ${name}` : ""}</h1>
        <p className="text-sm text-muted-foreground">
          {access.role_name ?? "Staff"}{access.branch_name ? ` · ${access.branch_name}` : ""}
        </p>
      </div>

      {(retail || resto) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Kpi label="My sales today" value={fmtMoney(todaySales)} />
          <Kpi label="Transactions" value={String(todayCount)} />
          <Kpi label="Shift" value={openShift === null ? "—" : openShift ? "Open" : "Closed"} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(t => (
          <Link key={t.title} to={t.to as any} className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><t.icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">{t.sub}</div>
              </div>
            </div>
          </Link>
        ))}
        {tiles.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No features have been assigned to your role yet. Ask your manager to grant access.
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}
