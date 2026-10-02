import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Canonical content width and vertical rhythm for SifoBooks 2026 workspaces. */
export function SifoPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("page-enter mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:px-8", className)}>{children}</div>;
}

/** One consistent responsive action/filter surface above operational tables. */
export function SifoFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center", className)}>
      {onSearchChange && (
        <div className="relative min-w-0 flex-1 lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
          />
        </div>
      )}
      {filters && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{filters}</div>}
      {actions && <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{actions}</div>}
    </div>
  );
}

/** Consistent inset section used inside forms, drawers and document editors. */
export function SifoSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/25 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}