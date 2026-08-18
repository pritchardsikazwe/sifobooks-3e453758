import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Receipt, Landmark, BarChart3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/invoices", label: "Sales", icon: Receipt },
  { to: "/banking", label: "Banking", icon: Landmark },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

/**
 * Premium touch-first bottom navigation shown only on small screens.
 * 44px+ targets, safe-area aware, emerald active state, centre FAB.
 */
export function SifoMobileNav() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-[0_-4px_20px_rgba(20,50,40,0.06)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 items-center px-1">
        {ITEMS.slice(0, 2).map(i => <NavItem key={i.to} {...i} pathname={pathname} />)}
        <div className="flex items-center justify-center">
          <Link
            to="/posting-wizard"
            aria-label="New transaction"
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(20,80,60,0.35)] ring-4 ring-card transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        {ITEMS.slice(2).map(i => <NavItem key={i.to} {...i} pathname={pathname} />)}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon, pathname }: {
  to: string; label: string; icon: any; pathname: string;
}) {
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className={cn("grid h-7 w-7 place-items-center rounded-lg transition-colors", active && "bg-primary/10")}>
        <Icon className="h-[21px] w-[21px]" />
      </span>
      {label}
    </Link>
  );
}
