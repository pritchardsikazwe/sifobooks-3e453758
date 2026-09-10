import { useState, type ReactNode } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  COMPARE_OPTIONS,
  MONTH_LABELS,
  RANGE_PRESETS,
  monthRange,
  resolveRange,
  type CompareKey,
  type Range,
  type RangeKey,
} from "@/lib/reports/periods";
import { cn } from "@/lib/utils";

/**
 * Compact control bar used at the top of every report viewer:
 * period presets, a Jan–Dec month strip, exact from/to dates,
 * an optional comparison selector and a refresh button.
 */
export function ReportPeriodBar({
  range,
  onRange,
  compare,
  onCompare,
  onRefresh,
  refreshing,
  customizeTitle = "Customise report",
  customize,
  children,
}: {
  range: Range;
  onRange: (r: Range) => void;
  compare?: CompareKey;
  onCompare?: (c: CompareKey) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  customizeTitle?: string;
  customize?: ReactNode;
  children?: ReactNode;
}) {
  const [year, setYear] = useState(() => Number(range.from.slice(0, 4)) || new Date().getFullYear());

  const activeMonth = (() => {
    if (range.from.slice(0, 7) !== range.to.slice(0, 7)) return -1;
    if (Number(range.from.slice(0, 4)) !== year) return -1;
    return Number(range.from.slice(5, 7)) - 1;
  })();

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9.5rem] flex-1 sm:flex-none">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Period</Label>
          <Select
            value={range.key}
            onValueChange={(v) => {
              const r = resolveRange(v as RangeKey, { from: range.from, to: range.to });
              setYear(Number(r.from.slice(0, 4)) || year);
              onRange(r);
            }}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">From</Label>
          <Input
            type="date"
            value={range.from}
            className="h-9 w-[9.5rem]"
            onChange={(e) => onRange({ ...range, from: e.target.value, key: "custom", label: `${e.target.value} → ${range.to}` })}
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">To</Label>
          <Input
            type="date"
            value={range.to}
            className="h-9 w-[9.5rem]"
            onChange={(e) => onRange({ ...range, to: e.target.value, key: "custom", label: `${range.from} → ${e.target.value}` })}
          />
        </div>

        {onCompare && (
          <div className="min-w-[10rem]">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Compare</Label>
            <Select value={compare ?? "none"} onValueChange={(v) => onCompare(v as CompareKey)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPARE_OPTIONS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {children}

        <div className="ml-auto flex items-center gap-2">
          {customize && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="mr-1 h-4 w-4" /> Customise
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>{customizeTitle}</SheetTitle>
                  <SheetDescription>Adjust what this report shows. Nothing is saved to your records.</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">{customize}</div>
              </SheetContent>
            </Sheet>
          )}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Month strip */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 rounded-md border border-border px-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">{year}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Next year" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 gap-1">
          {MONTH_LABELS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => onRange(monthRange(year, i))}
              className={cn(
                "flex-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors",
                activeMonth === i
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onRange(resolveRange("this-year", undefined, new Date(year, 0, 1)))}
          className="whitespace-nowrap rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <CalendarRange className="mr-1 inline h-3.5 w-3.5" /> Full year
        </button>
      </div>
    </div>
  );
}
