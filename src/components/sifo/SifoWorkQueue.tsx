import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtMoney } from "@/lib/format";
import { buildWorkQueue, loadWorkSnapshot, type WorkTask } from "@/lib/workflow-engine";

function icon(name?: string) {
  return (name && (Icons as any)[name]) || Icons.Circle;
}

/** Home work queue: only real, live conditions produce a card. */
export function SifoWorkQueue({ currency = "ZMW" }: { currency?: string }) {
  const [tasks, setTasks] = useState<WorkTask[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await loadWorkSnapshot();
        if (alive) setTasks(buildWorkQueue(snap));
      } catch {
        if (alive) setTasks([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (tasks === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const attention = tasks.filter((t) => t.group === "attention");
  const suggested = tasks.filter((t) => t.group === "suggested");

  if (tasks.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <Icons.CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <div>
          <div className="text-sm font-semibold">Nothing needs your attention</div>
          <p className="text-xs text-muted-foreground">No overdue invoices, unallocated bank items or pending approvals right now.</p>
        </div>
      </Card>
    );
  }

  const section = (label: string, list: WorkTask[]) =>
    list.length === 0 ? null : (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const Icon = icon(t.iconName);
            return (
              <Card key={t.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.priority === "high" ? "text-destructive" : "text-primary"}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug">{t.title}</div>
                    {t.amount ? (
                      <div className="text-sm font-bold tabular-nums">{fmtMoney(t.amount, currency)}</div>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t.explanation}</p>
                <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
                  <Link to={t.actionUrl}>{t.actionLabel}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );

  return (
    <Card className="rounded-2xl border-[#DDEBE6] bg-white p-4 shadow-[0_4px_18px_rgba(20,50,40,0.05)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">To Do List</div>
          <h2 className="mt-1 text-base font-bold text-foreground">Things that need your attention</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Live actions generated from your business records.</p>
        </div>
        <Icons.ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />
      </div>
      <div className="space-y-4">
      {section("Needs your attention", attention)}
      {section("Suggested next actions", suggested)}
      </div>
    </Card>
  );
}
