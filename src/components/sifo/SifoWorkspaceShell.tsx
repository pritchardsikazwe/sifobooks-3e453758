import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceTab = { label: string; href: string; active?: boolean };

type Props = {
  title: string;
  purpose: string;
  breadcrumb?: string[];
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  tabs?: WorkspaceTab[];
  search?: string;
  onSearchChange?: (value: string) => void;
  stats?: { label: string; value: string | number; tone?: "default" | "success" | "warning" | "danger" }[];
  children: ReactNode;
  className?: string;
};

const toneClass = {
  default: "text-foreground",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-destructive",
};

export function SifoWorkspaceShell({
  title,
  purpose,
  breadcrumb = [],
  primaryAction,
  tabs = [],
  search,
  onSearchChange,
  stats = [],
  children,
  className,
}: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7", className)}>
      {breadcrumb.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {breadcrumb.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span>/</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">{purpose}</p>
        </div>
        {primaryAction && (
          primaryAction.href ? (
            <Button asChild className="shrink-0 gap-1.5">
              <Link to={primaryAction.href as any}>{primaryAction.label}<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          ) : (
            <Button onClick={primaryAction.onClick} className="shrink-0 gap-1.5">
              {primaryAction.label}<ArrowRight className="h-4 w-4" />
            </Button>
          )
        )}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-4 lg:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</div>
              <div className={cn("mt-0.5 text-base font-semibold", toneClass[stat.tone ?? "default"])}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {(tabs.length > 0 || onSearchChange) && (
        <div className="sticky top-0 z-10 -mx-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {tabs.length > 0 && (
              <nav className="flex min-w-0 gap-1 overflow-x-auto pb-0.5" aria-label={`${title} navigation`}>
                {tabs.map((tab) => (
                  <Button key={tab.href} asChild size="sm" variant={tab.active ? "secondary" : "ghost"} className="h-8 shrink-0 text-xs">
                    <Link to={tab.href as any}>{tab.label}</Link>
                  </Button>
                ))}
              </nav>
            )}
            {onSearchChange && (
              <div className="relative w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search ?? ""} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search this workspace…" className="h-8 pl-8 text-xs" />
              </div>
            )}
          </div>
        </div>
      )}

      <main className="pt-4">{children}</main>
    </div>
  );
}
