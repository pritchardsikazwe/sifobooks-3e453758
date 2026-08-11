import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Receipt, Landmark, BarChart3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home, tint: "text-mod-accounting" },
  { to: "/invoices", label: "Sales", icon: Receipt, tint: "text-mod-sales" },
  { to: "/banking", label: "Banking", icon: Landmark, tint: "text-mod-banking" },
  { to: "/reports", label: "Reports", icon: BarChart3, tint: "text-mod-reports" },
];

/**
 * Touch-first bottom navigation shown only on small screens.
 * 44px+ targets, safe-area aware, mirrors the module colour system.
 */
export function SifoMobileNav() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 items-center">
        {ITEMS.slice(0, 2).map(i => <NavItem key={i.to} {...i} pathname={pathname} />)}
        <Link
          to="/posting-wizard"
          aria-label="New transaction"
          className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </Link>
        {ITEMS.slice(2).map(i => <NavItem key={i.to} {...i} pathname={pathname} />)}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon, tint, pathname }: {
  to: string; label: string; icon: any; tint: string; pathname: string;
}) {
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
        active ? tint : "text-muted-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}
