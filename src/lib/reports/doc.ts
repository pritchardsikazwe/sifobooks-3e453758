/* Turn a live ReportResult into a branded document specification.
 * The figures are passed straight through — this only decides layout. */

import type { DocKpi, DocSection, DocSpec } from "@/lib/doc-engine";
import type { ReportResult } from "@/lib/reports/engine";

const money = (v: unknown) =>
  v == null || v === "" ? "" : Number(v).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type ReportDocMeta = {
  docType?: string;
  title: string;
  subtitle?: string;
  period?: string;
  filters?: string[];
  filename: string;
  /** extra summary tables printed above the detail (category totals, etc.) */
  sections?: DocSection[];
  notes?: string;
};

export function reportResultToSpec(result: ReportResult | null, meta: ReportDocMeta): DocSpec {
  const columns = (result?.columns ?? []).filter((c) => !c.defaultHidden);
  const rows = (result?.rows ?? []).map((r) =>
    columns.map((c) => (c.money ? money(r[c.key]) : c.numeric ? String(r[c.key] ?? "") : String(r[c.key] ?? ""))),
  );
  const emphasise = (result?.rows ?? []).reduce<number[]>((acc, r, i) => {
    if (r._emphasis) acc.push(i);
    return acc;
  }, []);

  const kpis: DocKpi[] = (result?.summary ?? []).slice(0, 5).map((s) => ({
    label: s.label, value: s.value, hint: s.hint,
  }));

  const detail: DocSection[] = rows.length
    ? [{
        title: meta.sections?.length ? "Detailed transactions" : undefined,
        columns: columns.map((c) => ({ header: c.label, align: c.money || c.numeric ? ("right" as const) : ("left" as const) })),
        rows,
        emphasise,
      }]
    : [];

  const notes = [meta.notes, ...(result?.notes ?? [])].filter(Boolean).join("\n");

  return {
    docType: meta.docType ?? "report",
    title: meta.title,
    subtitle: meta.subtitle,
    period: meta.period,
    filters: meta.filters,
    kpis: kpis.length ? kpis : undefined,
    sections: [...(meta.sections ?? []), ...detail],
    filename: meta.filename,
    orientation: columns.length > 7 ? "landscape" : "portrait",
    notes: notes || undefined,
  };
}
