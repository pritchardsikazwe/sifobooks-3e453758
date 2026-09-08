import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Receipt, Landmark, BarChart3, Plus, ShoppingCart, ReceiptText, UtensilsCrossed, LayoutGrid, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPerm } from "@/lib/rbac";

const OWNER_ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/invoices", label: "Sales", icon: Receipt },
  { to: "/banking", label: "Banking", icon: Landmark },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

/**
 * Premium touch-first bottom navigation shown only on small screens.
 * 44px+ targets, safe-area aware, emerald active state, centre FAB.
 * Staff see only the destinations their permissions allow.
 */
export function SifoMobileNav() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { isStaff, access, loading } = usePermissions();
  if (loading) return null;

  let items = OWNER_ITEMS;
  let fab = { to: "/posting-wizard", label: "New transaction" };
  if (isStaff) {
    const a = access;
    items = [{ to: "/dashboard", label: "Home", icon: Home }];
    if (hasPerm(a, "pos.retail.access")) {
      items.push({ to: "/pos", label: "POS", icon: ShoppingCart }, { to: "/pos-sales", label: "My Sales", icon: ReceiptText });
      fab = { to: "/pos", label: "New sale" };
    } else if (hasPerm(a, "pos.restaurant.access")) {
      items.push({ to: "/restaurant/pos", label: "POS", icon: UtensilsCrossed }, { to: "/restaurant/tables", label: "Tables", icon: LayoutGrid });
      fab = { to: "/restaurant/pos", label: "New order" };
    } else if (hasPerm(a, "accounting.view")) {
      items.push({ to: "/invoices", label: "Sales", icon: Receipt }, { to: "/banking", label: "Banking", icon: Landmark });
    }
    if (hasPerm(a, "cash_shift.open")) items.push({ to: hasPerm(a, "pos.retail.access") ? "/pos-sales" : "/restaurant/cash", label: "My Shift", icon: Banknote });
    else if (hasPerm(a, "financial_reports.view")) items.push({ to: "/reports", label: "Reports", icon: BarChart3 });
    // de-dup by path, keep 4 max
    const seen = new Set<string>();
    items = items.filter(i => (seen.has(i.to) ? false : (seen.add(i.to), true))).slice(0, 4);
  }
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-[0_-4px_20px_rgba(20,50,40,0.06)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 items-center px-1">
        {left.map(i => <NavItem key={i.to} {...i} pathname={pathname} />)}
        <div className="flex items-center justify-center">
          <Link
            to={fab.to as any}
            aria-label={fab.label}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(20,80,60,0.35)] ring-4 ring-card transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        {right.map(i => <NavItem key={i.to} {...i} pathname={pathname} />)}
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
      to={to as any}
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
