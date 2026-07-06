import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { fmtMoney } from "@/lib/format";

export type PdfLine = {
  description: string;
  qty: number;
  price: number;
  discount?: number;
  discountType?: "%" | "ZMW";
  vatRate: number;
  lineTotal: number;
};

export type PdfDoc = {
  kind: "Invoice" | "Quote";
  number: string;
  issueDate: string;
  dueDate?: string;       // invoice
  validUntil?: string;    // quote
  currency: string;
  taxInclusive: boolean;
  company?: {
    name?: string; address?: string; tpin?: string; email?: string; phone?: string;
    bank_name?: string; bank_account_number?: string;
  } | null;
  customer?: { name?: string; address?: string; tpin?: string; email?: string; phone?: string } | null;
  buyerTpin?: string;
  items: PdfLine[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
};

const BRAND = "#0f4c5c";

export async function buildDocPdf(doc: PdfDoc) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Brand band
  pdf.setFillColor(BRAND);
  pdf.rect(0, 0, pageW, 8, "F");
  y += 6;

  // Header row: company (left) + doc block (right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(20, 20, 20);
  pdf.text(doc.company?.name ?? "SifoBooks", margin, y + 20);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  const compLines = [
    doc.company?.address,
    doc.company?.tpin ? `TPIN: ${doc.company.tpin}` : null,
    doc.company?.email,
    doc.company?.phone,
  ].filter(Boolean) as string[];
  compLines.forEach((line, i) => pdf.text(line, margin, y + 36 + i * 12));

  // Doc block (right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(BRAND);
  pdf.text(doc.kind.toUpperCase(), pageW - margin, y + 20, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60);
  const rightBlock = [
    `${doc.kind} #: ${doc.number}`,
    `Issued: ${doc.issueDate}`,
    doc.kind === "Invoice" && doc.dueDate ? `Due: ${doc.dueDate}` : null,
    doc.kind === "Quote" && doc.validUntil ? `Valid until: ${doc.validUntil}` : null,
    `Currency: ${doc.currency}`,
  ].filter(Boolean) as string[];
  rightBlock.forEach((line, i) => pdf.text(line, pageW - margin, y + 40 + i * 13, { align: "right" }));

  y += Math.max(compLines.length * 12, rightBlock.length * 13) + 50;

  // Bill To
  pdf.setDrawColor(230);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, pageW - margin * 2, 70, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  pdf.text("BILL TO", margin + 10, y + 16);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(20);
  pdf.text(doc.customer?.name ?? "—", margin + 10, y + 32);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80);
  const custLines = [
    doc.customer?.address,
    doc.customer?.email,
    doc.customer?.phone,
    (doc.buyerTpin || doc.customer?.tpin) ? `TPIN: ${doc.buyerTpin || doc.customer?.tpin}` : null,
  ].filter(Boolean) as string[];
  custLines.forEach((line, i) => pdf.text(line, margin + 10, y + 46 + i * 11));
  y += 90;

  // Line items
  const cur = doc.currency;
  autoTable(pdf, {
    startY: y,
    head: [["#", "Description", "Qty", "Unit Price", "Discount", "VAT %", "Amount"]],
    body: doc.items.map((it, i) => [
      String(i + 1),
      it.description,
      String(it.qty),
      fmtMoney(it.price, cur),
      it.discount ? `${it.discount}${it.discountType === "%" ? "%" : ` ${cur}`}` : "—",
      `${it.vatRate}%`,
      fmtMoney(it.lineTotal, cur),
    ]),
    styles: { fontSize: 9, cellPadding: 6, textColor: 40 },
    headStyles: { fillColor: BRAND, textColor: 255, halign: "left", fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 70 },
      4: { halign: "right", cellWidth: 60 },
      5: { halign: "right", cellWidth: 45 },
      6: { halign: "right", cellWidth: 80, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = pdf.lastAutoTable.finalY + 20;

  // Totals block right-aligned
  const totalsX = pageW - margin - 220;
  const totalsW = 220;
  const row = (label: string, val: string, bold = false, fill = false) => {
    if (fill) {
      pdf.setFillColor(BRAND);
      pdf.rect(totalsX, y - 10, totalsW, 22, "F");
      pdf.setTextColor(255);
    } else {
      pdf.setTextColor(50);
    }
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 11 : 10);
    pdf.text(label, totalsX + 10, y + 4);
    pdf.text(val, totalsX + totalsW - 10, y + 4, { align: "right" });
    y += 20;
  };
  row("Subtotal", fmtMoney(doc.subtotal, cur));
  row(`Tax ${doc.taxInclusive ? "(inclusive)" : "(exclusive)"}`, fmtMoney(doc.tax, cur));
  y += 4;
  row("TOTAL", fmtMoney(doc.total, cur), true, true);
  pdf.setTextColor(40);
  y += 10;

  // Bank details for invoices
  if (doc.kind === "Invoice" && doc.company?.bank_name) {
    pdf.setDrawColor(220);
    pdf.rect(margin, y, pageW - margin * 2, 50);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text("BANK DETAILS", margin + 10, y + 15);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(50);
    pdf.text(`Bank: ${doc.company.bank_name}`, margin + 10, y + 30);
    pdf.text(`Account: ${doc.company.bank_account_number ?? "—"}`, margin + 10, y + 42);
    pdf.text(`Name: ${doc.company.name ?? "—"}`, margin + 250, y + 30);
    y += 60;
  }

  // Notes
  if (doc.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text("NOTES", margin, y + 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    const wrapped = pdf.splitTextToSize(doc.notes, pageW - margin * 2);
    pdf.text(wrapped, margin, y + 26);
    y += 26 + wrapped.length * 11;
  }

  // Fiscal reference + QR (compact, uses live posted values)
  const pageH = pdf.internal.pageSize.getHeight();
  const fiscalY = Math.max(y + 10, pageH - 170);
  const sellerTpin = doc.company?.tpin ?? "";
  const buyerTpin = doc.buyerTpin || doc.customer?.tpin || "";
  const fiscalRef = `SIFO/${doc.kind.charAt(0)}/${doc.number}/${doc.issueDate}/${sellerTpin || "NA"}`;
  const qrPayload = [
    `TYPE:${doc.kind}`,
    `NO:${doc.number}`,
    `DATE:${doc.issueDate}`,
    `SELLER_TPIN:${sellerTpin || "NA"}`,
    `BUYER_TPIN:${buyerTpin || "NA"}`,
    `NET:${doc.subtotal.toFixed(2)}`,
    `VAT:${doc.tax.toFixed(2)}`,
    `TOTAL:${doc.total.toFixed(2)}`,
    `CUR:${doc.currency}`,
    `REF:${fiscalRef}`,
  ].join("|");

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 240, errorCorrectionLevel: "M" });
  } catch {
    qrDataUrl = null;
  }

  pdf.setDrawColor(220);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, fiscalY, pageW - margin * 2, 110, "FD");

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", margin + 10, fiscalY + 10, 90, 90);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND);
  pdf.text("FISCAL / TAX COMPLIANCE REFERENCE", margin + 110, fiscalY + 18);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(40);
  const kvs: [string, string][] = [
    ["Document Reference", fiscalRef],
    ["Seller TPIN", sellerTpin || "—"],
    ["Buyer TPIN", buyerTpin || "—"],
    ["Net (excl. VAT)", fmtMoney(doc.subtotal, doc.currency)],
    ["VAT Amount", fmtMoney(doc.tax, doc.currency)],
    ["Gross Total", fmtMoney(doc.total, doc.currency)],
  ];
  kvs.forEach(([k, v], i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const cx = margin + 110 + col * 200;
    const cy = fiscalY + 34 + row * 14;
    pdf.setTextColor(120);
    pdf.text(k + ":", cx, cy);
    pdf.setTextColor(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(v, cx + 80, cy);
    pdf.setFont("helvetica", "normal");
  });

  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text("Scan QR to verify against SifoBooks fiscal ledger.", margin + 110, fiscalY + 100);

  // Footer
  pdf.setDrawColor(230);
  pdf.line(margin, pageH - 30, pageW - margin, pageH - 30);
  pdf.setFontSize(8);
  pdf.setTextColor(140);
  pdf.text("Generated by SifoBooks Accounting ERP · ZMW · ZRA Ready", pageW / 2, pageH - 18, { align: "center" });

  return pdf;
}

export async function previewPdf(doc: PdfDoc) {
  const pdf = await buildDocPdf(doc);
  const url = pdf.output("bloburl");
  window.open(url as unknown as string, "_blank", "noopener");
}

export async function downloadPdf(doc: PdfDoc) {
  const pdf = await buildDocPdf(doc);
  pdf.save(`${doc.kind}-${doc.number}.pdf`);
}
