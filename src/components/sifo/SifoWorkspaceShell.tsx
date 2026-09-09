import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One consistent workspace container for every hub and major module page:
 * breadcrumb, title, one-sentence purpose, primary action, KPI strip, tabs.
 */
export function SifoWorkspaceShell({
  title,
  purpose,
  icon: Icon,
  breadcrumbs = [],
  actions,
  kpis,
  tabs,
  children,
  className,
}: {
  title: string;
  purpose?: string;
  icon?: any;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  actions?: React.ReactNode;
  kpis?: React.ReactNode;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6", className)}>
      {breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
              {b.to ? (
                <Link to={b.to} className="hover:text-foreground hover:underline">{b.label}</Link>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            {purpose && <p className="text-xs text-muted-foreground sm:text-sm">{purpose}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {kpis && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{kpis}</div>}
      {tabs}
      {children}
    </div>
  );
}
