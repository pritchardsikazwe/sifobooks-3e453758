import { describe, expect, it } from "vitest";
import {
  adrRevpar, availableRooms, conflictsFor, eligiblePlans, occupancyFor, quoteStay,
  resolveRatePlan, type RatePlan, type ReservationWindow, type RoomRow,
} from "@/lib/hotel-rates";
import { adapterFor, CHANNEL_CATALOG } from "@/lib/hotel-channels";

const plan = (over: Partial<RatePlan>): RatePlan => ({
  id: "p", code: "STD", name: "Standard", room_type_id: null, nightly_rate: 1000,
  weekend_rate: null, min_stay: 1, max_occupancy: 2, extra_adult_rate: 0, extra_child_rate: 0,
  customer_id: null, rate_type: "standard", season_start: null, season_end: null,
  priority: 0, active: true, ...over,
});

const req = {
  roomTypeId: null, checkIn: "2026-03-02", checkOut: "2026-03-05",
  adults: 2, children: 0, customerId: null as string | null,
};

describe("rate plan resolution", () => {
  it("ignores inactive plans and plans below the minimum stay", () => {
    const plans = [plan({ id: "a", active: false }), plan({ id: "b", min_stay: 10 })];
    expect(resolveRatePlan(plans, req)).toBeNull();
  });

  it("keeps a contract rate private to its company", () => {
    const plans = [plan({ id: "open", nightly_rate: 1200 }), plan({ id: "corp", customer_id: "c1", nightly_rate: 800 })];
    expect(resolveRatePlan(plans, req)?.id).toBe("open");
    expect(resolveRatePlan(plans, { ...req, customerId: "c1" })?.id).toBe("corp");
  });

  it("prefers higher priority, then the cheaper rate", () => {
    const plans = [plan({ id: "a", nightly_rate: 900 }), plan({ id: "b", nightly_rate: 1100, priority: 5 })];
    expect(eligiblePlans(plans, req)[0]?.id).toBe("b");
  });

  it("excludes plans outside their season", () => {
    const plans = [plan({ id: "hi", season_start: "2026-06-01", season_end: "2026-08-31" })];
    expect(resolveRatePlan(plans, req)).toBeNull();
  });
});

describe("stay quote", () => {
  it("prices one line per night and uses the weekend rate", () => {
    const q = quoteStay(plan({ weekend_rate: 1500 }), { ...req, checkIn: "2026-03-06", checkOut: "2026-03-09" });
    expect(q.nights).toBe(3);
    expect(q.lines.map((l) => l.amount)).toEqual([1000, 1500, 1500]);
    expect(q.total).toBe(4000);
  });

  it("charges extra guests beyond the rate occupancy", () => {
    const q = quoteStay(plan({ max_occupancy: 2, extra_adult_rate: 200, extra_child_rate: 100 }), { ...req, adults: 3, children: 1 });
    expect(q.nights).toBe(3);
    expect(q.extraGuestTotal).toBe(900);
    expect(q.total).toBe(3900);
  });
});

describe("availability", () => {
  const rooms: RoomRow[] = [
    { id: "r1", number: "101", room_type_id: "t1" },
    { id: "r2", number: "102", room_type_id: "t1" },
    { id: "r3", number: "103", room_type_id: "t2", out_of_order: true },
  ];
  const res: ReservationWindow[] = [
    { id: "b1", room_id: "r1", check_in: "2026-03-01", check_out: "2026-03-04", status: "confirmed" },
    { id: "b2", room_id: "r2", check_in: "2026-03-01", check_out: "2026-03-02", status: "cancelled" },
  ];

  it("blocks a room for overlapping live bookings only", () => {
    expect(conflictsFor(res, "r1", "2026-03-03", "2026-03-06")).toHaveLength(1);
    expect(conflictsFor(res, "r1", "2026-03-04", "2026-03-06")).toHaveLength(0);
    expect(conflictsFor(res, "r2", "2026-03-01", "2026-03-02")).toHaveLength(0);
  });

  it("hides out-of-order rooms and respects the room type filter", () => {
    const free = availableRooms(rooms, res, "2026-03-02", "2026-03-03");
    expect(free.map((r) => r.id)).toEqual(["r2"]);
    expect(availableRooms(rooms, res, "2026-03-10", "2026-03-11", "t2")).toHaveLength(0);
  });

  it("computes occupancy against sellable stock", () => {
    const o = occupancyFor(rooms, res, "2026-03-02");
    expect(o.sellable).toBe(2);
    expect(o.occupied).toBe(1);
    expect(o.pct).toBe(50);
  });

  it("derives ADR and RevPAR", () => {
    expect(adrRevpar(10000, 10, 20)).toEqual({ adr: 1000, revpar: 500 });
    expect(adrRevpar(0, 0, 0)).toEqual({ adr: 0, revpar: 0 });
  });
});

describe("channel adapters", () => {
  it("never claims a live integration by default", () => {
    for (const c of CHANNEL_CATALOG.filter((x) => x.kind === "ota")) {
      expect(c.requires.length).toBeGreaterThan(0);
    }
  });

  it("falls back to a generic adapter for unknown sources", () => {
    expect(adapterFor("something_else").key).toBe("other");
    expect(adapterFor("booking_com").name).toBe("Booking.com");
  });
});
