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

        {block.kind === "map" ? (
          <div className="space-y-5">
            {block.areas.map((area) => (
              <div key={area.label}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{area.label}</p>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  {area.cells.map((cell) => (
                    <div
                      key={area.label + cell.label}
                      className={cn(
                        "group relative flex aspect-[4/3] flex-col justify-between rounded-xl border-2 p-3 transition hover:-translate-y-0.5 hover:shadow-md",
                        toneClass[cell.tone],
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-lg font-black leading-none">{cell.label}</span>
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                          {cell.state}
                        </span>
                      </div>
                      <div>
                        {cell.meta ? <p className="text-xs font-medium opacity-80">{cell.meta}</p> : null}
                        {cell.amount ? <p className="text-sm font-bold tabular-nums">{cell.amount}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {block.legend?.length ? (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {block.legend.map((l) => (
                  <Pill key={l.label} tone={l.tone}>{l.label}</Pill>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {block.kind === "tickets" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {block.lanes.map((lane) => (
              <div key={lane.label} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{lane.label}</span>
                  <Pill tone={lane.tone}>{lane.tickets.length}</Pill>
                </div>
                <div className="space-y-2">
                  {lane.tickets.map((t) => (
                    <div key={t.ref} className={cn("rounded-lg border-l-4 border border-border bg-background p-3", toneClass[lane.tone].split(" ").find((c) => c.startsWith("border-")) ?? "")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{t.table}</span>
                        {t.timer ? <span className="text-xs font-bold tabular-nums text-muted-foreground">{t.timer}</span> : null}
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.ref}</p>
                      <ul className="mt-2 space-y-0.5 text-xs">
                        {t.items.map((i) => (
                          <li key={i}>• {i}</li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {t.priority ? <Pill tone={lane.tone}>{t.priority}</Pill> : <span />}
                        {t.action ? (
                          <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">{t.action}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {block.kind === "chart" ? <DemoChart block={block} /> : null}

        {block.kind === "menu" ? (
          <div>
            {block.categories?.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {block.categories.map((c, i) => (
                  <span
                    key={c}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-bold",
                      i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {block.items.map((item) => (
                <div key={item.name} className="flex flex-col justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/50 hover:shadow-sm">
                  <div>
                    <p className="text-sm font-bold leading-tight">{item.name}</p>
                    {item.category ? <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.category}</p> : null}
                    {item.tags?.length ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.tags.join(" · ")}</p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-black tabular-nums">{item.price}</span>
                    {item.state ? <Pill tone={item.tone ?? statusTone(item.state)}>{item.state}</Pill> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {block.kind === "flow" ? (
          <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
            {block.steps.map((step, i) => (
              <li key={step.label} className="flex flex-1 items-stretch gap-2">
                <div className={cn("flex-1 rounded-lg border p-3", toneClass[step.tone ?? "neutral"])}>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Step {i + 1}</p>
                  <p className="text-sm font-bold">{step.label}</p>
                  {step.detail ? <p className="mt-0.5 text-xs opacity-80">{step.detail}</p> : null}
                  {step.state ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wide">{step.state}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DemoChart({ block }: { block: Extract<Block, { kind: "chart" }> }) {
  const max = Math.max(...block.series.map((s) => s.value), 1);
  const total = block.series.reduce((s, x) => s + x.value, 0) || 1;

  if (block.variant === "donut") {
    let offset = 0;
    const stops = block.series.map((s) => {
      const start = (offset / total) * 100;
      offset += s.value;
      const end = (offset / total) * 100;
      return { s, start, end };
    });
    const palette = ["var(--color-primary)", "color-mix(in oklab, var(--color-primary) 65%, transparent)", "color-mix(in oklab, var(--color-primary) 40%, transparent)", "color-mix(in oklab, var(--color-primary) 22%, transparent)"];
    const gradient = stops
      .map(({ start, end }, i) => `${palette[i % palette.length]} ${start}% ${end}%`)
      .join(", ");
    return (
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="h-40 w-40 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${gradient})`, mask: "radial-gradient(circle, transparent 54%, black 55%)", WebkitMask: "radial-gradient(circle, transparent 54%, black 55%)" }}
        />
        <ul className="flex-1 space-y-2">
          {block.series.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-3 border-b border-border/50 pb-1.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: palette[i % palette.length] }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums">
                {Math.round((s.value / total) * 100)}% · {block.unit ?? ""}{s.value.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.variant === "line") {
    const pts = block.series.map((s, i) => {
      const x = (i / Math.max(block.series.length - 1, 1)) * 100;
      const y = 100 - (s.value / max) * 88 - 6;
      return `${x},${y}`;
    });
    return (
      <div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full">
          <polyline points={`0,100 ${pts.join(" ")} 100,100`} fill="color-mix(in oklab, var(--color-primary) 14%, transparent)" stroke="none" />
          <polyline points={pts.join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
          {block.series.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {block.series.map((s) => (
        <div key={s.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{s.label}</span>
            <span className="font-semibold tabular-nums">{block.unit ?? ""}{s.value.toLocaleString()}</span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                s.tone === "good" && "bg-emerald-500",
                s.tone === "warn" && "bg-amber-500",
                s.tone === "bad" && "bg-destructive",
                (!s.tone || s.tone === "neutral" || s.tone === "info") && "bg-primary",
              )}
              style={{ width: `${Math.max((s.value / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
