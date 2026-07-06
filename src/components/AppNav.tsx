import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Landmark, ShieldCheck, Package } from "lucide-react";

const links = [
  { to: "/dashboard",  label: "Invoices",   icon: LayoutDashboard },
  { to: "/stock",      label: "Stock",      icon: Package },
  { to: "/banking",    label: "Banking",    icon: Landmark },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
] as const;

export function AppNav() {
  return (
    <nav className="flex items-center gap-1">
      {links.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeProps={{ className: "bg-primary/10 text-primary" }}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
