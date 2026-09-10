import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Block, Kpi, Tone } from "@/lib/demo/types";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  good: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  bad: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-primary/10 text-primary border-primary/30",
};

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", toneClass[tone])}>
      {children}
    </span>
  );
}

function statusTone(value: string): Tone {
  const v = value.toLowerCase();
  if (/(complete|paid|settled|posted|approved|cleared|ready|active|good|up|served|allocated|received|published|submitted|on shift|selling|open)/.test(v)) return "good";
  if (/(pending|provisional|hold|held|review|warn|waiting|due|part|in progress|in transit|low|marks pending|near full|busy|in service|in kitchen)/.test(v)) return "warn";
  if (/(out of order|overdue|late|arrears|down|blocked|86|failed|cancel)/.test(v)) return "bad";
  return "info";
}

export function DemoKpis({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            <p className={cn("mt-1 text-xl font-bold", kpi.tone === "good" && "text-emerald-600 dark:text-emerald-400", kpi.tone === "warn" && "text-amber-600 dark:text-amber-400", kpi.tone === "bad" && "text-destructive")}>
              {kpi.value}
            </p>
            {kpi.hint ? <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DemoBlock({ block }: { block: Block }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{block.title}</CardTitle>
        {"note" in block && block.note ? <p className="text-xs text-muted-foreground">{block.note}</p> : null}
      </CardHeader>
      <CardContent className="pt-0">
        {block.kind === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {block.columns.map((col, i) => (
                    <th key={col} className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", block.numericColumns?.includes(i) && "text-right")}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-b border-border/50 last:border-0">
                    {row.map((cell, c) => (
                      <td key={c} className={cn("px-3 py-2 align-middle", block.numericColumns?.includes(c) && "text-right tabular-nums")}>
                        {block.statusColumn === c ? <Pill tone={statusTone(String(cell))}>{cell}</Pill> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {block.kind === "board" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {block.columns.map((col) => (
              <div key={col.label} className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{col.label}</span>
                  <Pill tone={col.tone ?? "neutral"}>{col.cards.length}</Pill>
                </div>
                <div className="space-y-2">
                  {col.cards.map((card) => (
                    <div key={card.title} className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm font-semibold">{card.title}</p>
                      {card.meta ? <p className="mt-0.5 text-xs text-muted-foreground">{card.meta}</p> : null}
                      {card.badge ? <div className="mt-2"><Pill tone={col.tone ?? "info"}>{card.badge}</Pill></div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {block.kind === "panel" ? (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {block.items.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 border-b border-border/50 pb-2">
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className={cn("text-sm font-semibold text-right", item.tone === "good" && "text-emerald-600 dark:text-emerald-400", item.tone === "warn" && "text-amber-600 dark:text-amber-400", item.tone === "bad" && "text-destructive", item.tone === "info" && "text-primary")}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {block.kind === "notes" ? (
          <ul className="space-y-2">
            {block.lines.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {block.kind === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {block.cells.map((cell) => (
              <div key={cell.label} className={cn("rounded-lg border p-3", toneClass[cell.tone ?? "neutral"])}>
                <p className="text-sm font-bold">{cell.label}</p>
                {cell.sub ? <p className="mt-0.5 text-xs opacity-80">{cell.sub}</p> : null}
                {cell.badge ? <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">{cell.badge}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
