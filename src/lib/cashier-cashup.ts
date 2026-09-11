/**
 * Cash declaration helpers for the cashier terminal.
 *
 * These are display/entry helpers only. The authoritative expected cash and
 * variance are recomputed inside `submit_cashier_shift` from the recorded
 * sales, payments and cash movements — the browser is never the authority.
 */

export type Denomination = { value: number; label: string; kind: "note" | "coin" };

/** Zambian kwacha notes and coins, largest first. */
export const ZMW_DENOMINATIONS: Denomination[] = [
  { value: 200, label: "K200", kind: "note" },
  { value: 100, label: "K100", kind: "note" },
  { value: 50, label: "K50", kind: "note" },
  { value: 20, label: "K20", kind: "note" },
  { value: 10, label: "K10", kind: "note" },
  { value: 5, label: "K5", kind: "note" },
  { value: 2, label: "K2", kind: "note" },
  { value: 1, label: "K1", kind: "coin" },
  { value: 0.5, label: "50n", kind: "coin" },
  { value: 0.1, label: "10n", kind: "coin" },
];

export type DenominationCounts = Record<string, number | string>;

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Total physical cash implied by a denomination count sheet. */
export function countedFromDenominations(counts: DenominationCounts): number {
  return Number(
    ZMW_DENOMINATIONS.reduce((sum, d) => sum + d.value * Math.floor(num(counts[String(d.value)])), 0).toFixed(2),
  );
}

/** Only the denominations the cashier actually entered, for the audit record. */
export function denominationPayload(counts: DenominationCounts) {
  const out: Record<string, number> = {};
  ZMW_DENOMINATIONS.forEach((d) => {
    const q = Math.floor(num(counts[String(d.value)]));
    if (q > 0) out[String(d.value)] = q;
  });
  return out;
}

export type CashupInputs = {
  openingFloat: number;
  cashSales: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
};

/** opening float + cash sales + cash in − cash refunds − cash out. */
export function expectedCashFrom(i: CashupInputs): number {
  return Number(
    (num(i.openingFloat) + num(i.cashSales) + num(i.cashIn) - num(i.cashRefunds) - num(i.cashOut)).toFixed(2),
  );
}

export function varianceOf(declared: number, expected: number): number {
  return Number((Number(declared || 0) - Number(expected || 0)).toFixed(2));
}

/** Any difference at all must be explained before a declaration is accepted. */
export function requiresReason(variance: number): boolean {
  return Math.abs(Number(variance || 0)) >= 0.01;
}

export function canSubmitDeclaration(opts: { declared: string; variance: number; reason: string; busy?: boolean }) {
  if (opts.busy) return false;
  if (opts.declared === "") return false;
  if (!Number.isFinite(Number(opts.declared))) return false;
  if (requiresReason(opts.variance) && opts.reason.trim().length < 4) return false;
  return true;
}

export function varianceLabel(variance: number): "balanced" | "over" | "short" {
  if (!requiresReason(variance)) return "balanced";
  return variance > 0 ? "over" : "short";
}
