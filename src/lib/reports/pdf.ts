// Branded PDF exporter for the Reports Centre.
import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

export type BrandedPdfOptions = {
  title: string;
  subtitle?: string;
  company?: string;
  orientation?: "portrait" | "landscape";
  filename: string;
  head: string[];
  body: (string | number)[][];
  foot?: (string | number)[][];
  /** Optional summary "KPI" rows shown between header and table. */
  kpis?: { label: string; value: string }[];
};

export function exportBrandedPdf(opts: BrandedPdfOptions) {
  const doc = new jsPDF({ orientation: opts.orientation ?? "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // Header band
  doc.setFillColor(6, 78, 59); // deep emerald
  doc.rect(0, 0, pageWidth, 46, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("SifoBooks", 32, 28);
  doc.setFont("helvetica", "normal").setFontSize(9);
  if (opts.company) doc.text(opts.company, pageWidth - 32, 20, { align: "right" });
  doc.text(now.toLocaleString(), pageWidth - 32, 34, { align: "right" });

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text(opts.title, 32, 82);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(opts.subtitle, 32, 100);
  }

  let cursor = opts.subtitle ? 118 : 100;

  // KPI cards
  if (opts.kpis?.length) {
    const gap = 12;
    const w = (pageWidth - 64 - gap * (opts.kpis.length - 1)) / opts.kpis.length;
    opts.kpis.forEach((k, i) => {
      const x = 32 + i * (w + gap);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, cursor, w, 42, 4, 4, "F");
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 116, 139);
      doc.text(k.label.toUpperCase(), x + 10, cursor + 14);
      doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(15, 23, 42);
      doc.text(k.value, x + 10, cursor + 32);
    });
    cursor += 56;
  }

  const tableOpts: UserOptions = {
    head: [opts.head],
    body: opts.body,
    foot: opts.foot,
    startY: cursor,
    margin: { left: 32, right: 32 },
    styles: { fontSize: 9, cellPadding: 6, textColor: [15, 23, 42], lineColor: [226, 232, 240] },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const p = doc.getNumberOfPages();
      doc.setFontSize(8).setTextColor(148, 163, 184);
      doc.text(
        `${opts.title}  •  Page ${data.pageNumber} of ${p}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 16,
        { align: "center" },
      );
    },
  };
  autoTable(doc, tableOpts);
  doc.save(`${opts.filename}.pdf`);
}
