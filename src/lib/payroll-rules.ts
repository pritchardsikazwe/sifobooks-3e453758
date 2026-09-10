// ============================================================
// Versioned Zambian statutory rules — SifoBooks Payroll
//
// Rates are NOT hard-coded law. A company keeps its own dated
// versions in payroll_statutory_rules; the engine picks the version
// that was in force on the pay date. When a company has never saved a
// version we fall back to the built-in starting point below, and every
// screen must label it as unverified until the company confirms it
// against current ZRA / NAPSA / NHIMA guidance.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { PayeBand } from "@/lib/payroll";

export type StatutoryRules = {
  id: string | null;
  effectiveFrom: string;
  payeBands: PayeBand[];
  napsaRate: number;
  napsaEmployerRate: number;
  /** Monthly ceiling on the employee NAPSA contribution amount. */
  napsaCap: number;
  nhimaRate: number;
  nhimaEmployerRate: number;
  wcfRate: number;
  sdlRate: number;
  housingExemptPct: number;
  sourceNote: string | null;
  verifiedBy: string | null;
  verifiedOn: string | null;
  /** "company" = saved and owned by this company. "built-in" = unverified starting point. */
  origin: "company" | "built-in";
};

/**
 * Starting point only. NAPSA publishes a monthly maximum contribution
 * (stated as K2,892.03 at the time this default was written) and 5% + 5%
 * for the formal sector; PAYE bands change at each national budget.
 * Confirm both before running a live payroll.
 */
export const BUILT_IN_RULES: StatutoryRules = {
  id: null,
  effectiveFrom: "2026-01-01",
  payeBands: [
    { upTo: 5100, rate: 0 },
    { upTo: 7100, rate: 0.20 },
    { upTo: 9200, rate: 0.30 },
    { upTo: null, rate: 0.37 },
  ],
  napsaRate: 0.05,
  napsaEmployerRate: 0.05,
  napsaCap: 2892.03,
  nhimaRate: 0.01,
  nhimaEmployerRate: 0.01,
  wcfRate: 0.015,
  sdlRate: 0.005,
  housingExemptPct: 0.30,
  sourceNote: "Built-in starting point — not verified against current ZRA/NAPSA/NHIMA guidance for this company.",
  verifiedBy: null,
  verifiedOn: null,
  origin: "built-in",
};

export type RuleRow = {
  id: string;
  effective_from: string;
  paye_bands: unknown;
  napsa_rate: number | null;
  napsa_employer_rate: number | null;
  napsa_cap: number | null;
  nhima_rate: number | null;
  nhima_employer_rate: number | null;
  wcf_rate: number | null;
  sdl_rate: number | null;
  housing_exempt_pct: number | null;
  source_note: string | null;
  verified_by: string | null;
  verified_on: string | null;
  is_active?: boolean | null;
};

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function parseBands(value: unknown): PayeBand[] {
  if (!Array.isArray(value) || value.length === 0) return BUILT_IN_RULES.payeBands;
  const bands = value
    .map((b) => {
      const raw = b as { upTo?: unknown; up_to?: unknown; rate?: unknown };
      const upToRaw = raw.upTo ?? raw.up_to ?? null;
      const upTo = upToRaw === null || upToRaw === "" ? null : Number(upToRaw);
      const rate = Number(raw.rate);
      if (!Number.isFinite(rate)) return null;
      if (upTo !== null && !Number.isFinite(upTo)) return null;
      return { upTo, rate } as PayeBand;
    })
    .filter((b): b is PayeBand => b !== null)
    .sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  return bands.length ? bands : BUILT_IN_RULES.payeBands;
}

export function toRules(row: RuleRow): StatutoryRules {
  return {
    id: row.id,
    effectiveFrom: row.effective_from,
    payeBands: parseBands(row.paye_bands),
    napsaRate: num(row.napsa_rate, BUILT_IN_RULES.napsaRate),
    napsaEmployerRate: num(row.napsa_employer_rate, BUILT_IN_RULES.napsaEmployerRate),
    napsaCap: num(row.napsa_cap, BUILT_IN_RULES.napsaCap),
    nhimaRate: num(row.nhima_rate, BUILT_IN_RULES.nhimaRate),
    nhimaEmployerRate: num(row.nhima_employer_rate, BUILT_IN_RULES.nhimaEmployerRate),
    wcfRate: num(row.wcf_rate, BUILT_IN_RULES.wcfRate),
    sdlRate: num(row.sdl_rate, BUILT_IN_RULES.sdlRate),
    housingExemptPct: num(row.housing_exempt_pct, BUILT_IN_RULES.housingExemptPct),
    sourceNote: row.source_note,
    verifiedBy: row.verified_by,
    verifiedOn: row.verified_on,
    origin: "company",
  };
}

/** The version in force on a given date, from a list already loaded. */
export function rulesInForce(rows: RuleRow[], asOf: string): StatutoryRules {
  const eligible = rows
    .filter((r) => r.is_active !== false && r.effective_from <= asOf)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));
  const row = eligible[0];
  return row ? toRules(row) : BUILT_IN_RULES;
}

/** Load the statutory version this company had in force on a pay date. */
export async function loadStatutoryRules(userId: string, asOf: string): Promise<StatutoryRules> {
  const { data } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: RuleRow[] | null }> } };
    };
  })
    .from("payroll_statutory_rules")
    .select("*")
    .eq("user_id", userId)
    .order("effective_from", { ascending: false });
  return rulesInForce(data ?? [], asOf);
}

// ---- calculators that take the version, never a constant ----

const r2 = (n: number) => Math.round(n * 100) / 100;

export function payeOn(taxable: number, rules: StatutoryRules): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of rules.payeBands) {
    const ceil = b.upTo ?? Infinity;
    tax += Math.max(0, Math.min(taxable, ceil) - prev) * b.rate;
    prev = ceil;
    if (taxable <= ceil) break;
  }
  return r2(tax);
}

export function napsaOn(gross: number, rules: StatutoryRules) {
  const employee = r2(Math.min(Math.max(gross, 0) * rules.napsaRate, rules.napsaCap));
  const employer = r2(Math.min(Math.max(gross, 0) * rules.napsaEmployerRate, rules.napsaCap));
  return { employee, employer, total: r2(employee + employer), capped: gross * rules.napsaRate > rules.napsaCap };
}

export function nhimaOn(basic: number, rules: StatutoryRules) {
  const employee = r2(Math.max(basic, 0) * rules.nhimaRate);
  const employer = r2(Math.max(basic, 0) * rules.nhimaEmployerRate);
  return { employee, employer, total: r2(employee + employer) };
}

export function wcfOn(gross: number, rules: StatutoryRules) { return r2(Math.max(gross, 0) * rules.wcfRate); }
export function sdlOn(gross: number, rules: StatutoryRules) { return r2(Math.max(gross, 0) * rules.sdlRate); }

export function employerCostOn(gross: number, basic: number, rules: StatutoryRules): number {
  return r2(napsaOn(gross, rules).employer + nhimaOn(basic, rules).employer + wcfOn(gross, rules) + sdlOn(gross, rules));
}

export function rulesSummary(rules: StatutoryRules): string {
  const top = rules.payeBands[rules.payeBands.length - 1];
  return [
    `PAYE top rate ${((top?.rate ?? 0) * 100).toFixed(0)}%`,
    `NAPSA ${(rules.napsaRate * 100).toFixed(0)}% + ${(rules.napsaEmployerRate * 100).toFixed(0)}% capped at ${rules.napsaCap.toFixed(2)}`,
    `NHIMA ${(rules.nhimaRate * 100).toFixed(0)}% + ${(rules.nhimaEmployerRate * 100).toFixed(0)}%`,
  ].join(" · ");
}
