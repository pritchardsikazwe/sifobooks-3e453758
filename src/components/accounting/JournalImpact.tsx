import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ImpactLine = {
  account_code: string;
  account_name: string;
  description: string | null;
  debit: number;
  credit: number;
};

/** Loads the real posted journal for a source document and shows its DR/CR effect. */
export function useJournalImpact(entryId?: string | null) {
  const [lines, setLines] = useState<ImpactLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!entryId) { setLines([]); return; }
    setLoading(true);
    supabase
      .from("journal_lines")
      .select("debit,credit,description,account:account_id(account_code,account_name)")
      .eq("entry_id", entryId)
      .then(({ data }) => {
        if (cancelled) return;
        setLines(
          (data ?? []).map((l: any) => ({
            account_code: l.account?.account_code ?? "",
            account_name: l.account?.account_name ?? "Unknown account",
            description: l.description,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
        );
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [entryId]);

  return { lines, loading };
}

export function JournalImpact({
  entryId,
  title = "Accounting entry",
  className,
}: {
  entryId?: string | null;
  title?: string;
  className?: string;
}) {
  const { lines, loading } = useJournalImpact(entryId);
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.005 && totalDebit > 0;

  if (!entryId) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground", className)}>
        This record has not been posted to the ledger yet, so there is no accounting entry to show.
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
        <div className="flex items-center gap-2">
          <BalanceChip balanced={balanced} diff={diff} />
          <Link
            to="/journal-entry/$id"
            params={{ id: entryId }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View journal <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-1.5 text-left font-medium">Account</th>
              <th className="px-3 py-1.5 text-right font-medium">Debit</th>
              <th className="px-3 py-1.5 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <div className="truncate">
                    <span className="font-mono text-xs text-muted-foreground">{l.account_code}</span> {l.account_name}
                  </div>
                  {l.description && <div className="truncate text-xs text-muted-foreground">{l.description}</div>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.debit ? fmtMoney(l.debit) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.credit ? fmtMoney(l.credit) : "—"}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">No journal lines found for this entry.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/40 font-semibold">
              <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(totalDebit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

export function BalanceChip({ balanced, diff }: { balanced: boolean; diff: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        balanced ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
      )}
    >
      {balanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {balanced ? "Balanced" : `Difference: ${fmtMoney(Math.abs(diff))}`}
    </span>
  );
}
