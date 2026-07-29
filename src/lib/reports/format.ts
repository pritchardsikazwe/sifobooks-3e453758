// Report formatting + period utilities for the Reports Centre.

export const nf2 = new Intl.NumberFormat("en-ZM", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Accounting number: negatives in brackets, blank for null. */
export function acct(n: number | null | undefined, opts?: { blankZero?: boolean }) {
  if (n == null || Number.isNaN(Number(n))) return "";
  const v = Number(n);
  if (opts?.blankZero && v === 0) return "";
  if (v < 0) return `(${nf2.format(Math.abs(v))})`;
  return nf2.format(v);
}

export function money(n: number | null | undefined, ccy = "ZMW") {
  return `${ccy} ${acct(n) || "0.00"}`;
}

export function pct(n: number | null | undefined, digits = 1) {
  if (n == null || !isFinite(Number(n))) return "—";
  return `${(Number(n) * 100).toFixed(digits)}%`;
}

export function variance(current: number, previous: number) {
  const amt = current - previous;
  const denom = Math.abs(previous);
  const rate = denom > 0 ? amt / denom : null;
  return { amt, rate };
}

/* ---------- Period presets ---------- */

export type PeriodKey =
  | "this-month" | "prev-month"
  | "this-quarter" | "prev-quarter"
  | "ytd" | "prev-year"
  | "custom";

export type DateRange = { from: string; to: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function resolvePeriod(key: PeriodKey, custom?: { from: string; to: string }): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this-month": {
      const from = new Date(y, m, 1);
      const to = new Date(y, m + 1, 0);
      return { from: iso(from), to: iso(to), label: from.toLocaleString("default", { month: "long", year: "numeric" }) };
    }
    case "prev-month": {
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0);
      return { from: iso(from), to: iso(to), label: from.toLocaleString("default", { month: "long", year: "numeric" }) };
    }
    case "this-quarter": {
      const q = Math.floor(m / 3);
      const from = new Date(y, q * 3, 1);
      const to = new Date(y, q * 3 + 3, 0);
      return { from: iso(from), to: iso(to), label: `Q${q + 1} ${y}` };
    }
    case "prev-quarter": {
      const q = Math.floor(m / 3) - 1;
      const yy = q < 0 ? y - 1 : y;
      const qq = (q + 4) % 4;
      const from = new Date(yy, qq * 3, 1);
      const to = new Date(yy, qq * 3 + 3, 0);
      return { from: iso(from), to: iso(to), label: `Q${qq + 1} ${yy}` };
    }
    case "ytd": {
      const from = new Date(y, 0, 1);
      const to = new Date(y, m + 1, 0);
      return { from: iso(from), to: iso(to), label: `YTD ${y}` };
    }
    case "prev-year": {
      const from = new Date(y - 1, 0, 1);
      const to = new Date(y - 1, 11, 31);
      return { from: iso(from), to: iso(to), label: `${y - 1}` };
    }
    case "custom":
    default: {
      const from = custom?.from ?? iso(new Date(y, m, 1));
      const to = custom?.to ?? iso(now);
      return { from, to, label: `${from} → ${to}` };
    }
  }
}

/** Shift a range by whole months (for MoM / YoY compare). */
export function shiftRange(r: DateRange, months: number): DateRange {
  const f = new Date(r.from); const t = new Date(r.to);
  f.setMonth(f.getMonth() + months);
  t.setMonth(t.getMonth() + months);
  return { from: iso(f), to: iso(t), label: `${iso(f)} → ${iso(t)}` };
}
