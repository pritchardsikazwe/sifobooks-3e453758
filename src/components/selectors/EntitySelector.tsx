import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type EntityOption = {
  id: string;
  /** Short human code, e.g. "6100" or "EMP-0082". Never a raw database id. */
  code?: string | null;
  /** Primary label, e.g. "Office Expenses". */
  label: string;
  /** Secondary line shown under the label, e.g. "Type: Expense · Parent: Operating". */
  meta?: string | null;
  /** Right-aligned value, e.g. a balance. */
  trailing?: string | null;
  /** Optional grouping header. */
  group?: string | null;
  disabled?: boolean;
};

type Props = {
  label: string;
  /** Contextual guidance, e.g. "Select the account where this expense should be recorded." */
  help?: string;
  options: EntityOption[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  /** Shown when there are no options at all. */
  emptyTitle?: string;
  emptyActionLabel?: string;
  emptyActionTo?: string;
  /**
   * Secondary "create new" action, always subordinate to picking an existing record.
   * Rendered at the foot of the list, never as the default path.
   */
  createLabel?: string;
  onCreate?: () => void;
  /** Persist recently-used picks under this key. */
  recentKey?: string;
  className?: string;
};

const RECENT_MAX = 4;

function readRecent(key?: string): string[] {
  if (!key || typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(`sifo.recent.${key}`) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function pushRecent(key: string | undefined, id: string) {
  if (!key || typeof window === "undefined") return;
  const next = [id, ...readRecent(key).filter(x => x !== id)].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(`sifo.recent.${key}`, JSON.stringify(next));
  } catch {
    /* storage disabled — recents are best-effort */
  }
}

export function displayEntity(o: EntityOption | undefined | null) {
  if (!o) return "";
  return o.code ? `${o.code} — ${o.label}` : o.label;
}

export function EntitySelector({
  label, help, options, value, onChange, placeholder = "Search and select…", required,
  disabled, clearable = true, emptyTitle, emptyActionLabel, emptyActionTo, recentKey, className,
  createLabel, onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readRecent(recentKey));

  const selected = useMemo(() => options.find(o => o.id === value) ?? null, [options, value]);

  const recentOptions = useMemo(
    () => recent.map(id => options.find(o => o.id === id)).filter(Boolean) as EntityOption[],
    [recent, options],
  );

  const groups = useMemo(() => {
    const map = new Map<string, EntityOption[]>();
    for (const o of options) {
      const g = o.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return [...map.entries()];
  }, [options]);

  const pick = (id: string) => {
    onChange(id);
    pushRecent(recentKey, id);
    setRecent(readRecent(recentKey));
    setOpen(false);
  };

  const isEmpty = options.length === 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      ) : null}

      {isEmpty ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          <div className="text-muted-foreground">{emptyTitle ?? `No ${label.toLowerCase()} found.`}</div>
          {emptyActionTo ? (
            <Button asChild size="sm" variant="outline" className="mt-2 h-8">
              <Link to={emptyActionTo}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {emptyActionLabel ?? `Create ${label.toLowerCase()}`}
              </Link>
            </Button>
          ) : onCreate ? (
            <Button type="button" size="sm" variant="outline" className="mt-2 h-8" onClick={onCreate}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {createLabel ?? emptyActionLabel ?? `Create ${label.toLowerCase()}`}
            </Button>
          ) : null}
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="h-auto min-h-10 w-full justify-between gap-2 px-3 py-2 text-left font-normal"
            >
              {selected ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{displayEntity(selected)}</span>
                  {selected.meta && (
                    <span className="block truncate text-xs text-muted-foreground">{selected.meta}</span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  {placeholder}
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1">
                {clearable && selected && (
                  <X
                    className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                    onClick={e => { e.stopPropagation(); onChange(null); }}
                  />
                )}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
            <Command
              filter={(itemValue, search) =>
                itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
              }
            >
              <CommandInput placeholder={`Search by code or name…`} />
              <CommandList className="max-h-72">
                <CommandEmpty>No match. Try a different code or name.</CommandEmpty>
                {recentOptions.length > 0 && (
                  <CommandGroup heading="Recently used">
                    {recentOptions.map(o => (
                      <Row key={`r-${o.id}`} option={o} selected={o.id === value} onPick={pick} />
                    ))}
                  </CommandGroup>
                )}
                {groups.map(([g, list]) => (
                  <CommandGroup key={g || "all"} heading={g || undefined}>
                    {list.map(o => (
                      <Row key={o.id} option={o} selected={o.id === value} onPick={pick} />
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
            {/* Creating is deliberately secondary: picking an existing record is the default path. */}
            {(onCreate || emptyActionTo) && (
              <div className="border-t p-1">
                {emptyActionTo ? (
                  <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs">
                    <Link to={emptyActionTo}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {createLabel ?? emptyActionLabel ?? `New ${label.toLowerCase()}`}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="h-8 w-full justify-start text-xs"
                    onClick={() => { setOpen(false); onCreate?.(); }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {createLabel ?? `New ${label.toLowerCase()}`}
                  </Button>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function Row({ option, selected, onPick }: { option: EntityOption; selected: boolean; onPick: (id: string) => void }) {
  return (
    <CommandItem
      value={`${option.code ?? ""} ${option.label} ${option.meta ?? ""}`}
      disabled={option.disabled}
      onSelect={() => onPick(option.id)}
      className="items-start gap-2"
    >
      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "opacity-100 text-primary" : "opacity-0")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">
          {option.code && <span className="font-mono text-xs text-muted-foreground">{option.code}</span>}
          {option.code ? " — " : ""}
          {option.label}
        </span>
        {option.meta && <span className="block truncate text-xs text-muted-foreground">{option.meta}</span>}
      </span>
      {option.trailing && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{option.trailing}</span>
      )}
    </CommandItem>
  );
}
