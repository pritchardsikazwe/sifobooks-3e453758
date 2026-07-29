import { useState, type ReactNode } from "react";
import { Calendar, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolvePeriod, type PeriodKey, type DateRange } from "@/lib/reports/format";

export type ReportFilters = {
  range: DateRange;
  periodKey: PeriodKey;
  extras?: Record<string, string>;
};

const PRESETS: { value: PeriodKey; label: string }[] = [
  { value: "this-month", label: "This Month" },
  { value: "prev-month", label: "Previous Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "prev-quarter", label: "Previous Quarter" },
  { value: "ytd", label: "Year to Date" },
  { value: "prev-year", label: "Previous Year" },
  { value: "custom", label: "Custom Period" },
];

/**
 * Modern filter bar for reports. Emits DateRange on Apply.
 * Consumers pass optional `extraFilters` (branch/dept/project/etc.).
 */
export function ReportFilterBar({
  initial,
  onApply,
  extraFilters,
  onReset,
}: {
  initial?: { periodKey?: PeriodKey; from?: string; to?: string };
  onApply: (f: ReportFilters) => void;
  onReset?: () => void;
  extraFilters?: ReactNode;
}) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>(initial?.periodKey ?? "this-month");
  const initialRange = resolvePeriod(periodKey, { from: initial?.from ?? "", to: initial?.to ?? "" });
  const [from, setFrom] = useState(initial?.from ?? initialRange.from);
  const [to, setTo] = useState(initial?.to ?? initialRange.to);

  const applyPreset = (k: PeriodKey) => {
    setPeriodKey(k);
    if (k !== "custom") {
      const r = resolvePeriod(k);
      setFrom(r.from); setTo(r.to);
    }
  };

  const apply = () => {
    const r = periodKey === "custom" ? resolvePeriod("custom", { from, to }) : resolvePeriod(periodKey);
    onApply({ range: r, periodKey });
  };

  const reset = () => {
    setPeriodKey("this-month");
    const r = resolvePeriod("this-month");
    setFrom(r.from); setTo(r.to);
    onReset?.();
    onApply({ range: r, periodKey: "this-month" });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> FILTERS
      </div>
      <div className="min-w-[10rem]">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Period</Label>
        <Select value={periodKey} onValueChange={(v) => applyPreset(v as PeriodKey)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">From</Label>
        <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriodKey("custom"); }} className="h-9 w-40" />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">To</Label>
        <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPeriodKey("custom"); }} className="h-9 w-40" />
      </div>
      {extraFilters}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>
        <Button size="sm" onClick={apply} className="bg-emerald-700 hover:bg-emerald-800">
          <Calendar className="h-4 w-4 mr-1" /> Apply
        </Button>
      </div>
    </div>
  );
}
