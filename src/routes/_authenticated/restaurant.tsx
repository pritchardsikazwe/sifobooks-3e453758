import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { RequireModule } from "@/components/RequireModule";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, UtensilsCrossed, LayoutGrid, CalendarClock, ListOrdered, ChefHat,
  BookOpen, PhoneCall, Banknote, MoonStar, BarChart3, Settings, Wallet,
  Star, Clock, Layers, Bike, ShieldCheck, Boxes, Printer, Users2, WalletCards,
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
  { to: "/restaurant/items-stock", label: "Items & Stock", icon: Boxes },
  { to: "/restaurant/combos", label: "Combos", icon: Layers },
  { to: "/restaurant/call-center", label: "Call centre", icon: PhoneCall },
  { to: "/restaurant/dispatch", label: "Dispatch", icon: Bike },
  { to: "/restaurant/loyalty", label: "Loyalty", icon: Star },
  { to: "/restaurant/shifts", label: "Shifts", icon: Clock },
  { to: "/restaurant/cash", label: "Cash", icon: Banknote },
  { to: "/restaurant/end-of-day", label: "End of day", icon: MoonStar },
  { to: "/restaurant/cash-drawers", label: "Cash drawers", icon: WalletCards },
  { to: "/restaurant/reports", label: "Reports", icon: BarChart3 },
  { to: "/restaurant/stock-reports", label: "Stock Reports", icon: Boxes },
  { to: "/restaurant/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/restaurant/settings", label: "Settings", icon: Settings },
  { to: "/stock", label: "Inventory", icon: Boxes },
  { to: "/manager/cashiers", label: "Cashiers", icon: Users2 },
  { to: "/printing-settings", label: "Printing", icon: Printer },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

function RestaurantShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const primary = NAV.slice(0, 7);
  const secondary = NAV.slice(7);

  return (
    <div className="restaurant-2026-shell min-h-[calc(100dvh-2rem)] bg-[#f4f7f6] text-[#173b3a] -mx-2 -mt-2">
      <header className="restaurant-2026-header sticky top-0 z-40 border-b border-[#164744] bg-[#073b38] text-white shadow-lg">
        <div className="flex min-h-[72px] items-center gap-5 px-4 lg:px-7">
          <Link to="/restaurant" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#e5b83f] bg-[#0c514b] text-[#e5b83f] shadow-inner">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div className="leading-none">
              <div className="text-[23px] font-black tracking-tight">SifoBooks</div>
              <div className="mt-1 text-[11px] font-medium tracking-[.22em] text-[#d7e6e3]">RESTAURANT POS</div>
            </div>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-6 xl:flex">
            {[
              ["/restaurant/pos","Dine-In"],
              ["/restaurant/tables","Tables"],
              ["/restaurant/orders","Orders"],
              ["/restaurant/kitchen","Kitchen"],
              ["/restaurant/menu","Menu"],
              ["/restaurant/reports","Reports"],
              ["/restaurant/stock-reports","Stock Reports"],
            ].map(([to,label]) => (
              <Link key={to} to={to as never} className={cn("text-sm font-semibold transition", path===to || path.startsWith(to+"/") ? "text-[#e5b83f]" : "text-white/75 hover:text-white")}>{label}</Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link to="/restaurant/pos" className="hidden rounded-xl bg-[#07834f] px-4 py-2.5 text-sm font-black shadow-md hover:bg-[#07965a] sm:inline-flex">
              OPEN POS
            </Link>
            <Avatar className="h-9 w-9 border border-white/20"><AvatarFallback className="bg-[#e5b83f] text-[#173b3a] font-black">C</AvatarFallback></Avatar>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-bold">C001</div>
              <div className="text-[10px] text-white/65">Cashier</div>
            </div>
            <Link to="/auth" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Switch user">⌄</Link>
          </div>
        </div>
        <div className="hidden gap-2 overflow-x-auto border-t border-white/10 bg-[#062f2d] px-4 py-2 lg:flex no-scrollbar">
          {secondary.map(n => {
            const active=n.exact?path===n.to:path.startsWith(n.to);
            return <Link key={n.to} to={n.to as never} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",active?"bg-[#e5b83f] text-[#173b3a] shadow-sm":"text-white/70 hover:bg-white/10 hover:text-white")}>
              <span className="inline-flex items-center gap-1.5">{n.icon && <n.icon className="h-3.5 w-3.5" />}{n.label}</span>
            </Link>;
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-2 xl:hidden">
          {primary.map(n => {
            const active=n.exact?path===n.to:path.startsWith(n.to);
            return <Link key={n.to} to={n.to as never} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",active?"bg-[#07834f] text-white":"text-white/70 hover:bg-white/10")}>{n.label}</Link>;
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-3 sm:p-5 lg:p-6">
        {path === "/restaurant" && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e5b83f]/15 px-3 py-1.5 text-xs font-black text-[#866611]">RESTAURANT MANAGEMENT</span>
            <span className="text-sm text-[#6c7f7d]">Serve better. Grow faster.</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
