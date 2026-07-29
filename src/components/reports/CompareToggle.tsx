import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "@/lib/reports/format";
import { shiftRange } from "@/lib/reports/format";

export type CompareMode = "off" | "prev-period" | "prev-year" | "same-month-py";

export function CompareToggle({
  mode, onModeChange, baseRange, onCompareRange,
}: {
  mode: CompareMode;
  onModeChange: (m: CompareMode) => void;
  baseRange: DateRange;
  onCompareRange: (r: DateRange | null) => void;
}) {
  const change = (m: CompareMode) => {
    onModeChange(m);
    if (m === "off") return onCompareRange(null);
    if (m === "prev-period") return onCompareRange(shiftRange(baseRange, -1));
    if (m === "prev-year" || m === "same-month-py") return onCompareRange(shiftRange(baseRange, -12));
  };
  return (
    <div className="flex items-center gap-2">
      <GitCompare className="h-4 w-4 text-muted-foreground" />
      <Select value={mode} onValueChange={(v) => change(v as CompareMode)}>
        <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="off">No comparison</SelectItem>
          <SelectItem value="prev-period">vs Previous Period</SelectItem>
          <SelectItem value="prev-year">vs Previous Year</SelectItem>
          <SelectItem value="same-month-py">vs Same Month Last Year</SelectItem>
        </SelectContent>
      </Select>
      {mode !== "off" && (
        <Button variant="ghost" size="sm" onClick={() => change("off")}>Clear</Button>
      )}
    </div>
  );
}
