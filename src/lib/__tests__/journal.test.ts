import { describe, expect, it } from "vitest";
import { emptyLine, journalTotals, numberToMinor, toMinor, validateJournal, journalSource } from "@/lib/journal";

const line = (account: string | null, debit: string, credit: string) => ({
  ...emptyLine(), account_id: account, debit, credit,
});
const header = { entry_number: "JE-0001", entry_date: "2026-04-30", reference: "", description: "" };

describe("money parsing", () => {
  it("parses decimals into exact minor units", () => {
    expect(toMinor("0.1")).toBe(10);
    expect(toMinor("1234.56")).toBe(123456);
    expect(toMinor("")).toBe(0);
  });
  it("rejects invalid input", () => {
    expect(toMinor("abc")).toBeNull();
    expect(toMinor("1.2.3")).toBeNull();
  });
  it("avoids floating point drift", () => {
    const t = journalTotals([line("a", "0.1", ""), line("b", "0.2", ""), line("c", "", "0.3")]);
    expect(t.differenceMinor).toBe(0);
    expect(t.balanced).toBe(true);
  });
  it("converts stored numerics without drift", () => {
    expect(numberToMinor(0.1 + 0.2)).toBe(30);
  });
});

describe("validateJournal", () => {
  it("accepts a balanced two-sided journal", () => {
    expect(validateJournal(header, [line("a", "100.00", ""), line("b", "", "100.00")])).toEqual([]);
  });
  it("blocks an unbalanced journal", () => {
    const p = validateJournal(header, [line("a", "100.00", ""), line("b", "", "90.00")]);
    expect(p.some(x => x.includes("equal"))).toBe(true);
  });
  it("blocks missing accounts and empty amounts", () => {
    const p = validateJournal(header, [line(null, "100.00", ""), line("b", "", "100.00")]);
    expect(p.some(x => x.includes("chart of accounts"))).toBe(true);
  });
  it("blocks a single line and an empty grid", () => {
    expect(validateJournal(header, [line("a", "10.00", "")]).length).toBeGreaterThan(0);
    expect(validateJournal(header, [emptyLine()]).length).toBeGreaterThan(0);
  });
  it("blocks debit and credit on the same line", () => {
    const p = validateJournal(header, [line("a", "10.00", "10.00"), line("b", "", "10.00")]);
    expect(p.some(x => x.includes("not both"))).toBe(true);
  });
  it("requires an entry number", () => {
    const p = validateJournal({ ...header, entry_number: " " }, [line("a", "10.00", ""), line("b", "", "10.00")]);
    expect(p.some(x => x.includes("Entry number"))).toBe(true);
  });
});

describe("journalSource", () => {
  it("labels known reference prefixes", () => {
    expect(journalSource("INV:1001")).toBe("Sales invoice");
    expect(journalSource(null)).toBe("Manual journal");
  });
});
