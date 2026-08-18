import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

/**
 * Single KPI tile used across the dashboard and every module header strip.
 * The accent colour is inherited from the owning module.
 */
export function SifoKpiCard({
  label, value, module = "accounting", icon: Icon, delta, hint, to, series, positive = true, className,
}: {
  label: string;
  value: string;
  module?: ModuleKey;
  icon?: any;
  /** Percentage change vs prior period. */
  delta?: number | null;
  hint?: string;
  to?: string;
  series?: number[];
  /** When false, a rising delta is treated as bad (e.g. expenses). */
  positive?: boolean;
  className?: string;
}) {
  const theme = moduleTheme(module);
  const up = delta != null && delta >= 0;
  const good = positive ? up : !up;

  const body = (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-[0_4px_18px_rgba(20,50,40,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,50,40,0.10)] sm:p-4",
      className,
    )}>

      <span className={cn("absolute inset-y-0 left-0 w-[3px]", theme.bar)} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">{label}</div>
          <div className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-foreground sm:text-xl">{value}</div>
        </div>
        {Icon && (
          <div className={cn("hidden shrink-0 place-items-center rounded-lg p-2 transition-transform group-hover:scale-105 sm:grid", theme.chip)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {delta != null ? (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold",
            good ? "bg-state-paid/12 text-state-paid" : "bg-state-overdue/12 text-state-overdue",
          )}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : hint ? (
          <span className="truncate text-[11px] text-muted-foreground">{hint}</span>
        ) : <span />}
        {series && series.length > 1 && <SifoSparkline data={series} good={good} />}
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export function SifoSparkline({ data, good = true }: { data: number[]; good?: boolean }) {
  const w = 60, h = 20;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke={good ? "var(--color-state-paid)" : "var(--color-state-overdue)"}
        strokeWidth={1.5}
        points={points}
      />
    </svg>
  );
}
