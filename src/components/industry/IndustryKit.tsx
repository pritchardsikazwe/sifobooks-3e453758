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
