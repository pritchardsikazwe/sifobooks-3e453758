import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PreviewLine = {
  account: string;      // "6100 — Office Expenses"
  description?: string;
  debit: number;
  credit: number;
};

/**
 * Shows exactly what a transaction will do to the ledger before it is posted.
 * Callers should refuse to post when `isBalanced(lines)` is false.
 */
export function isBalanced(lines: PreviewLine[], tolerance = 0.005) {
  const d = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const c = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  return Math.abs(d - c) < tolerance && d > 0;
}

export function PostingPreview({ lines, title = "Transaction preview", className }: { lines: PreviewLine[]; title?: string; className?: string }) {
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = isBalanced(lines);

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            balanced ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
          )}
        >
          {balanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {balanced ? "Balanced" : "Not balanced"}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-1.5 text-left font-medium">Account</th>
            <th className="px-3 py-1.5 text-right font-medium">Debit</th>
            <th className="px-3 py-1.5 text-right font-medium">Credit</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-xs text-muted-foreground">
                Choose accounts and an amount to see the accounting effect.
              </td>
            </tr>
          )}
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-border/60">
              <td className="px-3 py-1.5">
                <div className="truncate">{l.account}</div>
                {l.description && <div className="truncate text-xs text-muted-foreground">{l.description}</div>}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? fmtMoney(l.debit) : "—"}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? fmtMoney(l.credit) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-semibold">
            <td className="px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">Total</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(totalDebit)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
