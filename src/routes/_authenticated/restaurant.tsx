import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { RequireModule } from "@/components/RequireModule";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, UtensilsCrossed, LayoutGrid, CalendarClock, ListOrdered, ChefHat,
  BookOpen, PhoneCall, Banknote, MoonStar, BarChart3, Settings, Wallet,
  Star, Clock, Layers, Bike,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant")({
  component: () => (
    <RequireModule moduleKey="restaurant">
      <RestaurantShell />
    </RequireModule>
  ),
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/restaurant", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/restaurant/pos", label: "POS", icon: UtensilsCrossed },
  { to: "/restaurant/tables", label: "Tables", icon: LayoutGrid },
  { to: "/restaurant/reservations", label: "Reservations", icon: CalendarClock },
  { to: "/restaurant/orders", label: "Orders", icon: ListOrdered },
  { to: "/restaurant/kitchen", label: "Kitchen", icon: ChefHat },
  { to: "/restaurant/menu", label: "Menu", icon: BookOpen },
  { to: "/restaurant/combos", label: "Combos", icon: Layers },
  { to: "/restaurant/call-center", label: "Call centre", icon: PhoneCall },
  { to: "/restaurant/dispatch", label: "Dispatch", icon: Bike },
  { to: "/restaurant/loyalty", label: "Loyalty", icon: Star },
  { to: "/restaurant/shifts", label: "Shifts", icon: Clock },
  { to: "/restaurant/cash", label: "Cash", icon: Banknote },
  { to: "/restaurant/end-of-day", label: "End of day", icon: MoonStar },
  { to: "/restaurant/reports", label: "Reports", icon: BarChart3 },
  { to: "/restaurant/settings", label: "Settings", icon: Settings },
];

function RestaurantShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-30 -mx-2 px-2 py-2 backdrop-blur bg-background/80 border-b">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <span className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-sm font-semibold">
            <UtensilsCrossed className="h-4 w-4" /> Restaurant
          </span>
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as never}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
          <Link
            to="/dashboard"
            className="shrink-0 ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Wallet className="h-4 w-4" /> Accounting
          </Link>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
