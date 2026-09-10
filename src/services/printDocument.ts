/**
 * Document printing helpers — the bridge between SifoBooks documents
 * (reports, invoices, statements) and the universal print service.
 *
 * Never opens a browser print dialog. If no agent/gateway is reachable the
 * PDF is saved for download and the job is queued for retry.
 */
import jsPDF from "jspdf";
import { toast } from "sonner";
import { printPdf } from "./universalPrintService";
import { getPrinterForType } from "./printerConfiguration";
import { savePrintQueueJob } from "./printQueue";
import { buildBrandedPdf, type DocSpec } from "@/lib/doc-engine";

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

/** Print any branded document specification silently. */
export async function printBrandedDoc(spec: DocSpec) {
  const pdf = await buildBrandedPdf(spec);
  return printPdfDocument(pdf, spec.filename.endsWith(".pdf") ? spec.filename : `${spec.filename}.pdf`);
}

/** Build a table document on the tenant letterhead and print it silently. */
export async function printTableDocument(opts: PrintTableOptions) {
  return printBrandedDoc({
    docType: "report",
    title: opts.title,
    subtitle: opts.subtitle,
    filters: opts.meta,
    sections: [{ columns: opts.columns, rows: opts.rows }],
    totals: Object.entries(opts.totals ?? {}).map(([label, value], i, arr) => ({
      label, value: String(value), emphasis: i === arr.length - 1,
    })),
    orientation: opts.landscape ? "landscape" : "portrait",
    filename: opts.fileName ?? `${opts.title.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  });
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
