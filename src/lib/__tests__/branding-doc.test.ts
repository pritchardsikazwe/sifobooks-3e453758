import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRANDING, DOCUMENT_TYPES, brandAddressLines, brandDisplayName, hexToRgb,
  mergeBranding, themeForDocument,
} from "@/lib/branding";
import { reportResultToSpec } from "@/lib/reports/doc";
import type { ReportResult } from "@/lib/reports/engine";

describe("document branding", () => {
  it("uses the tenant's own identity, never a placeholder brand", () => {
    const b = mergeBranding({ id: "c1", name: "Design Links Engineering Ltd", city: "Lusaka", tpin: "1001" }, null);
    expect(brandDisplayName(b)).toBe("Design Links Engineering Ltd");
    expect(brandAddressLines(b).join(" ")).toContain("Lusaka");
    expect(brandAddressLines(b).join(" ")).toContain("TPIN 1001");
    expect(JSON.stringify(b)).not.toContain("SifoBooks");
  });

  it("prefers the branding record over the company record", () => {
    const b = mergeBranding({ name: "Old Name", city: "Ndola" }, { trading_name: "New Trading", city: "Kitwe" });
    expect(brandDisplayName(b)).toBe("New Trading");
    expect(b.city).toBe("Kitwe");
  });

  it("falls back to a neutral identity with no tenant", () => {
    expect(brandDisplayName(mergeBranding(null, null))).toBe("Your Company");
  });

  it("applies an industry palette when no colours are chosen", () => {
    expect(mergeBranding({ industry: "hotel" }, null).primaryColor).toBe("#123a5c");
    expect(mergeBranding({ industry: "hotel" }, { primary_color: "#111111" }).primaryColor).toBe("#111111");
  });

  it("resolves per-document templates with a default fallback", () => {
    const b = { ...DEFAULT_BRANDING, theme: "classic" as const, templates: { invoice: "modern" as const } };
    expect(themeForDocument(b, "invoice")).toBe("modern");
    expect(themeForDocument(b, "payslip")).toBe("classic");
  });

  it("labels every supported document type", () => {
    expect(DOCUMENT_TYPES.length).toBeGreaterThanOrEqual(19);
  });

  it("parses colours safely", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("")).toEqual([15, 76, 58]);
  });
});

describe("report → document spec", () => {
  const result: ReportResult = {
    columns: [
      { key: "date", label: "Date" },
      { key: "account", label: "Account" },
      { key: "amount", label: "Amount", money: true },
      { key: "internal", label: "Internal", defaultHidden: true },
    ],
    rows: [
      { date: "2025-01-02", account: "Fuel", amount: 1200.5, internal: "x" },
      { date: "", account: "Total", amount: 1200.5, _emphasis: "total" },
    ],
    summary: [{ label: "Total expenses", value: "1,200.50" }],
    notes: ["Posted journal entries only."],
    sufficient: true,
    facts: { total: 1200.5 },
  };

  it("carries figures, KPIs and emphasis through without recalculating", () => {
    const spec = reportResultToSpec(result, { title: "Expenses", filename: "expenses" });
    const detail = spec.sections[0]!;
    expect(detail.columns).toHaveLength(3); // hidden column excluded
    expect(detail.rows[0]![2]).toBe("1,200.50");
    expect(detail.emphasise).toEqual([1]);
    expect(spec.kpis?.[0]?.value).toBe("1,200.50");
    expect(spec.notes).toContain("Posted journal entries only.");
  });

  it("handles a missing result without throwing", () => {
    const spec = reportResultToSpec(null, { title: "Empty", filename: "empty" });
    expect(spec.sections).toHaveLength(0);
  });
});
