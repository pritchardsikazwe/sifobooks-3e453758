import { type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side chips: status pill, badge, etc. */
  meta?: ReactNode;
  /** Sticky footer actions. */
  footer?: ReactNode;
  /** Optional side toolbar (top-right). */
  toolbar?: ReactNode;
  children: ReactNode;
  widthClass?: string;
};

/**
 * Slide-over drawer for viewing/editing a single record without leaving
 * the list context. Follows the QuickBooks/Xero detail pane pattern.
 */
export function DetailDrawer({
  open, onOpenChange, title, subtitle, meta, footer, toolbar, children,
  widthClass = "w-full sm:max-w-2xl",
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("p-0 flex flex-col gap-0", widthClass)}
      >
        <SheetHeader className="border-b border-border px-5 py-4 space-y-1.5 bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-semibold text-foreground truncate">{title}</SheetTitle>
              {subtitle && (
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </SheetDescription>
              )}
            </div>
            {toolbar && <div className="shrink-0 flex items-center gap-1.5">{toolbar}</div>}
          </div>
          {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-border px-5 py-3 bg-card flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Small labeled field for the drawer body. */
export function DrawerField({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/** Section with a small heading inside the drawer. */
export function DrawerSection({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="space-y-2 pt-3 first:pt-0">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">{title}</h4>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}
