import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SmartReporterInsight = {
  severity: "critical" | "warning" | "healthy" | "opportunity";
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
};

export type SifoSmartReporterProps = {
  insights: SmartReporterInsight[];
  title?: string;
  generatedAt?: string;
};

const icons = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  healthy: CheckCircle2,
  opportunity: Lightbulb,
};

export function SifoSmartReporter({ insights, title = "Smart Reporter", generatedAt }: SifoSmartReporterProps) {
  return (
    <aside className="sifo-smart-reporter" aria-label={title}>
      <div className="sifo-smart-reporter-header">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <div><strong>{title}</strong><p>Evidence-based report insights</p></div>
        </div>
        {generatedAt && <span className="text-xs text-muted-foreground">{generatedAt}</span>}
      </div>
      <div className="grid gap-2 p-3">
        {insights.length === 0 ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No issues or opportunities were detected for the selected report.</div> : insights.map((insight, index) => {
          const Icon = icons[insight.severity];
          return <div key={`${insight.title}-${index}`} className="sifo-smart-insight">
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1"><div className="font-semibold">{insight.title}</div><p>{insight.detail}</p>{insight.action && <Button variant="outline" size="sm" className="mt-2 h-8" onClick={insight.onAction}>{insight.action}</Button>}</div>
          </div>;
        })}
      </div>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">AI suggestions are advisory. SifoBooks never posts or changes accounting records automatically.</div>
    </aside>
  );
}
