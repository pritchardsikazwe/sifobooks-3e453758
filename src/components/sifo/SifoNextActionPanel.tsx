import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkTask } from "@/lib/workflow-engine";

function icon(name?: string) {
  return (name && (Icons as any)[name]) || Icons.Sparkles;
}

/** SifoGuide card: the next best action, explained in plain language. */
export function SifoNextActionPanel({
  tasks,
  title = "SifoGuide — what to do next",
  emptyText = "Nothing needs your attention right now. Your books are up to date.",
  max = 4,
  className,
}: {
  tasks: WorkTask[];
  title?: string;
  emptyText?: string;
  max?: number;
  className?: string;
}) {
  const shown = tasks.slice(0, max);
  return (
    <Card className={cn("border-primary/25 bg-primary/[0.03] p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icons.Sparkles className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => {
            const Icon = icon(t.iconName);
            return (
              <li
                key={t.id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{t.title}</span>
                      {t.priority === "high" && <Badge variant="destructive" className="text-[10px]">Do first</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.explanation}</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary" className="shrink-0">
                  <Link to={t.actionUrl}>{t.actionLabel}</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Post-save panel: what just happened, what it did to the books, what to do next. */
export function SifoCompletionPanel({
  title,
  statusLabel,
  impact,
  steps,
  lifecycle,
  currentStage,
  className,
}: {
  title: string;
  statusLabel?: string;
  impact: string[];
  steps: { label: string; to: string; hint?: string }[];
  lifecycle?: string[];
  currentStage?: number;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Icons.CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <h2 className="text-base font-semibold">{title}</h2>
        {statusLabel && <Badge variant="outline">{statusLabel}</Badge>}
      </div>

      {lifecycle && lifecycle.length > 0 && (
        <ol className="mt-3 flex flex-wrap items-center gap-1 text-[11px]">
          {lifecycle.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              {i > 0 && <Icons.ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5",
                  currentStage !== undefined && i <= currentStage
                    ? "bg-primary/10 font-medium text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {s}
              </span>
            </li>
          ))}
        </ol>
      )}

      {impact.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What this did to your books</div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {impact.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next step</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <Button key={s.label} asChild size="sm" variant={i === 0 ? "default" : "outline"} title={s.hint}>
              <Link to={s.to}>
                <span className="mr-1 text-xs opacity-70">{i + 1}</span>
                {s.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
