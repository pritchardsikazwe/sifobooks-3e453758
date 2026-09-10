import { ArrowRight, Info } from "lucide-react";
import { JournalImpact } from "@/components/accounting/JournalImpact";
import { expectedPosting, txnTypeMeta, type FinanceTxnType } from "@/lib/finance/transaction-model";
import { cn } from "@/lib/utils";

/**
 * "What was posted?" — the plain-language accounting story of a transaction,
 * followed by the actual journal lines from the ledger with a drilldown link.
 */
export function WhatWasPosted({
  type,
  entryId,
  hasVat,
  sourceAccount,
  expenseAccount,
  className,
}: {
  type: FinanceTxnType;
  entryId?: string | null;
  hasVat?: boolean;
  sourceAccount?: string | null;
  expenseAccount?: string | null;
  className?: string;
}) {
  const meta = txnTypeMeta(type);
  const lines = expectedPosting(type, { hasVat, sourceAccount, expenseAccount });

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            What was posted?
          </span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{meta.description}</p>
        <ul className="space-y-1.5">
          {lines.map((l, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-semibold",
                  l.debit ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {l.debit ? "Dr" : "Cr"}
              </span>
              <span className="font-medium">{l.account}</span>
              {l.note ? (
                <>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{l.note}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        {!meta.isExpense ? (
          <p className="mt-3 rounded border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground">
            This transaction is <strong>not</strong> counted as an expense, so it can never be double counted with the
            original cost.
          </p>
        ) : null}
      </div>
      <JournalImpact entryId={entryId} title="Actual journal posted" />
    </div>
  );
}
