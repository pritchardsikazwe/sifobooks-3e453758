import { ArrowLeft, Loader2 } from "lucide-react";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Full-page record editor shell used instead of cramped modal forms.
 *
 * Renders a colour-coded module bar, a readable single-column body of
 * FormSections and a sticky Save / Cancel action bar that stays reachable
 * on mobile.
 */
export function SifoFormPage({
  module = "accounting", title, subtitle, icon: Icon, onCancel, onSave,
  saveLabel = "Save", saving = false, saveDisabled = false, secondary, children, className,
}: {
  module?: ModuleKey;
  title: string;
  subtitle?: string;
  icon?: any;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  /** Extra actions rendered left of Cancel in the action bar. */
  secondary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const theme = moduleTheme(module);
  return (
    <div className={cn("flex min-h-[60vh] flex-col", className)}>
      <div className="surface-card overflow-hidden rounded-xl border border-border">
        <div className={cn("h-1.5 w-full", theme.bar)} />
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onCancel} aria-label="Back to list">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {Icon && (
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", theme.chip)}>
              <Icon className="h-4.5 w-4.5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">{children}</div>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          {secondary}
          <Button variant="outline" onClick={onCancel} className="min-h-11 flex-1 sm:flex-none">Cancel</Button>
          <Button variant="save" onClick={onSave} disabled={saveDisabled || saving} className="min-h-11 flex-1 sm:flex-none">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Titled block of related fields inside a SifoFormPage. */
export function SifoFormSection({
  title, description, columns = 2, children, className,
}: {
  title: string;
  description?: string;
  columns?: 1 | 2;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="border-b border-border/70 pb-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className={cn("grid gap-4", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>{children}</div>
    </section>
  );
}

/** Label + control + inline validation error. */
export function SifoField({
  label, required, error, help, htmlFor, wide, children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  help?: string;
  htmlFor?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : help ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}
