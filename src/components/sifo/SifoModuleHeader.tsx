import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { SifoModuleTabs, type SifoTab } from "./SifoModuleTabs";
import { cn } from "@/lib/utils";

/**
 * Standard module page header: icon + name, description, breadcrumb, toolbar,
 * then the colour-coded tab strip. Every module page should open with this.
 */
export function SifoModuleHeader({
  module, title, description, icon: Icon, breadcrumbs = [], actions, tabs, showTabs = true, children, className,
}: {
  module: ModuleKey;
  title: string;
  description?: string;
  icon?: any;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  /** Search / filter / export / add buttons. */
  actions?: React.ReactNode;
  tabs?: SifoTab[];
  showTabs?: boolean;
  /** KPI summary strip rendered under the tabs. */
  children?: React.ReactNode;
  className?: string;
}) {
  const theme = moduleTheme(module);
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
              {b.to ? <Link to={b.to} className="hover:text-foreground hover:underline">{b.label}</Link> : <span>{b.label}</span>}
            </span>
          ))}
        </nav>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", theme.chip)}>
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {showTabs && <SifoModuleTabs module={module} tabs={tabs} />}
      {children}
    </div>
  );
}
