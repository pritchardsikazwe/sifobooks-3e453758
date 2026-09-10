import { AlertTriangle, CheckCircle2, Info, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildInsights, type Insight, type ReportId, type Severity } from "@/lib/reports/insights";
import type { ReportResult } from "@/lib/reports/engine";

const STYLE: Record<Severity, { icon: typeof Info; ring: string; badge: string; label: string }> = {
  critical: { icon: ShieldAlert, ring: "border-l-4 border-l-destructive", badge: "bg-destructive/10 text-destructive border-destructive/30", label: "Critical" },
  warning: { icon: AlertTriangle, ring: "border-l-4 border-l-amber-500", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30", label: "Warning" },
  healthy: { icon: CheckCircle2, ring: "border-l-4 border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", label: "Healthy" },
  opportunity: { icon: Lightbulb, ring: "border-l-4 border-l-primary", badge: "bg-primary/10 text-primary border-primary/30", label: "Opportunity" },
  info: { icon: Info, ring: "border-l-4 border-l-muted-foreground/40", badge: "bg-muted text-muted-foreground border-border", label: "Information" },
};

const ORDER: Severity[] = ["critical", "warning", "opportunity", "healthy", "info"];

/**
 * Read-only analysis of the report currently on screen.
 * It never posts, adjusts or deletes anything.
 */
export function SifoSmartReporter({
  reportId,
  result,
  className,
}: {
  reportId: ReportId;
  result: ReportResult | null;
  className?: string;
}) {
  if (!result) return null;
  const insights: Insight[] = buildInsights(reportId, result).sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity),
  );
  if (!insights.length) return null;

  return (
    <Card className={`p-4 print:break-inside-avoid ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Smart Reporter</h2>
        <span className="text-xs text-muted-foreground">
          Read-only analysis of the figures shown above
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((i) => {
          const s = STYLE[i.severity];
          const Icon = s.icon;
          return (
            <div key={i.id} className={`rounded-md border bg-card p-3 ${s.ring}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{i.title}</span>
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${s.badge}`}>{s.label}</Badge>
                <Badge variant="outline" className="ml-auto text-[10px] uppercase tracking-wide">
                  {i.confidence} confidence
                </Badge>
              </div>
              <dl className="mt-2 space-y-1.5 text-xs">
                <div>
                  <dt className="inline font-semibold text-foreground">Fact: </dt>
                  <dd className="inline text-muted-foreground">{i.fact}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-foreground">Interpretation: </dt>
                  <dd className="inline text-muted-foreground">{i.interpretation}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-foreground">Next action: </dt>
                  <dd className="inline text-muted-foreground">{i.action}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
