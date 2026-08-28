import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { fmtMoney } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export type PdfLine = {
  description: string;
  qty: number;
  price: number;
  discount?: number;
  discountType?: "%" | "ZMW";
  vatRate: number;
  taxCode?: string;      // A / B / C / D / E / X
  lineTotal: number;     // gross line total (incl VAT when inclusive)
};

export type PdfDoc = {
  kind: "Invoice" | "Quote" | "Credit Note" | "Receipt";
  number: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  currency: string;
  taxInclusive: boolean;
  company?: {
    name?: string; address?: string; tpin?: string; email?: string; phone?: string;
    bank_name?: string; bank_account_number?: string; logo_url?: string | null;
    payslip_header?: string | null; payslip_footer?: string | null;
  } | null;
  customer?: { name?: string; address?: string; tpin?: string; email?: string; phone?: string } | null;
  buyerTpin?: string;
  items: PdfLine[];
  subtotal: number;   // net (excl VAT)
  tax: number;        // VAT total
  total: number;      // gross incl. VAT
  notes?: string;

  // Extended Zambian tax scheme
  taxScheme?: "vat" | "vat_wht" | "turnover" | "rental_wht" | "tourism" | "exempt";
  whtRate?: number;        // e.g. 15, 10, 4
  whtAmount?: number;
  tourismLevyRate?: number;
  tourismLevyAmount?: number;
  turnoverRate?: number;
  turnoverAmount?: number;
  payable?: number;        // total minus WHT (what buyer actually pays)
};

/** Emerald Executive palette — locked. */
const BRAND = {
  dark:    "#064e3b",   // deep emerald header band
  primary: "#059669",   // accent stripe / totals bar
  accent:  "#c9a84c",   // gold ledger accent
  ivory:   "#f5f0e0",
  slate:   "#0f172a",
  muted:   "#64748b",
  line:    "#e2e8f0",
  soft:    "#ecfdf5",
};

async function resolveLogoDataUrl(logoUrl?: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  let url = logoUrl;
  // storage path? resolve signed URL from company-logos bucket
  if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) {
    try {
      const { data } = await supabase.storage.from("company-logos").createSignedUrl(url, 300);
      if (!data?.signedUrl) return null;
      url = data.signedUrl;
    } catch { return null; }
  }
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

function taxLabel(code?: string, rate?: number): string {
  const r = rate ?? 0;
  switch (code) {
    case "A": return "A (VAT 16%)";
    case "B": return "B (Zero-rated 0%)";
    case "C": return "C (Exempt)";
    case "D": return "D (Zero-rated Dom.)";
    case "E": return "E (Export 0%)";
    case "X": return "X (Out of scope)";
    default:  return `${r}%`;
  }
}

export async function buildDocPdf(doc: PdfDoc) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;

  // ============ HEADER BAND (Emerald Executive) ============
  pdf.setFillColor(BRAND.dark);
  pdf.rect(0, 0, pageW, 108, "F");
  pdf.setFillColor(BRAND.primary);
  pdf.rect(0, 100, pageW, 8, "F");
  pdf.setFillColor(BRAND.accent);
  pdf.rect(0, 108, pageW, 2, "F");

  // Logo (top-left, on the dark band)
  const logoData = await resolveLogoDataUrl(doc.company?.logo_url);
  let textStartX = margin;
  if (logoData) {
    try {
      const fmt = logoData.startsWith("data:image/png") ? "PNG" : "JPEG";
      pdf.addImage(logoData, fmt as any, margin, 22, 62, 62, undefined, "FAST");
      textStartX = margin + 76;
    } catch { /* ignore */ }
  }

  // Company block
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text((doc.company?.name ?? "SifoBooks").toUpperCase(), textStartX, 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(220, 234, 224);
  const compLines = [
    doc.company?.address,
    [doc.company?.email, doc.company?.phone].filter(Boolean).join("  ·  "),
    doc.company?.tpin ? `TPIN: ${doc.company.tpin}` : null,
  ].filter(Boolean) as string[];
  compLines.forEach((line, i) => pdf.text(line, textStartX, 56 + i * 12, { maxWidth: pageW - textStartX - 200 }));

  // Right side: document type + meta
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(BRAND.ivory);
  pdf.text(doc.kind.toUpperCase(), pageW - margin, 44, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(220, 234, 224);
  const rightBlock = [
    `${doc.kind} #: ${doc.number}`,
    `Issued: ${doc.issueDate}`,
    doc.kind === "Invoice" && doc.dueDate ? `Due: ${doc.dueDate}` : null,
    doc.kind === "Quote" && doc.validUntil ? `Valid until: ${doc.validUntil}` : null,
    `Currency: ${doc.currency}`,
  ].filter(Boolean) as string[];
  rightBlock.forEach((line, i) => pdf.text(line, pageW - margin, 62 + i * 12, { align: "right" }));

  let y = 130;

  // ============ BILL TO ============
  pdf.setFillColor(BRAND.soft);
  pdf.setDrawColor(BRAND.line);
  pdf.roundedRect(margin, y, pageW - margin * 2, 74, 4, 4, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(BRAND.dark);
  pdf.text(doc.kind === "Quote" ? "QUOTED TO" : "BILL TO", margin + 12, y + 16);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(BRAND.slate);
  pdf.text(doc.customer?.name ?? "—", margin + 12, y + 32);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80);
  const custLines = [
    doc.customer?.address,
    [doc.customer?.email, doc.customer?.phone].filter(Boolean).join("  ·  "),
    (doc.buyerTpin || doc.customer?.tpin) ? `TPIN: ${doc.buyerTpin || doc.customer?.tpin}` : null,
  ].filter(Boolean) as string[];
  custLines.forEach((line, i) => pdf.text(line, margin + 12, y + 48 + i * 11, { maxWidth: pageW - margin * 2 - 24 }));
  y += 90;

  // ============ LINE ITEMS ============
  const cur = doc.currency;
  autoTable(pdf, {
    startY: y,
    head: [["#", "Description", "Qty", "Unit Price", "Discount", "Tax", "Amount"]],
    body: doc.items.map((it, i) => [
      String(i + 1),
      it.description,
      String(it.qty),
      fmtMoney(it.price, cur),
      it.discount ? `${it.discount}${it.discountType === "%" ? "%" : ` ${cur}`}` : "—",
      taxLabel(it.taxCode, it.vatRate),
      fmtMoney(it.lineTotal, cur),
    ]),
    styles: { fontSize: 9, cellPadding: 6, textColor: 40, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: BRAND.dark, textColor: 255, halign: "left", fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      2: { halign: "right", cellWidth: 36 },
      3: { halign: "right", cellWidth: 68 },
      4: { halign: "right", cellWidth: 54 },
      5: { halign: "left",  cellWidth: 82 },
      6: { halign: "right", cellWidth: 82, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error autotable
  y = pdf.lastAutoTable.finalY + 14;

  // ============ TAX BREAKDOWN + TOTALS ============
  // VAT by rate breakdown (only non-zero)
  const vatByRate = new Map<number, { base: number; vat: number }>();
  for (const it of doc.items) {
    const gross = it.qty * it.price;
    const disc = it.discountType === "%" ? gross * ((it.discount ?? 0) / 100) : (it.discount ?? 0);
    const net = Math.max(gross - disc, 0);
    const rate = it.vatRate / 100;
    let base = 0, vat = 0;
    if (doc.taxInclusive) { base = net / (1 + rate); vat = net - base; }
    else { base = net; vat = net * rate; }
    const key = it.vatRate;
    const prev = vatByRate.get(key) ?? { base: 0, vat: 0 };
    vatByRate.set(key, { base: prev.base + base, vat: prev.vat + vat });
  }

  // Left card: VAT breakdown table
  const breakX = margin;
  const breakW = 260;
  pdf.setDrawColor(BRAND.line);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(breakX, y, breakW, 96, 4, 4, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(BRAND.dark);
  pdf.text("TAX BREAKDOWN", breakX + 10, y + 14);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(BRAND.muted);
  pdf.text("Rate", breakX + 10, y + 28);
  pdf.text("Net", breakX + 90, y + 28, { align: "right" });
  pdf.text("VAT", breakX + 165, y + 28, { align: "right" });
  pdf.text("Gross", breakX + breakW - 10, y + 28, { align: "right" });
  pdf.setDrawColor(BRAND.line);
  pdf.line(breakX + 10, y + 32, breakX + breakW - 10, y + 32);

  let ry = y + 44;
  const rates = Array.from(vatByRate.entries()).sort((a, b) => a[0] - b[0]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(BRAND.slate);
  if (rates.length === 0) {
    pdf.setTextColor(BRAND.muted);
    pdf.text("—", breakX + 10, ry);
  } else {
    for (const [rate, agg] of rates.slice(0, 5)) {
      pdf.text(`${rate}%`, breakX + 10, ry);
      pdf.text(fmtMoney(agg.base, cur), breakX + 90, ry, { align: "right" });
      pdf.text(fmtMoney(agg.vat, cur), breakX + 165, ry, { align: "right" });
      pdf.text(fmtMoney(agg.base + agg.vat, cur), breakX + breakW - 10, ry, { align: "right" });
      ry += 12;
    }
  }

  // Scheme badge
  if (doc.taxScheme) {
    const map: Record<string, string> = {
      vat: "VAT Scheme",
      vat_wht: "VAT + Withholding Tax",
      turnover: `Turnover Tax ${(doc.turnoverRate ?? 4)}%`,
      rental_wht: `Rental WHT ${(doc.whtRate ?? 4)}%`,
      tourism: `Tourism Levy ${(doc.tourismLevyRate ?? 5)}%`,
      exempt: "Exempt / Out of scope",
    };
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(BRAND.dark);
    pdf.text(`Scheme: ${map[doc.taxScheme] ?? doc.taxScheme}`, breakX + 10, y + 88);
  }

  // Right totals block
  const totalsX = pageW - margin - 240;
  const totalsW = 240;
  let ty = y;
  const row = (label: string, val: string, opts?: { bold?: boolean; fill?: string; text?: string; danger?: boolean }) => {
    const fill = opts?.fill;
    const text = opts?.text ?? BRAND.slate;
    if (fill) {
      pdf.setFillColor(fill);
      pdf.rect(totalsX, ty, totalsW, 22, "F");
      pdf.setTextColor(text);
    } else {
      pdf.setTextColor(opts?.danger ? "#b91c1c" : BRAND.slate);
    }
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(opts?.bold ? 11 : 9.5);
    pdf.text(label, totalsX + 12, ty + 14);
    pdf.text(val, totalsX + totalsW - 12, ty + 14, { align: "right" });
    ty += 22;
  };

  row("Subtotal (excl. VAT)", fmtMoney(doc.subtotal, cur));
  row(`VAT ${doc.taxInclusive ? "(inclusive)" : "(exclusive)"}`, fmtMoney(doc.tax, cur));

  if (doc.tourismLevyAmount && doc.tourismLevyAmount > 0) {
    row(`Tourism Levy ${(doc.tourismLevyRate ?? 5)}%`, fmtMoney(doc.tourismLevyAmount, cur));
  }
  if (doc.turnoverAmount && doc.turnoverAmount > 0) {
    row(`Turnover Tax ${(doc.turnoverRate ?? 4)}%`, fmtMoney(doc.turnoverAmount, cur));
  }

  row("TOTAL", fmtMoney(doc.total, cur), { bold: true, fill: BRAND.primary, text: "#ffffff" });

  if (doc.whtAmount && doc.whtAmount > 0) {
    row(`Less: WHT ${(doc.whtRate ?? 15)}%`, `-${fmtMoney(doc.whtAmount, cur)}`, { danger: true });
    row("PAYABLE", fmtMoney(doc.payable ?? (doc.total - (doc.whtAmount ?? 0)), cur), { bold: true, fill: BRAND.dark, text: BRAND.ivory });
  }
  y = Math.max(y + 100, ty) + 8;

  // ============ BANK DETAILS (invoices only) ============
  if (doc.kind === "Invoice" && doc.company?.bank_name) {
    pdf.setFillColor("#fffdf5");
    pdf.setDrawColor(BRAND.accent);
    pdf.roundedRect(margin, y, pageW - margin * 2, 54, 4, 4, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(BRAND.dark);
    pdf.text("REMIT PAYMENT TO", margin + 12, y + 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(BRAND.slate);
    pdf.text(`Bank: ${doc.company.bank_name}`, margin + 12, y + 32);
    pdf.text(`Account #: ${doc.company.bank_account_number ?? "—"}`, margin + 12, y + 46);
    pdf.text(`Account Name: ${doc.company.name ?? "—"}`, margin + 260, y + 32);
    if (doc.whtAmount && doc.whtAmount > 0) {
      pdf.setTextColor("#b91c1c");
      pdf.setFont("helvetica", "bold");
      pdf.text(`Deduct WHT ${(doc.whtRate ?? 15)}% (${fmtMoney(doc.whtAmount, cur)}) — remit to ZRA`, margin + 260, y + 46);
    }
    y += 66;
  }

  // ============ NOTES ============
  if (doc.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(BRAND.dark);
    pdf.text("NOTES", margin, y + 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    const wrapped = pdf.splitTextToSize(doc.notes, pageW - margin * 2);
    pdf.text(wrapped, margin, y + 26);
    y += 26 + wrapped.length * 11;
  }

  // ============ FISCAL / TAX COMPLIANCE + QR ============
  const fiscalY = Math.max(y + 10, pageH - 170);
  const sellerTpin = doc.company?.tpin ?? "";
  const buyerTpin = doc.buyerTpin || doc.customer?.tpin || "";
  const fiscalRef = `SIFO/${doc.kind.charAt(0)}/${doc.number}/${doc.issueDate}/${sellerTpin || "NA"}`;
  const qrPayload = [
    `TYPE:${doc.kind}`, `NO:${doc.number}`, `DATE:${doc.issueDate}`,
    `SELLER_TPIN:${sellerTpin || "NA"}`, `BUYER_TPIN:${buyerTpin || "NA"}`,
    `NET:${doc.subtotal.toFixed(2)}`, `VAT:${doc.tax.toFixed(2)}`,
    `WHT:${(doc.whtAmount ?? 0).toFixed(2)}`, `TOTAL:${doc.total.toFixed(2)}`,
    `PAY:${(doc.payable ?? doc.total).toFixed(2)}`, `CUR:${doc.currency}`, `REF:${fiscalRef}`,
  ].join("|");

  let qrDataUrl: string | null = null;
  try { qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 240, errorCorrectionLevel: "M" }); } catch {}

  pdf.setDrawColor(BRAND.line);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, fiscalY, pageW - margin * 2, 110, 4, 4, "FD");
  if (qrDataUrl) pdf.addImage(qrDataUrl, "PNG", margin + 10, fiscalY + 10, 90, 90);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND.dark);
  pdf.text("ZRA FISCAL / TAX COMPLIANCE REFERENCE", margin + 110, fiscalY + 18);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const kvs: [string, string][] = [
    ["Document Reference", fiscalRef],
    ["Seller TPIN", sellerTpin || "—"],
    ["Buyer TPIN", buyerTpin || "—"],
    ["Net (excl. VAT)", fmtMoney(doc.subtotal, doc.currency)],
    ["VAT", fmtMoney(doc.tax, doc.currency)],
    ["Gross Total", fmtMoney(doc.total, doc.currency)],
    ...(doc.whtAmount ? ([["WHT Deducted", fmtMoney(doc.whtAmount, doc.currency)]] as [string, string][]) : []),
    ...(doc.payable ? ([["Net Payable", fmtMoney(doc.payable, doc.currency)]] as [string, string][]) : []),
  ];
  kvs.forEach(([k, v], i) => {
    const rr = Math.floor(i / 2);
    const col = i % 2;
    const cx = margin + 110 + col * 200;
    const cy = fiscalY + 34 + rr * 13;
    pdf.setTextColor(BRAND.muted);
    pdf.text(k + ":", cx, cy);
    pdf.setTextColor(BRAND.slate);
    pdf.setFont("helvetica", "bold");
    pdf.text(v, cx + 88, cy);
    pdf.setFont("helvetica", "normal");
  });

  pdf.setFontSize(7);
  pdf.setTextColor(BRAND.muted);
  pdf.text("Scan QR to verify against SifoBooks fiscal ledger · ZRA Smart Invoice ready.", margin + 110, fiscalY + 100);

  // ============ FOOTER ============
  pdf.setDrawColor(BRAND.line);
  pdf.line(margin, pageH - 30, pageW - margin, pageH - 30);
  pdf.setFontSize(7.5);
  pdf.setTextColor(BRAND.muted);
  pdf.text("Generated by SifoBooks Accounting ERP · ZMW · ZRA Ready", margin, pageH - 18);
  pdf.text(`Page 1 of 1  ·  ${new Date().toLocaleDateString()}`, pageW - margin, pageH - 18, { align: "right" });

  return pdf;
}

/**
 * Opens the document for the user without a browser popup or print dialog.
 * Silent printing goes through printAccountingPdf() instead.
 */
export async function previewPdf(doc: PdfDoc) {
  const pdf = await buildDocPdf(doc);
  pdf.save(`${doc.kind}-${doc.number}.pdf`);
}

/** Silent print of an accounting document via the SifoPrint agent / network gateway. */
export async function printAccountingPdf(doc: PdfDoc) {
  const pdf = await buildDocPdf(doc);
  const base64 = String(pdf.output("datauristring")).split(",")[1] ?? "";
  const { printPdf } = await import("@/services/universalPrintService");
  const { getPrinterForType } = await import("@/services/printerConfiguration");
  const { savePrintQueueJob } = await import("@/services/printQueue");
  try {
    await printPdf(base64, getPrinterForType("pdf"), 1, `${doc.kind}-${doc.number}.pdf`);
  } catch (error: any) {
    console.error("Accounting PDF print failed:", error);
    await savePrintQueueJob({
      type: "pdf", title: `${doc.kind} ${doc.number}`, status: "queued",
      error: String(error?.message ?? error),
    });
  }
}

export async function downloadPdf(doc: PdfDoc) {
  const pdf = await buildDocPdf(doc);
  pdf.save(`${doc.kind}-${doc.number}.pdf`);
}
