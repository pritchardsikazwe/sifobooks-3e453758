import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  accountingStatusMeta,
  approvalStatusMeta,
  paymentStatusMeta,
  txnTypeMeta,
  type BadgeTone,
} from "@/lib/finance/transaction-model";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
};

function Chip({ tone, label, title, className }: { tone: BadgeTone; label: string; title?: string; className?: string }) {
  const chip = (
    <Badge variant="outline" className={cn("whitespace-nowrap text-[11px] font-medium", TONE[tone], className)}>
      {label}
    </Badge>
  );
  if (!title) return chip;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild><span>{chip}</span></TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TransactionTypeBadge({ type, className }: { type: string | null | undefined; className?: string }) {
  const m = txnTypeMeta(type);
  return <Chip tone="info" label={m.label} title={m.description} className={className} />;
}

export function AccountingStatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const m = accountingStatusMeta(status);
  return <Chip tone={m.tone} label={m.label} title={m.help} className={className} />;
}

export function PaymentStatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const m = paymentStatusMeta(status);
  return <Chip tone={m.tone} label={m.label} className={className} />;
}

export function ApprovalStatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const m = approvalStatusMeta(status);
  return <Chip tone={m.tone} label={m.label} className={className} />;
}

/** All four questions at a glance: what, approved, posted, paid. */
export function TransactionStatusRow({
  type, approval, accounting, payment, className,
}: {
  type?: string | null;
  approval?: string | null;
  accounting?: string | null;
  payment?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {type ? <TransactionTypeBadge type={type} /> : null}
      {approval ? <ApprovalStatusBadge status={approval} /> : null}
      {accounting ? <AccountingStatusBadge status={accounting} /> : null}
      {payment ? <PaymentStatusBadge status={payment} /> : null}
    </div>
  );
}
