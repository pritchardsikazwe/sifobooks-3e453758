import { STATUS_TONES, statusTone, type StatusTone } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

/**
 * One badge for every status in the app so "Paid" looks identical in
 * invoices, bills, payroll and banking.
 */
export function SifoStatusBadge({
  status, tone, className,
}: { status?: string | null; tone?: StatusTone; className?: string }) {
  const t = tone ?? statusTone(status);
  const label = (status ?? "—").replace(/[_-]/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize leading-none",
        STATUS_TONES[t],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
