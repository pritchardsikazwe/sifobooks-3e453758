/**
 * Document printing helpers — the bridge between SifoBooks documents
 * (reports, invoices, statements) and the universal print service.
 *
 * Never opens a browser print dialog. If no agent/gateway is reachable the
 * PDF is saved for download and the job is queued for retry.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { printPdf } from "./universalPrintService";
import { getPrinterForType } from "./printerConfiguration";
import { savePrintQueueJob } from "./printQueue";

export function pdfToBase64(pdf: jsPDF): string {
  const out = pdf.output("datauristring");
  return out.slice(out.indexOf(",") + 1);
}

/** Send an already-built jsPDF document to the configured accounting printer. */
export async function printPdfDocument(pdf: jsPDF, fileName = "document.pdf") {
  const printer = getPrinterForType("pdf");
  try {
    await printPdf(pdfToBase64(pdf), printer, 1, fileName);
    toast.success("Sent to printer");
    return true;
  } catch (error: any) {
    console.error("PDF print failed:", error);
    // Never block the user: keep the PDF available and queue the job.
    pdf.save(fileName);
    await savePrintQueueJob({ type: "pdf", title: fileName, status: "queued", error: String(error?.message ?? error) });
    toast.message("Printer unavailable — PDF saved and job queued");
    return false;
  }
}

export interface PrintTableOptions {
  title: string;
  subtitle?: string;
  meta?: string[];
  columns: string[];
  rows: (string | number)[][];
  totals?: Record<string, string | number>;
  landscape?: boolean;
  fileName?: string;
}

/** Build a branded table document and print it silently. */
export async function printTableDocument(opts: PrintTableOptions) {
  const pdf = new jsPDF({ orientation: opts.landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const margin = 32;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("SIFOBOOKS", margin, y);
  y += 16;
  pdf.setFontSize(12);
  pdf.text(opts.title, margin, y);
  y += 14;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(90);
  if (opts.subtitle) { pdf.text(opts.subtitle, margin, y); y += 11; }
  for (const line of opts.meta ?? []) { pdf.text(line, margin, y); y += 10; }
  pdf.setTextColor(0);

  autoTable(pdf, {
    startY: y + 6,
    head: [opts.columns],
    body: opts.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: [16, 122, 87], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  if (opts.totals && Object.keys(opts.totals).length) {
    const endY = (pdf as any).lastAutoTable?.finalY ?? y;
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      Object.entries(opts.totals).map(([k, v]) => `${k}: ${v}`).join("    •    "),
      margin,
      endY + 16,
    );
  }

  return printPdfDocument(pdf, opts.fileName ?? `${opts.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

/** Print an arbitrary HTML fragment (vouchers, receipts) as a text-flow PDF. */
export async function printHtmlDocument(title: string, html: string, fileName?: string) {
  const el = document.createElement("div");
  el.innerHTML = html;
  const text = (el.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, margin, margin);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(text, 515);
  pdf.text(lines, margin, margin + 22);

  return printPdfDocument(pdf, fileName ?? `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

/** Print the currently rendered report area without a browser dialog. */
export async function printCurrentView(title: string, subtitle?: string, rows?: Record<string, any>[]) {
  if (rows && rows.length) {
    const columns = Object.keys(rows[0]!);
    return printTableDocument({
      title,
      subtitle,
      columns,
      rows: rows.map((r) => columns.map((c) => r[c] ?? "")),
      landscape: columns.length > 7,
      meta: [`Generated: ${new Date().toLocaleString()}`],
    });
  }
  const main = document.querySelector("main") ?? document.body;
  return printHtmlDocument(title, main.innerHTML);
}
