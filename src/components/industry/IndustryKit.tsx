import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Info, Search } from "lucide-react";

export type IndustryAccent = "hotel" | "school" | "restaurant";

export const accentRing: Record<IndustryAccent, string> = {
  hotel: "from-indigo-500/10 via-sky-500/5 to-background",
  school: "from-emerald-500/10 via-teal-500/5 to-background",
  restaurant: "from-amber-500/10 via-orange-500/5 to-background",
};

export const accentText: Record<IndustryAccent, string> = {
  hotel: "text-indigo-600 dark:text-indigo-400",
  school: "text-emerald-600 dark:text-emerald-400",
  restaurant: "text-amber-600 dark:text-amber-400",
};

export type NavItem = { label: string; to: string; icon: React.ComponentType<{ className?: string }>; supported?: boolean };

export function IndustryShell({
  accent, product, title, subtitle, nav, active, actions, children,
}: {
  accent: IndustryAccent;
  product: string;
  title: string;
  subtitle: string;
  nav: NavItem[];
  active: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className={cn("rounded-2xl border bg-gradient-to-br p-5", accentRing[accent])}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0">
            <div className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accentText[accent])}>{product}</div>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {actions ? <div className="ml-auto flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {nav.map((n) => {
            const isActive = n.to === active;
            return (
              <Link
                key={n.to}
                to={n.to as never}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-background/70 text-muted-foreground hover:bg-muted",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
                {n.supported === false && !isActive ? <span className="text-[10px] uppercase opacity-70">soon</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}

export function StatGrid({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label} className="rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="mt-2 text-xl font-semibold tabular-nums">{s.value}</div>
          {s.hint ? <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div> : null}
        </Card>
      ))}
    </div>
  );
}

export function Board({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search existing records…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-44 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function RecordTable({
  columns, rows, empty = "No records found in your account yet.",
}: {
  columns: string[];
  rows: { key: string; cells: ReactNode[]; to?: string; params?: Record<string, string> }[];
  empty?: string;
}) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{columns.map((c) => <th key={c} className="px-4 py-3 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t transition-colors hover:bg-muted/40">
              {r.cells.map((cell, i) => (
                <td key={i} className="px-4 py-3">
                  {i === 0 && r.to ? (
                    <Link to={r.to as never} params={r.params as never} className="font-medium text-primary hover:underline">
                      {cell}
                    </Link>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ status }: { status?: string | null }) {
  const v = (status ?? "").toLowerCase();
  const tone =
    ["paid", "active", "completed", "closed", "resolved", "settled"].includes(v) ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : ["partial", "pending", "open", "in progress", "draft"].includes(v) ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
    : ["overdue", "void", "cancelled", "inactive", "suspended"].includes(v) ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
    : "bg-muted text-muted-foreground border-border";
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", tone)}>{status ?? "—"}</span>;
}

/** Big headline metric with icon, optional progress bar and accent tint. */
export function MetricTile({
  label, value, hint, icon: Icon, progress, tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  progress?: number;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneBar =
    tone === "good" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : tone === "bad" ? "bg-rose-500" : "bg-primary";
  return (
    <Card className="rounded-2xl p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{label}</span>
        {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {typeof progress === "number" ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", toneBar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      ) : null}
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

/** Circular percentage gauge — occupancy, collection rate, settlement. */
export function Donut({ value, label, caption, accent = "hotel" }: { value: number; label: string; caption?: string; accent?: IndustryAccent }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = accent === "hotel" ? "stroke-indigo-500" : accent === "school" ? "stroke-emerald-500" : "stroke-amber-500";
  const c = 2 * Math.PI * 42;
  return (
    <Card className="flex items-center gap-4 rounded-2xl p-4">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
          <circle cx="50" cy="50" r="42" className="fill-none stroke-muted" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="42"
            className={cn("fill-none transition-all", stroke)}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{label}</div>
        {caption ? <p className="mt-1 text-sm text-muted-foreground">{caption}</p> : null}
      </div>
    </Card>
  );
}

/** Horizontal comparison bars for mixes (payment methods, revenue by type). */
export function Bars({ items, format }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="p-4 text-sm text-muted-foreground">Nothing recorded yet.</p>;
  return (
    <div className="space-y-3 p-4">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate capitalize">{i.label}</span>
            <span className="tabular-nums text-muted-foreground">{format ? format(i.value) : i.value}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export type TileStatus = "good" | "warn" | "bad" | "info" | "muted";

const tileTone: Record<TileStatus, string> = {
  good: "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500",
  warn: "border-amber-500/40 bg-amber-500/10 hover:border-amber-500",
  bad: "border-rose-500/40 bg-rose-500/10 hover:border-rose-500",
  info: "border-sky-500/40 bg-sky-500/10 hover:border-sky-500",
  muted: "border-border bg-muted/40 hover:border-primary/50",
};

/** A clickable operational tile — room card, table card, class card, student card. */
export function Tile({
  title, subtitle, meta, badge, status = "muted", to, params, onClick,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  status?: TileStatus;
  to?: string;
  params?: Record<string, string>;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-base font-semibold">{title}</span>
        {badge}
      </div>
      {subtitle ? <div className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</div> : null}
      {meta ? <div className="mt-2 text-sm font-medium tabular-nums">{meta}</div> : null}
    </>
  );
  const cls = cn(
    "block rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
    tileTone[status],
  );
  if (to) return <Link to={to as never} params={params as never} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

/** Kanban-style operational board: columns of cards grouped by status. */
export function KanbanBoard({
  columns, empty = "Nothing to show yet.",
}: {
  columns: { key: string; title: string; tone?: TileStatus; cards: { key: string; title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; to?: string; params?: Record<string, string> }[] }[];
  empty?: string;
}) {
  const total = columns.reduce((s, c) => s + c.cards.length, 0);
  if (total === 0) return <div className="p-10 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <div key={col.key} className="rounded-2xl border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{col.title}</span>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold tabular-nums">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {col.cards.length === 0 ? <p className="px-1 py-3 text-xs text-muted-foreground">None</p> : null}
            {col.cards.map((c) => (
              <Tile key={c.key} title={c.title} subtitle={c.subtitle} meta={c.meta} status={col.tone ?? "muted"} to={c.to} params={c.params} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vertical activity timeline — folio charges, payment history, fee history. */
export function Timeline({ items, empty = "No activity recorded." }: { items: { key: string; when: string; title: ReactNode; detail?: ReactNode; amount?: ReactNode }[]; empty?: string }) {
  if (items.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <ol className="space-y-0 p-4">
      {items.map((i, idx) => (
        <li key={i.key} className="relative flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
            {idx < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{i.title}</span>
              {i.amount ? <span className="font-semibold tabular-nums">{i.amount}</span> : null}
            </div>
            <div className="text-xs text-muted-foreground">{i.when}{i.detail ? <> · {i.detail}</> : null}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Circle with initials — guests, learners, staff. */
export function Avatar({ name, accent = "hotel" }: { name: string; accent?: IndustryAccent }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const bg = accent === "hotel" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
    : accent === "school" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
    : "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  return <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", bg)}>{initials}</span>;
}

/** Attractive but honest empty state — never disguises missing data as sample data. */
export function EmptyState({ title, message, action }: { title: string; message: string; action?: { label: string; to: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <span className="rounded-2xl bg-muted p-3 text-muted-foreground"><Info className="h-6 w-6" /></span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      {action ? (
        <Link to={action.to as never} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Honest state for a screen whose data has no backing table in this account.
 * Never renders invented records.
 */
export function NotConnected({ title, reason, alternatives }: { title: string; reason: string; alternatives: { label: string; to: string }[] }) {
  return (
    <Card className="rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-muted p-2 text-muted-foreground"><Info className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{reason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {alternatives.map((a) => (
              <Link key={a.to} to={a.to as never} className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
