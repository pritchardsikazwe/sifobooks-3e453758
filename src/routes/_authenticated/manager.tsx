import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/manager")({
  component: ManagerLayout,
});

const TABS = [
  { to: "/manager", label: "Dashboard", exact: true },
  { to: "/manager/shifts", label: "Cashier shifts" },
  { to: "/manager/cashiers", label: "Cashiers & history" },
];

function ManagerLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manager workspace</h1>
        <p className="text-sm text-muted-foreground">Branch operations, cashier shifts, variances and approvals.</p>
      </div>
      <nav className="flex gap-2 border-b">
        {TABS.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-3 py-2 text-sm ${active ? "border-b-2 border-primary font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
