/* ------------------------------------------------------------------ *
 * SifoBooks document engine — ONE renderer for every printed page.
 * ------------------------------------------------------------------ *
 * Invoices, quotations, receipts, credit notes, purchase orders,
 * remittance advices, statements, payslips, folios and management reports
 * all describe themselves as a DocSpec and are drawn here, on the active
 * tenant's letterhead. Nothing in this file reads or writes a transaction:
 * callers pass the figures they already loaded, so printing can never
 * change an amount, a document number or a posting.
 *
 * A4 by default, real margins, repeating table headers, honest page
 * numbering (Page X of Y), no microscopic type and no blank pages.
 * ------------------------------------------------------------------ */

import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import {
  DEFAULT_BRANDING, THEMES, brandAddressLines, brandDisplayName, hexToRgb, loadBranding,
  resolveAssetDataUrl, themeForDocument, type DocumentBranding, type ThemeKey,
} from "@/lib/branding";

export type DocColumn = {
  header: string;
  /** right / center / left; money and numeric default to right */
  align?: "left" | "right" | "center";
  /** relative width hint in points */
  width?: number;
};

export type DocSection = {
  title?: string;
  note?: string;
  columns: (string | DocColumn)[];
  rows: (string | number)[][];
  /** Footer row(s) rendered as bold totals inside the table. */
  totals?: (string | number)[][];
  /** Rows to emphasise (0-based index into rows). */
  emphasise?: number[];
};

export type DocParty = { label: string; lines: string[] };
export type DocMeta = { label: string; value: string };
export type DocKpi = { label: string; value: string; hint?: string };
export type DocTotal = { label: string; value: string; emphasis?: boolean };

export type DocSpec = {
  /** Branding template key, e.g. "invoice", "expense_report". */
  docType: string;
  /** Big title on the page, e.g. "TAX INVOICE". */
  title: string;
  /** Document number / reference. */
  number?: string | null;
  status?: string | null;
  subtitle?: string;
  /** "1 Aug 2026 – 31 Aug 2026" etc. */
  period?: string;
  /** Applied filters, printed so the reader knows what they are looking at. */
  filters?: string[];
  parties?: DocParty[];
  meta?: DocMeta[];
  kpis?: DocKpi[];
  sections: DocSection[];
  totals?: DocTotal[];
  amountInWords?: string;
  paymentInstructions?: string;
  terms?: string;
  notes?: string;
  /** Draw a signature / stamp block at the end. */
  signature?: boolean;
  orientation?: "portrait" | "landscape";
  filename: string;
  /** Override the tenant template for this one render. */
  theme?: ThemeKey;
};

const M = 40; // page margin (pt) ≈ 14mm

const colOf = (c: string | DocColumn): DocColumn => (typeof c === "string" ? { header: c } : c);

const looksNumeric = (v: unknown) =>
  typeof v === "number" || (typeof v === "string" && /^[-(]?\s*[A-Z]{0,3}\s?[\d,]+\.\d{2}\)?$/.test(v.trim()));

/**
 * Build a branded PDF. Pass `branding` to render for a specific tenant
 * (the settings preview does); otherwise the active tenant is loaded.
 */
export async function buildBrandedPdf(spec: DocSpec, branding?: DocumentBranding): Promise<jsPDF> {
  const b = branding ?? (await loadBranding().catch(() => DEFAULT_BRANDING));
  const themeKey = spec.theme ?? themeForDocument(b, spec.docType);
  const theme = THEMES[themeKey] ?? THEMES.corporate;
  const font = theme.serif ? "times" : b.fontFamily;

  const doc = new jsPDF({ orientation: spec.orientation ?? "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const primary = hexToRgb(b.primaryColor);
  const secondary = hexToRgb(b.secondaryColor);
  const accent = hexToRgb(b.accentColor);
  const left = theme.sidebar ? M + 14 : M;
  const contentW = W - left - M;

  const [logo, secondaryLogo, signature, stamp] = await Promise.all([
    resolveAssetDataUrl(b.logoUrl),
    resolveAssetDataUrl(b.secondaryLogoUrl),
    spec.signature ? resolveAssetDataUrl(b.signatureUrl) : Promise.resolve(null),
    spec.signature ? resolveAssetDataUrl(b.stampUrl) : Promise.resolve(null),
  ]);

  /* ---------------- letterhead ---------------- */

  const drawSidebar = () => {
    if (!theme.sidebar) return;
    doc.setFillColor(...primary);
    doc.rect(0, 0, 14, H, "F");
    doc.setFillColor(...accent);
    doc.rect(0, 0, 14, 90, "F");
  };

  let y = M;

  const drawLetterhead = () => {
    drawSidebar();
    const bandH = 78;
    if (theme.headerBand) {
      doc.setFillColor(...primary);
      doc.rect(0, 0, W, bandH, "F");
      doc.setFillColor(...accent);
      doc.rect(0, bandH, W, 3, "F");
    }
    const onBand = theme.headerBand;
    const textTop = onBand ? 30 : M + 6;
    let textX = left;

    if (logo) {
      try {
        const boxH = onBand ? 44 : 52;
        doc.addImage(logo, "PNG", left, onBand ? 17 : M, boxH * 1.9, boxH, undefined, "FAST");
        textX = left + boxH * 1.9 + 14;
      } catch { /* a broken logo must never stop a document printing */ }
    }

    doc.setFont(font, "bold").setFontSize(15);
    doc.setTextColor(...(onBand ? ([255, 255, 255] as [number, number, number]) : secondary));
    doc.text(brandDisplayName(b), textX, textTop);

    doc.setFont(font, "normal").setFontSize(8);
    if (onBand) doc.setTextColor(230, 238, 234); else doc.setTextColor(90, 100, 110);
    let ly = textTop + 13;
    const lines = [b.tagline, ...brandAddressLines(b)].filter(Boolean).slice(0, 5);
    for (const line of lines) {
      doc.text(String(line), textX, ly, { maxWidth: contentW * 0.62 });
      ly += 10.5;
    }

    if (secondaryLogo) {
      try { doc.addImage(secondaryLogo, "PNG", W - M - 70, onBand ? 20 : M + 2, 70, 38, undefined, "FAST"); } catch { /* optional */ }
    }

    y = onBand ? bandH + 24 : Math.max(ly + 10, M + 62);

    if (theme.headerRule) {
      doc.setDrawColor(...primary).setLineWidth(1.4);
      doc.line(left, y - 12, W - M, y - 12);
      doc.setDrawColor(...accent).setLineWidth(0.8);
      doc.line(left, y - 9, left + 90, y - 9);
      doc.setLineWidth(0.5);
    }
  };

  drawLetterhead();

  /* ---------------- title block ---------------- */

  doc.setFont(font, "bold").setFontSize(19).setTextColor(...secondary);
  doc.text(theme.uppercaseTitle ? spec.title.toUpperCase() : spec.title, left, y + 4);

  const rightX = W - M;
  let metaY = y - 4;
  if (spec.number) {
    doc.setFont(font, "bold").setFontSize(11).setTextColor(...primary);
    doc.text(String(spec.number), rightX, metaY + 8, { align: "right" });
    metaY += 14;
  }
  if (spec.status) {
    const label = String(spec.status).toUpperCase();
    doc.setFont(font, "bold").setFontSize(8);
    const w = doc.getTextWidth(label) + 16;
    doc.setFillColor(...accent);
    doc.roundedRect(rightX - w, metaY, w, 15, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, rightX - w / 2, metaY + 10.5, { align: "center" });
    metaY += 20;
  }

  y += 16;
  if (spec.subtitle) {
    doc.setFont(font, "normal").setFontSize(10).setTextColor(90, 100, 110);
    doc.text(spec.subtitle, left, y + 6);
    y += 14;
  }
  if (spec.period) {
    doc.setFont(font, "bold").setFontSize(9.5).setTextColor(...primary);
    doc.text(spec.period, left, y + 6);
    y += 14;
  }
  y = Math.max(y + 6, metaY + 8);

  /* ---------------- parties & meta ---------------- */

  if (spec.parties?.length || spec.meta?.length) {
    const boxes = [...(spec.parties ?? [])];
    if (spec.meta?.length) {
      boxes.push({ label: "Details", lines: spec.meta.map((m) => `${m.label}: ${m.value}`) });
    }
    const gap = 14;
    const count = Math.min(boxes.length, 3);
    const w = (contentW - gap * (count - 1)) / count;
    let maxBottom = y;
    boxes.slice(0, 3).forEach((box, i) => {
      const x = left + i * (w + gap);
      let by = y + 14;
      doc.setFont(font, "bold").setFontSize(7.5).setTextColor(...primary);
      doc.text(box.label.toUpperCase(), x, by);
      by += 12;
      doc.setFont(font, "normal").setFontSize(9).setTextColor(45, 55, 65);
      for (const line of box.lines.filter(Boolean)) {
        const wrapped = doc.splitTextToSize(String(line), w - 6);
        doc.text(wrapped, x, by);
        by += 11 * wrapped.length;
      }
      maxBottom = Math.max(maxBottom, by);
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(left, maxBottom + 4, W - M, maxBottom + 4);
    y = maxBottom + 18;
  }

  /* ---------------- filters ---------------- */

  if (spec.filters?.length) {
    doc.setFont(font, "normal").setFontSize(8.5).setTextColor(100, 116, 139);
    const text = `Filters: ${spec.filters.join("   ·   ")}`;
    const wrapped = doc.splitTextToSize(text, contentW);
    doc.text(wrapped, left, y);
    y += 11 * wrapped.length + 6;
  }

  /* ---------------- KPI strip ---------------- */

  if (spec.kpis?.length) {
    const kpis = spec.kpis.slice(0, 5);
    const gap = 10;
    const w = (contentW - gap * (kpis.length - 1)) / kpis.length;
    const h = 48;
    kpis.forEach((k, i) => {
      const x = left + i * (w + gap);
      doc.setFillColor(246, 248, 250);
      doc.roundedRect(x, y, w, h, 4, 4, "F");
      doc.setFillColor(...primary);
      doc.rect(x, y, 3, h, "F");
      doc.setFont(font, "normal").setFontSize(7.5).setTextColor(100, 116, 139);
      doc.text(k.label.toUpperCase(), x + 10, y + 15, { maxWidth: w - 16 });
      doc.setFont(font, "bold").setFontSize(12).setTextColor(...secondary);
      doc.text(k.value, x + 10, y + 32, { maxWidth: w - 16 });
      if (k.hint) {
        doc.setFont(font, "normal").setFontSize(7).setTextColor(120, 130, 140);
        doc.text(k.hint, x + 10, y + 42, { maxWidth: w - 16 });
      }
    });
    y += h + 18;
  }

  /* ---------------- sections ---------------- */

  const bodyBottom = H - 54; // leave room for the footer

  for (const section of spec.sections) {
    if (y > bodyBottom - 90) { doc.addPage(); y = M + 10; drawSidebar(); }
    if (section.title) {
      doc.setFont(font, "bold").setFontSize(11).setTextColor(...secondary);
      doc.text(section.title, left, y);
      doc.setDrawColor(...accent).setLineWidth(1);
      doc.line(left, y + 4, left + Math.min(contentW, doc.getTextWidth(section.title) + 20), y + 4);
      doc.setLineWidth(0.5);
      y += 14;
    }
    if (section.note) {
      doc.setFont(font, "normal").setFontSize(8.5).setTextColor(110, 120, 130);
      const wrapped = doc.splitTextToSize(section.note, contentW);
      doc.text(wrapped, left, y + 4);
      y += 10 * wrapped.length + 6;
    }

    const cols = section.columns.map(colOf);
    const sample = section.rows[0] ?? [];
    const columnStyles: UserOptions["columnStyles"] = {};
    cols.forEach((c, i) => {
      const align = c.align ?? (looksNumeric(sample[i]) ? "right" : "left");
      columnStyles[i] = { halign: align, ...(c.width ? { cellWidth: c.width } : {}) };
    });

    const emphasise = new Set(section.emphasise ?? []);

    autoTable(doc, {
      head: [cols.map((c) => c.header)],
      body: section.rows.map((r) => r.map((cell) => (cell == null ? "" : String(cell)))),
      foot: section.totals?.map((r) => r.map((cell) => (cell == null ? "" : String(cell)))),
      startY: y,
      margin: { left, right: M, bottom: 54 },
      tableWidth: contentW,
      showHead: "everyPage",
      showFoot: "lastPage",
      styles: {
        font,
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        textColor: [30, 41, 51],
        lineColor: [226, 232, 240],
        lineWidth: 0.4,
        overflow: "linebreak",
      },
      headStyles: theme.tableHeadFilled
        ? { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 }
        : { fillColor: [255, 255, 255], textColor: secondary, fontStyle: "bold", fontSize: 8.5, lineWidth: { bottom: 1.1 }, lineColor: primary },
      footStyles: { fillColor: [240, 244, 248], textColor: secondary, fontStyle: "bold", fontSize: 9.5 },
      alternateRowStyles: theme.zebra ? { fillColor: [249, 250, 252] } : {},
      columnStyles,
      didParseCell: (data) => {
        if (data.section === "body" && emphasise.has(data.row.index)) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [237, 243, 240];
        }
      },
      willDrawPage: () => { drawSidebar(); },
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y) + 22;
  }

  /* ---------------- totals ---------------- */

  if (spec.totals?.length) {
    const boxW = Math.min(260, contentW * 0.5);
    const rowH = 17;
    const boxH = spec.totals.length * rowH + 14;
    if (y + boxH > bodyBottom) { doc.addPage(); y = M + 10; drawSidebar(); }
    const x = W - M - boxW;
    doc.setFillColor(248, 250, 251);
    doc.roundedRect(x, y, boxW, boxH, 4, 4, "F");
    let ty = y + 18;
    spec.totals.forEach((t) => {
      if (t.emphasis) {
        doc.setFillColor(...primary);
        doc.rect(x, ty - 12, boxW, rowH + 2, "F");
        doc.setFont(font, "bold").setFontSize(10.5).setTextColor(255, 255, 255);
      } else {
        doc.setFont(font, "normal").setFontSize(9.5).setTextColor(60, 70, 80);
      }
      doc.text(t.label, x + 10, ty);
      doc.text(t.value, x + boxW - 10, ty, { align: "right" });
      ty += rowH;
    });
    y += boxH + 14;
  }

  if (spec.amountInWords) {
    if (y > bodyBottom - 30) { doc.addPage(); y = M + 10; drawSidebar(); }
    doc.setFont(font, "italic").setFontSize(9).setTextColor(60, 70, 80);
    const wrapped = doc.splitTextToSize(`Amount in words: ${spec.amountInWords}`, contentW);
    doc.text(wrapped, left, y);
    y += 11 * wrapped.length + 10;
  }

  /* ---------------- payment, terms, notes ---------------- */

  const block = (title: string, body: string) => {
    if (!body?.trim()) return;
    const wrapped = doc.splitTextToSize(body.trim(), contentW);
    const needed = 16 + wrapped.length * 10.5;
    if (y + needed > bodyBottom) { doc.addPage(); y = M + 10; drawSidebar(); }
    doc.setFont(font, "bold").setFontSize(8.5).setTextColor(...primary);
    doc.text(title.toUpperCase(), left, y);
    doc.setFont(font, "normal").setFontSize(9).setTextColor(60, 70, 80);
    doc.text(wrapped, left, y + 12);
    y += needed + 6;
  };

  const bankLines = b.bankDetails
    .map((d) => [d.bank, d.branch, d.account_name, d.account_number && `A/C ${d.account_number}`, d.swift && `SWIFT ${d.swift}`]
      .filter(Boolean).join("  ·  "))
    .filter(Boolean);

  const payment = [spec.paymentInstructions?.trim(), ...bankLines,
    b.paymentMethods.length ? `Accepted: ${b.paymentMethods.join(", ")}` : ""]
    .filter(Boolean).join("\n");
  block("Payment instructions", payment);
  block("Terms & conditions", spec.terms ?? "");
  block("Notes", spec.notes ?? "");

  /* ---------------- signature ---------------- */

  if (spec.signature) {
    const needed = 74;
    if (y + needed > bodyBottom) { doc.addPage(); y = M + 10; drawSidebar(); }
    if (signature) {
      try { doc.addImage(signature, "PNG", left, y, 120, 40, undefined, "FAST"); } catch { /* optional */ }
    }
    if (stamp) {
      try { doc.addImage(stamp, "PNG", left + 170, y - 6, 76, 76, undefined, "FAST"); } catch { /* optional */ }
    }
    const lineY = y + 46;
    doc.setDrawColor(150, 160, 170);
    doc.line(left, lineY, left + 180, lineY);
    doc.setFont(font, "bold").setFontSize(9).setTextColor(...secondary);
    doc.text(b.signatoryName || "Authorised signatory", left, lineY + 12);
    if (b.signatoryTitle) {
      doc.setFont(font, "normal").setFontSize(8).setTextColor(110, 120, 130);
      doc.text(b.signatoryTitle, left, lineY + 22);
    }
    y = lineY + 32;
  }

  /* ---------------- footer on every page ---------------- */

  const pages = doc.getNumberOfPages();
  const stamped = new Date().toLocaleString(b.locale || "en-ZM");
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...primary).setLineWidth(0.8);
    doc.line(M, H - 40, W - M, H - 40);
    doc.setLineWidth(0.5);
    doc.setFont(font, "normal").setFontSize(7.5).setTextColor(110, 120, 130);
    const footLeft = [brandDisplayName(b), b.footerNote].filter(Boolean).join("  ·  ");
    doc.text(footLeft, M, H - 28, { maxWidth: W / 2 });
    doc.text(`Generated ${stamped}`, W / 2, H - 28, { align: "center" });
    doc.text(`Page ${p} of ${pages}`, W - M, H - 28, { align: "right" });
    if (b.showProviderCredit) {
      doc.setFontSize(6.5).setTextColor(160, 170, 180);
      doc.text("Prepared with SifoBooks", W - M, H - 18, { align: "right" });
    }
  }

  return doc;
}

/** Build and save the document to the browser's downloads. */
export async function downloadBrandedDoc(spec: DocSpec, branding?: DocumentBranding) {
  const pdf = await buildBrandedPdf(spec, branding);
  pdf.save(spec.filename.endsWith(".pdf") ? spec.filename : `${spec.filename}.pdf`);
  return pdf;
}

/** Build and open the document in a preview tab / iframe-safe blob URL. */
export async function previewBrandedDoc(spec: DocSpec, branding?: DocumentBranding): Promise<string> {
  const pdf = await buildBrandedPdf(spec, branding);
  return pdf.output("bloburl") as unknown as string;
}

/* ------------------------------------------------------------------ *
 * Convenience: turn a plain report table into a DocSpec
 * ------------------------------------------------------------------ */

export function reportSpec(opts: {
  docType?: string;
  title: string;
  subtitle?: string;
  period?: string;
  filters?: string[];
  kpis?: DocKpi[];
  columns: (string | DocColumn)[];
  rows: (string | number)[][];
  totals?: (string | number)[][];
  sections?: DocSection[];
  filename: string;
  orientation?: "portrait" | "landscape";
  notes?: string;
}): DocSpec {
  const sections: DocSection[] = [
    ...(opts.sections ?? []),
    ...(opts.rows.length
      ? [{ title: opts.sections?.length ? "Detailed transactions" : undefined, columns: opts.columns, rows: opts.rows, totals: opts.totals }]
      : []),
  ];
  return {
    docType: opts.docType ?? "report",
    title: opts.title,
    subtitle: opts.subtitle,
    period: opts.period,
    filters: opts.filters,
    kpis: opts.kpis,
    sections,
    filename: opts.filename,
    orientation: opts.orientation ?? (opts.columns.length > 7 ? "landscape" : "portrait"),
    notes: opts.notes,
  };
}
