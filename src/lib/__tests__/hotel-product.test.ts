import { describe, expect, it } from "vitest";
import {
  filterHotelNav, hotelAccountingEnabled, hotelModulesToSuppress, hotelRoleFor, isHotelOnly,
} from "@/lib/hotel-product";
import { hubsForMode, HOTEL_HUBS, HUBS } from "@/lib/nav-hubs";
import { landingFor } from "@/lib/workspace";

const nav = [
  { to: "/hotel" }, { to: "/hotel/housekeeping" }, { to: "/hotel/night-audit" }, { to: "/hotel/folios" },
];

describe("SifoHotel product", () => {
  it("recognises the hotel-only mode and its landing screen", () => {
    expect(isHotelOnly("hotel_only")).toBe(true);
    expect(isHotelOnly("accounting")).toBe(false);
    expect(landingFor("hotel_only")).toBe("/hotel");
  });

  it("keeps the hotel module switched on while suppressing other non-core modules", () => {
    const off = hotelModulesToSuppress();
    expect(off).not.toContain("hotel_erp");
    expect(off.length).toBeGreaterThan(0);
  });

  it("never claims a general ledger a hotel-only tenant has not enabled", () => {
    expect(hotelAccountingEnabled("hotel_only")).toBe(false);
    expect(hotelAccountingEnabled("pos_accounting")).toBe(true);
    expect(hotelAccountingEnabled("hotel_only", new Set(["finance"]))).toBe(false);
  });

  it("presents hotel hubs only in hotel-only mode", () => {
    expect(hubsForMode("hotel_only")).toBe(HOTEL_HUBS);
    expect(hubsForMode("accounting")).toBe(HUBS);
  });

  it("maps staff roles to hotel roles and narrows the shell", () => {
    expect(hotelRoleFor(["housekeeping_attendant"])).toBe("housekeeping");
    expect(hotelRoleFor(["front_desk"])).toBe("reception");
    expect(hotelRoleFor(["owner"])).toBe("admin");
    expect(filterHotelNav(nav, "housekeeping").map((n) => n.to)).toEqual(["/hotel/housekeeping"]);
    expect(filterHotelNav(nav, "admin")).toHaveLength(nav.length);
  });
});
