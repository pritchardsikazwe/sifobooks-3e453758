import { Link } from "@tanstack/react-router";
import { MODULE_THEMES, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

const ORDER: ModuleKey[] = ["accounting", "sales", "purchases", "inventory", "banking", "payroll", "tax", "reports"];

/**
 * Horizontal, colour-coded module navigation shown under the dashboard header.
 * Scrolls horizontally on small screens; each entry carries its module hue.
 */
export function SifoModuleStrip({ active, className }: { active?: ModuleKey; className?: string }) {
  return (
    <div className={cn("-mx-1 overflow-x-auto", className)}>
      <div className="flex min-w-max items-center gap-2 px-1 pb-1">
        {ORDER.map(key => {
          const m = MODULE_THEMES[key];
          const isActive = active === key;
          return (
            <Link
              key={key}
              to={m.to}
              className={cn(
                "group relative flex min-h-[40px] items-center gap-2 overflow-hidden rounded-lg border bg-card px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                isActive ? cn(m.border, m.text) : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("absolute inset-x-0 bottom-0 h-[3px] transition-opacity", m.bar, isActive ? "opacity-100" : "opacity-30 group-hover:opacity-70")} />
              <span className={cn("h-2 w-2 rounded-full", m.bar)} />
              {m.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
