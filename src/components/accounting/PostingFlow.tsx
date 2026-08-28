import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visualises how a source document travels through the SifoBooks accounting
 * engine, so users can see where a transaction lands in the ledger.
 */
export type FlowKind = "invoice" | "bill" | "expense" | "pos" | "receipt" | "payroll" | "journal";

const FLOWS: Record<FlowKind, string[]> = {
  invoice: ["Invoice", "Receivable", "Revenue", "VAT", "Payment", "Bank / Cash", "Ledger", "Trial Balance"],
  bill: ["Purchase Order", "Goods Received", "Supplier Bill", "Inventory / Expense", "VAT", "Payable", "Payment", "Ledger"],
  expense: ["Expense", "Expense Account", "VAT Input", "Cash / Bank / Payable", "Ledger", "Trial Balance"],
  pos: ["POS Sale", "Payment", "Cash / Bank", "Sales", "VAT", "Inventory", "COGS", "Ledger"],
  receipt: ["Receipt", "Bank / Cash", "Receivable", "Allocation", "Ledger"],
  payroll: ["Payroll Run", "Gross Pay", "PAYE / NAPSA / NHIMA", "Net Pay Payable", "Bank", "Ledger"],
  journal: ["Journal Entry", "Debit = Credit", "Ledger", "Trial Balance", "Financial Statements"],
};

export function PostingFlow({
  kind,
  reference,
  activeStep,
  className,
}: {
  kind: FlowKind;
  /** Source reference such as POS:SALE:000123 or EXP:EXP-00045 */
  reference?: string | null;
  /** Index of the furthest completed step; defaults to all complete */
  activeStep?: number;
  className?: string;
}) {
  const steps = FLOWS[kind];
  const last = activeStep ?? steps.length - 1;

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 p-3", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Accounting flow
        </span>
        {reference && (
          <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {reference}
          </code>
        )}
      </div>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full px-2 py-1 text-[11px] font-medium",
                i <= last
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
