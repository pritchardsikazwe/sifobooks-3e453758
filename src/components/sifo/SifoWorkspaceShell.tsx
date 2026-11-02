import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SifoPage } from "./SifoWorkspacePrimitives";

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
    <SifoPage className={cn("space-y-5", className)}>
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

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-[#087A4B] ring-1 ring-emerald-200/70">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-[#173B3A] sm:text-2xl">{title}</h1>
            {purpose && <p className="text-xs text-muted-foreground sm:text-sm">{purpose}</p>}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
      </div>

      {kpis && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{kpis}</div>}
      {tabs && <div className="min-w-0 overflow-x-auto rounded-xl border border-[#DCE9E5] bg-white px-2 pt-1 shadow-[0_2px_10px_rgba(20,55,45,.035)]">{tabs}</div>}
      {children}
    </SifoPage>
  );
}
