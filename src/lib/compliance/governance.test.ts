import { describe, expect, test } from "vitest";
import { assertFiscalTransition } from "@/lib/compliance/fiscal-state";

describe("fiscal transaction state machine", () => {
  test("allows posted -> submitted", () => {
    expect(() => assertFiscalTransition("POSTED", "SUBMITTED")).not.toThrow();
  });

  test("allows submitted -> fiscalized only through accepted", () => {
    expect(() => assertFiscalTransition("SUBMITTED", "FISCALIZED")).toThrow();
  });

  test("allows accepted -> fiscalized", () => {
    expect(() => assertFiscalTransition("ACCEPTED", "FISCALIZED")).not.toThrow();
  });

  test("does not allow editing a fiscalized transaction", () => {
    expect(() => assertFiscalTransition("FISCALIZED", "POSTED")).toThrow();
  });
});
