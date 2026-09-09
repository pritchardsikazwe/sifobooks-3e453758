import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNextActionForStatus, getSifoGuide, type SifoGuideAction, type SifoWorkflowKind } from "@/lib/sifoGuide";

type Props = {
  kind: SifoWorkflowKind;
  status?: string | null;
  title?: string;
  description?: string;
  accountingImpact?: string[];
  actions?: SifoGuideAction[];
  onAction?: (action: SifoGuideAction) => void;
};

export function SifoNextActionPanel({
  kind,
  status,
  title,
  description,
  accountingImpact,
  actions,
  onAction,
}: Props) {
  const guide = getSifoGuide(kind);
  const next = getNextActionForStatus(kind, status);
  const visibleActions = actions ?? guide.actions;

  return (
    <Card className="border-primary/15 bg-primary/[0.025] shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
            <Lightbulb className="h-4 w-4" />
          </span>
          {title ?? "SifoGuide — next step"}
        </CardTitle>
        <p className="text-xs leading-5 text-muted-foreground">
          {description ?? guide.explanation}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {guide.steps.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {guide.steps.map((step, index) => {
              const active = next?.id === step.id;
              return (
                <div key={step.id} className="flex items-center gap-1.5">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      active ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {step.completed ? <CheckCircle2 className="h-3 w-3" /> : null}
                    {step.label}
                  </div>
                  {index < guide.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                </div>
              );
            })}
          </div>
        )}

        {next && (
          <div className="rounded-lg border border-primary/15 bg-background p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Recommended</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{next.label}</div>
            {next.description && <div className="mt-1 text-xs text-muted-foreground">{next.description}</div>}
            {next.route ? (
              <Button asChild size="sm" className="mt-3 h-8 gap-1.5">
                <Link to={next.route as any}>
                  {next.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : onAction ? (
              <Button size="sm" className="mt-3 h-8 gap-1.5" onClick={() => onAction(next)}>
                {next.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        )}

        {accountingImpact && accountingImpact.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">What SifoBooks will record</div>
            <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
              {accountingImpact.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        )}

        {visibleActions.length > 1 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {visibleActions.filter(a => a.id !== next?.id).slice(0, 3).map(action =>
              action.route ? (
                <Button key={action.id} asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link to={action.route as any}>{action.label}</Link>
                </Button>
              ) : onAction ? (
                <Button key={action.id} size="sm" variant="outline" className="h-8 text-xs" onClick={() => onAction(action)}>
                  {action.label}
                </Button>
              ) : null,
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
