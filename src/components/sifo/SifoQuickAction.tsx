import { Link } from "@tanstack/react-router";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

/**
 * Premium quick-action card used in the dashboard command centre.
 * Icon chip + title + one-line description, compact on mobile (2-col grid).
 */
export function SifoQuickAction({
  to, icon: Icon, label, module = "accounting", hint, description, className,
}: {
  to: string; icon: any; label: string; module?: ModuleKey;
  hint?: string; description?: string; className?: string;
}) {
  const theme = moduleTheme(module);
  const desc = description ?? hint;
  return (
    <Link
      to={to}
      title={hint ?? label}
      aria-label={label}
      className={cn(
        "group flex min-h-[112px] flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3.5",
        "shadow-[0_4px_18px_rgba(20,50,40,0.05)] transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,50,40,0.10)] active:translate-y-0 active:scale-[0.985]",
        theme.hoverBorder,
        className,
      )}
    >
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform group-hover:scale-105", theme.chip)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-tight text-foreground">{label}</span>
        {desc && <span className="mt-1 block text-[12px] leading-snug text-muted-foreground line-clamp-2">{desc}</span>}
      </span>
    </Link>
  );
}
