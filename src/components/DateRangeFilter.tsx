import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export type DateRange = { from: string; to: string };

export const EMPTY_RANGE: DateRange = { from: "", to: "" };

/** Filter helper: returns rows within [from,to] inclusive. Empty = all time. */
export function inRange(dateStr: string | null | undefined, r: DateRange) {
  if (!r.from && !r.to) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (r.from && d < r.from) return false;
  if (r.to && d > r.to) return false;
  return true;
}

function ym(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
  const first = `${y}-${m}-01`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { first, last };
}

const PRESETS: Record<string, () => DateRange> = {
  all: () => EMPTY_RANGE,
  today: () => { const t = new Date().toISOString().slice(0, 10); return { from: t, to: t }; },
  mtd: () => { const { first } = ym(); return { from: first, to: new Date().toISOString().slice(0, 10) }; },
  last_month: () => { const { first, last } = ym(-1); return { from: first, to: last }; },
  ytd: () => { const y = new Date().getFullYear(); return { from: `${y}-01-01`, to: new Date().toISOString().slice(0, 10) }; },
  last_year: () => { const y = new Date().getFullYear() - 1; return { from: `${y}-01-01`, to: `${y}-12-31` }; },
};

export function DateRangeFilter({ value, onChange, compact }: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  compact?: boolean;
}) {
  const active = !!(value.from || value.to);
  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div>
        {!compact && <Label className="text-xs">From</Label>}
        <Input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })}
          className="h-9 w-[140px]" placeholder="From" />
      </div>
      <div>
        {!compact && <Label className="text-xs">To</Label>}
        <Input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })}
          className="h-9 w-[140px]" placeholder="To" />
      </div>
      <Select value="" onValueChange={(v) => v && onChange(PRESETS[v]())}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Preset" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="mtd">Month to date</SelectItem>
          <SelectItem value="last_month">Last month</SelectItem>
          <SelectItem value="ytd">Year to date</SelectItem>
          <SelectItem value="last_year">Last year</SelectItem>
        </SelectContent>
      </Select>
      {active && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_RANGE)} className="h-9">
          <X className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
