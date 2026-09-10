// Period presets and month helpers for the Reports Centre viewers.
// Pure date maths — no data access.

export type RangeKey =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "last-quarter"
  | "ytd"
  | "last-12"
  | "this-year"
  | "prev-year"
  | "custom";

export type Range = { from: string; to: string; label: string; key: RangeKey };

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const iso = (d: Date) => {
  const z = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return z.toISOString().slice(0, 10);
};

const monthStart = (y: number, m: number) => iso(new Date(y, m, 1));
const monthEnd = (y: number, m: number) => iso(new Date(y, m + 1, 0));

export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-quarter", label: "This quarter" },
  { key: "last-quarter", label: "Last quarter" },
  { key: "ytd", label: "Year to date" },
  { key: "last-12", label: "Last 12 months" },
  { key: "this-year", label: "This year" },
  { key: "prev-year", label: "Previous year" },
  { key: "custom", label: "Custom range" },
];

export function resolveRange(key: RangeKey, custom?: { from?: string; to?: string }, today = new Date()): Range {
  const y = today.getFullYear();
  const m = today.getMonth();
  const label = (l: string, from: string, to: string): Range => ({ from, to, label: l, key });

  switch (key) {
    case "this-month":
      return label(
        new Date(y, m, 1).toLocaleString("en-GB", { month: "long", year: "numeric" }),
        monthStart(y, m),
        monthEnd(y, m),
      );
    case "last-month":
      return label(
        new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" }),
        monthStart(y, m - 1),
        monthEnd(y, m - 1),
      );
    case "this-quarter": {
      const q = Math.floor(m / 3);
      return label(`Q${q + 1} ${y}`, monthStart(y, q * 3), monthEnd(y, q * 3 + 2));
    }
    case "last-quarter": {
      const q = Math.floor(m / 3) - 1;
      const yy = q < 0 ? y - 1 : y;
      const qq = (q + 4) % 4;
      return label(`Q${qq + 1} ${yy}`, monthStart(yy, qq * 3), monthEnd(yy, qq * 3 + 2));
    }
    case "ytd":
      return label(`Year to date ${y}`, monthStart(y, 0), monthEnd(y, m));
    case "last-12":
      return label("Last 12 months", monthStart(y, m - 11), monthEnd(y, m));
    case "this-year":
      return label(`${y}`, monthStart(y, 0), monthEnd(y, 11));
    case "prev-year":
      return label(`${y - 1}`, monthStart(y - 1, 0), monthEnd(y - 1, 11));
    case "custom":
    default: {
      const from = custom?.from || monthStart(y, m);
      const to = custom?.to || monthEnd(y, m);
      return { from, to, label: `${from} → ${to}`, key: "custom" };
    }
  }
}

/** A single calendar month as a range. */
export function monthRange(year: number, monthIndex: number): Range {
  return {
    from: monthStart(year, monthIndex),
    to: monthEnd(year, monthIndex),
    label: new Date(year, monthIndex, 1).toLocaleString("en-GB", { month: "long", year: "numeric" }),
    key: "custom",
  };
}

export type CompareKey = "none" | "prev-period" | "prev-quarter" | "prev-year" | "same-month-last-year";

export const COMPARE_OPTIONS: { key: CompareKey; label: string }[] = [
  { key: "none", label: "No comparison" },
  { key: "prev-period", label: "Previous period" },
  { key: "prev-quarter", label: "Previous quarter" },
  { key: "prev-year", label: "Previous year" },
  { key: "same-month-last-year", label: "Same period last year" },
];

const shiftMonths = (d: string, months: number) => {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
};

const spanDays = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;

/** The comparison window for a given range, or null when no comparison is wanted. */
export function compareRange(range: Range, key: CompareKey): Range | null {
  if (key === "none") return null;
  if (key === "prev-year" || key === "same-month-last-year") {
    return { from: shiftMonths(range.from, -12), to: shiftMonths(range.to, -12), label: "Same period last year", key: "custom" };
  }
  if (key === "prev-quarter") {
    return { from: shiftMonths(range.from, -3), to: shiftMonths(range.to, -3), label: "Previous quarter", key: "custom" };
  }
  // Whole calendar months shift back by whole months, so "previous period"
  // of September is August, not 31 days earlier.
  const startsMonth = range.from.slice(8) === "01";
  const endOfMonth = (() => {
    const d = new Date(`${range.to}T00:00:00Z`);
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return next.toISOString().slice(0, 10) === range.to;
  })();
  if (startsMonth && endOfMonth) {
    const a = new Date(`${range.from}T00:00:00Z`);
    const b = new Date(`${range.to}T00:00:00Z`);
    const count = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + 1;
    const from = shiftMonths(range.from, -count);
    const fd = new Date(`${from}T00:00:00Z`);
    const to = new Date(Date.UTC(fd.getUTCFullYear(), fd.getUTCMonth() + count, 0)).toISOString().slice(0, 10);
    return { from, to, label: "Previous period", key: "custom" };
  }
  const days = spanDays(range.from, range.to);
  const to = new Date(`${range.from}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() - 1);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), label: "Previous period", key: "custom" };
}

/** Variance amount and rate, only meaningful when the base is non-zero. */
export function varianceOf(current: number, previous: number) {
  const amount = current - previous;
  const rate = Math.abs(previous) > 0.005 ? amount / Math.abs(previous) : null;
  return { amount, rate };
}
