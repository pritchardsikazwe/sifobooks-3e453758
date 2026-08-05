import { Link, useRouterState } from "@tanstack/react-router";
import { MODULE_TABS, moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

export type SifoTab = { label: string; to: string; count?: number | null };

/**
 * Hercules-style stacked tab strip. Horizontally scrollable on mobile,
 * tinted with the owning module's identity colour.
 */
export function SifoModuleTabs({
  module, tabs, className,
}: { module: ModuleKey; tabs?: SifoTab[]; className?: string }) {
  const theme = moduleTheme(module);
  const items = tabs ?? MODULE_TABS[module];
  const pathname = useRouterState({ select: s => s.location.pathname });

  return (
    <div className={cn("-mx-1 overflow-x-auto pb-1", className)}>
      <div className="flex min-w-max items-end gap-1 px-1">
        {items.map(t => {
          const active = pathname === t.to || pathname.startsWith(`${t.to}/`);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "group relative flex items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-2 text-[13px] font-medium transition-all duration-200",
                active
                  ? cn("bg-card text-foreground shadow-sm", theme.border)
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className={cn(
                "absolute inset-x-0 top-0 h-[3px] rounded-t-lg transition-opacity",
                theme.bar,
                active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
              )} />
              {t.label}
              {t.count != null && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", theme.chip)}>
                  {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="h-px w-full bg-border" />
    </div>
  );
}
