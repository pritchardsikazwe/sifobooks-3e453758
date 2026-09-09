import { Link } from "@tanstack/react-router";
import { useState } from "react";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DOCUMENT_GUIDANCE, type DocContext } from "@/lib/document-guidance";
import { cn } from "@/lib/utils";

/**
 * Collapsible "how this workflow runs" strip for list/process screens.
 *
 * Shows the lifecycle, a plain-language accounting explanation and the real
 * next actions. Nothing here posts — every step is a link to the existing
 * screen that performs the work through the existing services.
 */
export function SifoWorkflowGuide({
  doc,
  context = {},
  className,
  defaultOpen = false,
}: {
  doc: keyof typeof DOCUMENT_GUIDANCE | string;
  context?: DocContext;
  className?: string;
  defaultOpen?: boolean;
}) {
  const guidance = DOCUMENT_GUIDANCE[doc as string];
  const [open, setOpen] = useState(defaultOpen);
  if (!guidance) return null;

  const impact = guidance.impact(context);
  const steps = guidance.steps(context);

  return (
    <Card className={cn("border-primary/20 bg-primary/[0.03] p-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <Icons.Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold">How this works, and what to do next</span>
        <span className="ml-auto hidden flex-wrap items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          {guidance.lifecycle.map((stage, i) => (
            <span key={stage} className="flex items-center gap-1">
              {i > 0 && <Icons.ChevronRight className="h-3 w-3" />}
              {stage}
            </span>
          ))}
        </span>
        <Icons.ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {impact.map((line) => (
              <li key={line} className="flex gap-2">
                <Icons.Dot className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {steps.map((s, i) => (
              <Button key={s.to + s.label} asChild size="sm" variant={i === 0 ? "default" : "outline"}>
                <Link to={s.to} title={s.hint}>{s.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
