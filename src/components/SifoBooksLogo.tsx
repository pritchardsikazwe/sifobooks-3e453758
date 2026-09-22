import { cn } from "@/lib/utils";

export function SifoBooksLogo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} aria-label="SifoBooks">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl shadow-sm ring-1 ring-primary/15", markClassName)}>
        <img src="/sifobooks-logo.svg" alt="" className="h-full w-full object-cover" />
      </span>
      {showWordmark && (
        <span className="min-w-0 leading-none">
          <span className="block font-bold tracking-tight text-primary">SifoBooks</span>
          <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Accounting ERP</span>
        </span>
      )}
    </div>
  );
}
