import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

/* ------------------------------------------------------------------ *
 * Zambian hospitality tax engine
 * ------------------------------------------------------------------ *
 * VAT, Tourism Levy and service charge are modelled separately.
 * Tourism Levy (ZRA) applies to accommodation, conference hire for
 * 25+ delegates and qualifying conference packages — NOT to ordinary
 * food and beverage sales. Service charge is a business charge, never
 * a tax, and is reported on its own line.
 * ------------------------------------------------------------------ */

export type TaxProfile = {
  id?: string;
  vat_rate: number;
  tourism_levy_rate: number;
  service_charge_rate: number;
  levy_on_accommodation: boolean;
  levy_on_conference_package: boolean;
  levy_on_food_beverage: boolean;
  prices_tax_inclusive: boolean;
};

export const DEFAULT_TAX_PROFILE: TaxProfile = {
  vat_rate: 16,
  tourism_levy_rate: 1.5,
  service_charge_rate: 0,
  levy_on_accommodation: true,
  levy_on_conference_package: true,
  levy_on_food_beverage: false,
  prices_tax_inclusive: false,
};

/** Charge categories that exist on a hotel folio. */
export const CHARGE_CATEGORIES = [
  "room", "conference package", "conference hire", "food", "beverage", "minibar",
  "laundry", "transfer", "other", "discount", "deposit", "payment",
] as const;
export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number];

/** Categories that reduce or settle the folio rather than add revenue. */
export const NON_REVENUE = new Set<string>(["payment", "deposit", "discount"]);

export function levyApplies(category: string, p: TaxProfile): boolean {
  if (category === "room") return p.levy_on_accommodation;
  if (category === "conference package" || category === "conference hire") return p.levy_on_conference_package;
  if (category === "food" || category === "beverage" || category === "minibar") return p.levy_on_food_beverage;
  return false;
}

export type TaxBreakdown = {
  net: number;
  serviceCharge: number;
  levy: number;
  vat: number;
  gross: number;
};

/**
 * Tax base order used here:
 *   net (goods/service value)
 *   + service charge (on net)
 *   + tourism levy (on net, only where the levy applies)
 *   = VAT base, VAT charged on that base.
 */
export function computeCharge(amount: number, category: string, p: TaxProfile): TaxBreakdown {
  const svcR = Math.max(0, p.service_charge_rate) / 100;
  const levyR = levyApplies(category, p) ? Math.max(0, p.tourism_levy_rate) / 100 : 0;
  const vatR = NON_REVENUE.has(category) ? 0 : Math.max(0, p.vat_rate) / 100;

  const round = (n: number) => Math.round(n * 100) / 100;

  if (p.prices_tax_inclusive) {
    // amount already contains service charge, levy and VAT
    const factor = (1 + svcR + levyR) * (1 + vatR);
    const net = round(amount / (factor || 1));
    const serviceCharge = round(net * svcR);
    const levy = round(net * levyR);
    const vat = round((net + serviceCharge + levy) * vatR);
    return { net, serviceCharge, levy, vat, gross: round(net + serviceCharge + levy + vat) };
  }

  const net = round(amount);
  const serviceCharge = round(net * svcR);
  const levy = round(net * levyR);
  const vat = round((net + serviceCharge + levy) * vatR);
  return { net, serviceCharge, levy, vat, gross: round(net + serviceCharge + levy + vat) };
}

/* ------------------------------------------------------------------ *
 * Operational vocabularies
 * ------------------------------------------------------------------ */

export const ROOM_STATUSES = ["vacant", "occupied", "reserved", "out_of_order"] as const;
export const HOUSEKEEPING_STATUSES = ["clean", "dirty", "cleaning", "inspected", "out_of_service"] as const;
export const RESERVATION_STATUSES = ["enquiry", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"] as const;
export const TASK_STATUSES = ["pending", "in_progress", "done", "blocked"] as const;
export const PAYMENT_METHODS = ["cash", "card", "mtn momo", "airtel money", "bank transfer", "company account"] as const;

export const roomTone = (r: { status: string; housekeeping_status: string; out_of_order?: boolean }) => {
  if (r.out_of_order || r.status === "out_of_order" || r.housekeeping_status === "out_of_service") return "bad" as const;
  if (r.status === "occupied") return "info" as const;
  if (r.housekeeping_status === "dirty" || r.housekeeping_status === "cleaning") return "warn" as const;
  if (r.status === "reserved") return "warn" as const;
  return "good" as const;
};

export const reservationTone = (s: string) =>
  s === "checked_in" ? ("info" as const)
  : s === "confirmed" ? ("good" as const)
  : s === "checked_out" ? ("neutral" as const)
  : s === "cancelled" || s === "no_show" ? ("bad" as const)
  : ("warn" as const);

export const nightsBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export const todayISO = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * Data access helpers (tenant scoped by RLS on user_id)
 * ------------------------------------------------------------------ */

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadTaxProfile(uid: string): Promise<TaxProfile> {
  const { data } = await db.from("hospitality_tax_profiles")
    .select("*").eq("user_id", uid).eq("active", true).order("created_at").limit(1).maybeSingle();
  return data ? { ...DEFAULT_TAX_PROFILE, ...data } : DEFAULT_TAX_PROFILE;
}

/** Sum a folio's charges into a settlement view. */
export function folioTotals(charges: any[]) {
  let revenue = 0, vat = 0, levy = 0, service = 0, payments = 0, discounts = 0;
  for (const c of charges) {
    const amt = Number(c.amount || 0);
    if (c.category === "payment" || c.category === "deposit") payments += amt;
    else if (c.category === "discount") discounts += amt;
    else {
      revenue += amt;
      vat += Number(c.vat_amount || 0);
      levy += Number(c.levy_amount || 0);
      service += Number(c.service_charge || 0);
    }
  }
  const gross = revenue + vat + levy + service - discounts;
  return { revenue, vat, levy, service, discounts, payments, gross, balance: gross - payments };
}

/** Open (or reuse) the folio for a reservation. Never creates duplicates. */
export async function ensureFolio(uid: string, reservation: any) {
  const { data: existing } = await db.from("hotel_folios")
    .select("*").eq("reservation_id", reservation.id).eq("status", "open").maybeSingle();
  if (existing) return existing;
  const { count } = await db.from("hotel_folios").select("id", { count: "exact", head: true }).eq("user_id", uid);
  const folioNumber = `F-${String((count ?? 0) + 1).padStart(5, "0")}`;
  const { data, error } = await db.from("hotel_folios").insert({
    user_id: uid,
    reservation_id: reservation.id,
    customer_id: reservation.customer_id ?? null,
    branch_id: reservation.branch_id ?? null,
    folio_number: folioNumber,
    guest_name: reservation.guest_name,
    billing_type: reservation.company ? "company" : "guest",
    status: "open",
  }).select().single();
  if (error) throw error;
  return data;
}
