import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  normaliseEmail,
  validateAdminReplacement,
  canSubmitAdminReplacement,
  isSelfHandover,
  staleAdminMemberships,
} from "@/lib/company-admin";

const base = { currentEmail: "old@acme.co.zm", newEmail: "new@acme.co.zm", confirmedEmail: "new@acme.co.zm", acknowledged: true };

describe("administrator email replacement rules", () => {
  it("A. accepts an authorised, well-formed replacement", () => {
    expect(validateAdminReplacement(base)).toBeNull();
    expect(canSubmitAdminReplacement({ ...base, authorised: true })).toBe(true);
  });

  it("B. blocks an unauthorised attempt even when the form is valid", () => {
    expect(canSubmitAdminReplacement({ ...base, authorised: false })).toBe(false);
  });

  it("C. rejects an invalid email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(validateAdminReplacement({ ...base, newEmail: "nope", confirmedEmail: "nope" })).toMatch(/valid email/i);
  });

  it("D. requires the confirmation email to match", () => {
    expect(validateAdminReplacement({ ...base, confirmedEmail: "other@acme.co.zm" })).toMatch(/do not match/i);
  });

  it("E. refuses a no-op replacement with the current admin email", () => {
    expect(validateAdminReplacement({ ...base, newEmail: "OLD@acme.co.zm", confirmedEmail: "old@acme.co.zm" }))
      .toMatch(/already the current/i);
  });

  it("F. requires explicit acknowledgement", () => {
    expect(validateAdminReplacement({ ...base, acknowledged: false })).toMatch(/confirm/i);
  });

  it("G. normalises case and whitespace", () => {
    expect(normaliseEmail("  New@Acme.CO.zm ")).toBe("new@acme.co.zm");
    expect(validateAdminReplacement({ ...base, newEmail: " NEW@acme.co.zm " })).toBeNull();
  });

  it("H. warns when an owner hands over their own access", () => {
    expect(isSelfHandover({ actorUserId: "u1", currentAdminUserId: "u1", isSuperAdmin: false })).toBe(true);
    expect(isSelfHandover({ actorUserId: "u2", currentAdminUserId: "u1", isSuperAdmin: false })).toBe(false);
    expect(isSelfHandover({ actorUserId: "u1", currentAdminUserId: "u1", isSuperAdmin: true })).toBe(false);
  });

  it("I. identifies every owner/admin row the old administrator must lose", () => {
    const rows = [
      { user_id: "old", role: "owner" },
      { user_id: "old", role: "admin" },
      { user_id: "old", role: "viewer" },
      { user_id: "new", role: "owner" },
    ];
    expect(staleAdminMemberships(rows, "old")).toEqual([
      { user_id: "old", role: "owner" },
      { user_id: "old", role: "admin" },
    ]);
    expect(staleAdminMemberships(rows, null)).toEqual([]);
  });

  it("J. leaves other companies' rows untouched (no cross-company effect)", () => {
    const rows = [{ user_id: "old", role: "owner" }, { user_id: "someone-else", role: "owner" }];
    expect(staleAdminMemberships(rows, "old").map((r) => r.user_id)).toEqual(["old"]);
  });
});
