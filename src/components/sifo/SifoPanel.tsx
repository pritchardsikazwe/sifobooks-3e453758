import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

/** Card shell used for every dashboard widget and module panel. */
export function SifoPanel({
  title, subtitle, action, module, children, className, bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  module?: ModuleKey;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const theme = module ? moduleTheme(module) : null;
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md", className)}>
      {theme && <span className={cn("absolute inset-x-0 top-0 h-[3px]", theme.bar)} />}
      {(title || action) && (
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            {title && <div className="truncate text-sm font-semibold text-foreground">{title}</div>}
            {subtitle && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
