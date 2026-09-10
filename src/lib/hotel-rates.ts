/* ------------------------------------------------------------------ *
 * Hotel rates & availability — pure, testable logic.
 * No writes here; callers own persistence. Money is plain ZMW decimals
 * consistent with the rest of the hospitality layer.
 * ------------------------------------------------------------------ */

import { nightsBetween } from "@/lib/hospitality";

export type RatePlan = {
  id: string;
  code: string;
  name: string;
  room_type_id: string | null;
  nightly_rate: number;
  weekend_rate?: number | null;
  min_stay: number;
  max_occupancy?: number | null;
  extra_adult_rate: number;
  extra_child_rate: number;
  customer_id?: string | null;
  rate_type: string; // standard | corporate | promotional | package
  season_start?: string | null;
  season_end?: string | null;
  priority: number;
  active: boolean;
};

export const RATE_TYPES = ["standard", "corporate", "promotional", "package"] as const;

export type StayRequest = {
  roomTypeId: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  customerId?: string | null;
};

const inSeason = (p: RatePlan, date: string) => {
  if (p.season_start && date < p.season_start) return false;
  if (p.season_end && date > p.season_end) return false;
  return true;
};

export function datesOfStay(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  const nights = nightsBetween(checkIn, checkOut);
  const start = new Date(checkIn).getTime();
  for (let i = 0; i < nights; i++) out.push(new Date(start + i * 86400000).toISOString().slice(0, 10));
  return out;
}

const isWeekend = (iso: string) => {
  const d = new Date(iso).getDay();
  return d === 0 || d === 6;
};

/** Rate plans that may legitimately be applied to this stay, best first. */
export function eligiblePlans(plans: RatePlan[], req: StayRequest): RatePlan[] {
  const nights = nightsBetween(req.checkIn, req.checkOut);
  const guests = Math.max(1, req.adults) + Math.max(0, req.children);
  return plans
    .filter((p) => p.active)
    .filter((p) => !p.room_type_id || !req.roomTypeId || p.room_type_id === req.roomTypeId)
    .filter((p) => nights >= Math.max(1, p.min_stay))
    .filter((p) => !p.max_occupancy || guests <= p.max_occupancy)
    // a contract rate belongs to one company only
    .filter((p) => !p.customer_id || p.customer_id === req.customerId)
    .filter((p) => inSeason(p, req.checkIn))
    .sort((a, b) => {
      // explicit contract rate wins, then priority, then cheapest
      const contract = Number(Boolean(b.customer_id)) - Number(Boolean(a.customer_id));
      if (contract) return contract;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.nightly_rate - b.nightly_rate;
    });
}

export function resolveRatePlan(plans: RatePlan[], req: StayRequest): RatePlan | null {
  return eligiblePlans(plans, req)[0] ?? null;
}

export type StayQuote = {
  nights: number;
  lines: { date: string; amount: number }[];
  roomTotal: number;
  extraGuestTotal: number;
  total: number;
};

/** Nightly breakdown for a plan — auditable, one line per night. */
export function quoteStay(plan: RatePlan, req: StayRequest): StayQuote {
  const dates = datesOfStay(req.checkIn, req.checkOut);
  const baseOccupancy = plan.max_occupancy ?? 2;
  const extraAdults = Math.max(0, Math.max(1, req.adults) - baseOccupancy);
  const extraGuestPerNight =
    extraAdults * Number(plan.extra_adult_rate || 0) +
    Math.max(0, req.children) * Number(plan.extra_child_rate || 0);

  const lines = dates.map((date) => {
    const base = isWeekend(date) && plan.weekend_rate != null
      ? Number(plan.weekend_rate)
      : Number(plan.nightly_rate);
    return { date, amount: round2(base + extraGuestPerNight) };
  });

  const roomTotal = round2(lines.reduce((s, l) => s + l.amount, 0) - extraGuestPerNight * lines.length);
  const extraGuestTotal = round2(extraGuestPerNight * lines.length);
  return {
    nights: dates.length,
    lines,
    roomTotal,
    extraGuestTotal,
    total: round2(roomTotal + extraGuestTotal),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ *
 * Availability
 * ------------------------------------------------------------------ */

export type ReservationWindow = {
  id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  status: string;
};

export const BLOCKING_STATUSES = new Set(["enquiry", "confirmed", "checked_in"]);

export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && bIn < aOut;
}

/** Reservations that would clash with the requested stay for a room. */
export function conflictsFor(
  reservations: ReservationWindow[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  ignoreReservationId?: string,
): ReservationWindow[] {
  return reservations.filter(
    (r) =>
      r.room_id === roomId &&
      r.id !== ignoreReservationId &&
      BLOCKING_STATUSES.has(r.status) &&
      overlaps(checkIn, checkOut, r.check_in, r.check_out),
  );
}

export type RoomRow = {
  id: string;
  number: string;
  room_type_id: string | null;
  out_of_order?: boolean | null;
  active?: boolean | null;
  status?: string | null;
  rate_override?: number | null;
};

/** Rooms that are bookable for the whole requested window. */
export function availableRooms(
  rooms: RoomRow[],
  reservations: ReservationWindow[],
  checkIn: string,
  checkOut: string,
  roomTypeId?: string | null,
  ignoreReservationId?: string,
): RoomRow[] {
  return rooms
    .filter((r) => r.active !== false && !r.out_of_order && r.status !== "out_of_order")
    .filter((r) => !roomTypeId || r.room_type_id === roomTypeId)
    .filter((r) => conflictsFor(reservations, r.id, checkIn, checkOut, ignoreReservationId).length === 0);
}

/** Occupancy for a single night, ignoring out-of-order stock. */
export function occupancyFor(
  rooms: RoomRow[],
  reservations: ReservationWindow[],
  date: string,
): { sellable: number; occupied: number; pct: number } {
  const sellable = rooms.filter((r) => r.active !== false && !r.out_of_order && r.status !== "out_of_order").length;
  const next = new Date(new Date(date).getTime() + 86400000).toISOString().slice(0, 10);
  const occupied = rooms.filter((r) => conflictsFor(reservations, r.id, date, next).length > 0).length;
  return { sellable, occupied, pct: sellable ? round2((occupied / sellable) * 100) : 0 };
}

/** ADR / RevPAR from realised room revenue. */
export function adrRevpar(roomRevenue: number, roomsSold: number, sellableRooms: number) {
  return {
    adr: roomsSold ? round2(roomRevenue / roomsSold) : 0,
    revpar: sellableRooms ? round2(roomRevenue / sellableRooms) : 0,
  };
}
