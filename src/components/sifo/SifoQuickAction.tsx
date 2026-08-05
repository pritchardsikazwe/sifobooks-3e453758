import { Link } from "@tanstack/react-router";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

/** Compact, colour-accented action tile used in "What do you want to do?". */
export function SifoQuickAction({
  to, icon: Icon, label, module = "accounting", hint, className,
}: { to: string; icon: any; label: string; module?: ModuleKey; hint?: string; className?: string }) {
  const theme = moduleTheme(module);
  return (
    <Link
      to={to}
      title={hint ?? label}
      className={cn(
        "group flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
        theme.hoverBorder,
        className,
      )}
    >
      <span className={cn("grid h-8 w-8 place-items-center rounded-lg transition-transform group-hover:scale-110", theme.chip)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-foreground">{label}</span>
    </Link>
  );
}
