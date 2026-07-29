import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney } from "@/lib/format";
import { amountInWords } from "@/lib/number-to-words";
import type { EarningLine, DeductionLine } from "@/lib/payroll";

export type PayslipPdfInput = {
  company?: {
    name?: string | null; address?: string | null; city?: string | null;
    country?: string | null; phone?: string | null; email?: string | null;
    logo_url?: string | null; tpin?: string | null;
    payslip_header?: string | null; payslip_footer?: string | null;
  } | null;
  employee: {
    name: string; title?: string | null; employee_code?: string | null;
    napsa_number?: string | null; national_id?: string | null; tpin?: string | null;
    bank_name?: string | null; bank_account?: string | null;
    department?: string | null; hire_date?: string | null;
  };
  period: { monthName: string; year: number; payDate?: string | null };
  earnings: EarningLine[];
  deductions: DeductionLine[];
  gross: number;
  taxable: number;
  net: number;
  ytd: { taxable: number; paye: number; napsa: number };
  loan_balance?: number;
  leave_balance?: number;
  employer_oncost?: number;
  notes?: string | null;
  currency?: string;
};

// Modern emerald brand palette
const BRAND = { primary: "#059669", dark: "#064e3b", accent: "#10b981", slate: "#0f172a", muted: "#64748b", line: "#e2e8f0", soft: "#ecfdf5" };

async function toDataUrl(url: string): Promise<string | null> {
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

export async function buildPayslipPdf(i: PayslipPdfInput): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const currency = i.currency ?? "ZMW";
  const money = (n: number) => `${currency} ${fmtMoney(n)}`;

  // ----- Header band (emerald with dark accent stripe) -----
  pdf.setFillColor(BRAND.dark); pdf.rect(0, 0, W, 90, "F");
  pdf.setFillColor(BRAND.primary); pdf.rect(0, 82, W, 8, "F");

  // Logo (optional)
  let logoDrawn = false;
  if (i.company?.logo_url) {
    const dataUrl = await toDataUrl(i.company.logo_url);
    if (dataUrl) {
      try {
        const fmt = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        pdf.addImage(dataUrl, fmt as any, 32, 18, 54, 54, undefined, "FAST");
        logoDrawn = true;
      } catch { /* ignore */ }
    }
  }

  const textX = logoDrawn ? 100 : 32;
  pdf.setTextColor("#ffffff"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
  pdf.text((i.company?.name || "Company").toUpperCase(), textX, 38);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor("#d1fae5");
  const addr = [i.company?.address, [i.company?.city, i.company?.country].filter(Boolean).join(", "), i.company?.phone, i.company?.email, i.company?.tpin ? `TPIN ${i.company.tpin}` : null].filter(Boolean) as string[];
  pdf.text(addr.join("  ·  "), textX, 54, { maxWidth: W - textX - 200 });

  // Right side title
  pdf.setTextColor("#ffffff"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
  pdf.text("PAYSLIP", W - 32, 34, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#a7f3d0");
  pdf.text(`${i.period.monthName} ${i.period.year}`, W - 32, 50, { align: "right" });
  if (i.period.payDate) pdf.text(`Pay Date: ${i.period.payDate}`, W - 32, 64, { align: "right" });

  // ----- Employee card -----
  let y = 108;
  pdf.setFillColor(BRAND.soft); pdf.roundedRect(32, y, W - 64, 78, 6, 6, "F");
  pdf.setTextColor(BRAND.slate); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
  pdf.text(i.employee.name, 44, y + 20);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(BRAND.muted);
  if (i.employee.title) pdf.text(i.employee.title, 44, y + 34);

  const rows: [string, string][] = [
    ["Employee #", i.employee.employee_code ?? "—"],
    ["Department", i.employee.department ?? "—"],
    ["NRC", i.employee.national_id ?? "—"],
    ["TPIN", i.employee.tpin ?? "—"],
    ["NAPSA", i.employee.napsa_number ?? "—"],
    ["Hire Date", i.employee.hire_date ?? "—"],
    ["Bank", [i.employee.bank_name, i.employee.bank_account].filter(Boolean).join(" ") || "—"],
    ["Currency", currency],
  ];
  const colW = (W - 64 - 24) / 4;
  rows.forEach((r, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = 44 + col * colW;
    const yy = y + 48 + row * 14;
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(BRAND.muted); pdf.setFontSize(7.5);
    pdf.text(r[0].toUpperCase(), x, yy);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(BRAND.slate); pdf.setFontSize(9);
    pdf.text(String(r[1]).slice(0, 24), x, yy + 10);
  });
  y += 92;

  // ----- Earnings & Deductions side-by-side -----
  const halfW = (W - 64 - 12) / 2;
  autoTable(pdf, {
    startY: y,
    head: [["Earnings", "Amount"]],
    body: i.earnings.map(e => [e.label + (e.taxable === false ? "  (non-tax)" : ""), money(e.amount)]),
    foot: [[{ content: "Gross Pay", styles: { halign: "left", fontStyle: "bold", fillColor: BRAND.soft, textColor: BRAND.dark } },
             { content: money(i.gross), styles: { halign: "right", fontStyle: "bold", fillColor: BRAND.soft, textColor: BRAND.dark } }]],
    tableWidth: halfW,
    margin: { left: 32 },
    styles: { fontSize: 9, cellPadding: 5, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: BRAND.primary, textColor: "#ffffff", fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 90 } },
    alternateRowStyles: { fillColor: "#f8fafc" },
  });
  const eEnd = (pdf as any).lastAutoTable.finalY;

  autoTable(pdf, {
    startY: y,
    head: [["Deductions", "Amount"]],
    body: i.deductions.map(d => [d.label, money(d.amount)]),
    foot: [[{ content: "Total Deductions", styles: { halign: "left", fontStyle: "bold", fillColor: "#fef2f2", textColor: "#7f1d1d" } },
             { content: money(i.gross - i.net), styles: { halign: "right", fontStyle: "bold", fillColor: "#fef2f2", textColor: "#7f1d1d" } }]],
    tableWidth: halfW,
    margin: { left: 32 + halfW + 12 },
    styles: { fontSize: 9, cellPadding: 5, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: "#334155", textColor: "#ffffff", fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 90 } },
    alternateRowStyles: { fillColor: "#f8fafc" },
  });
  const dEnd = (pdf as any).lastAutoTable.finalY;
  y = Math.max(eEnd, dEnd) + 16;

  // ----- YTD strip -----
  pdf.setFillColor("#f1f5f9"); pdf.roundedRect(32, y, W - 64, 46, 4, 4, "F");
  const ytd = [
    ["TAXABLE YTD", money(i.ytd.taxable)],
    ["PAYE YTD", money(i.ytd.paye)],
    ["NAPSA YTD", money(i.ytd.napsa)],
    ["LOAN BAL.", money(i.loan_balance ?? 0)],
    ["LEAVE BAL.", `${(i.leave_balance ?? 0).toFixed(1)} days`],
  ];
  const stripCol = (W - 64) / ytd.length;
  ytd.forEach(([k, v], idx) => {
    const x = 32 + idx * stripCol + 10;
    pdf.setTextColor(BRAND.muted); pdf.setFontSize(7); pdf.setFont("helvetica", "bold");
    pdf.text(k, x, y + 16);
    pdf.setTextColor(BRAND.slate); pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text(v, x, y + 34);
  });
  y += 60;

  // ----- Net Pay hero -----
  pdf.setFillColor(BRAND.dark); pdf.roundedRect(32, y, W - 64, 66, 6, 6, "F");
  pdf.setFillColor(BRAND.primary); pdf.roundedRect(W - 32 - 240, y + 8, 232, 50, 4, 4, "F");
  pdf.setTextColor("#d1fae5"); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text("GROSS PAY", 48, y + 24);
  pdf.text("TAXABLE PAY", 48, y + 42);
  pdf.setTextColor("#ffffff"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
  pdf.text(money(i.gross), 150, y + 24);
  pdf.text(money(i.taxable), 150, y + 42);
  pdf.setTextColor("#d1fae5"); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text("NET PAY", W - 250, y + 26);
  pdf.setTextColor("#ffffff"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(20);
  pdf.text(money(i.net), W - 44, y + 46, { align: "right" });
  y += 78;

  // ----- Amount in words -----
  const words = amountInWords(i.net, currency === "ZMW" ? "Kwacha" : currency, "Ngwee");
  pdf.setFillColor("#fffbeb"); pdf.setDrawColor("#fde68a"); pdf.roundedRect(32, y, W - 64, 26, 4, 4, "FD");
  pdf.setTextColor("#78350f"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text("AMOUNT IN WORDS", 42, y + 11);
  pdf.setFont("helvetica", "italic"); pdf.setFontSize(9); pdf.setTextColor(BRAND.slate);
  pdf.text(words, 42, y + 22, { maxWidth: W - 84 });
  y += 40;

  if (i.notes) {
    pdf.setTextColor(BRAND.muted); pdf.setFont("helvetica", "italic"); pdf.setFontSize(8.5);
    pdf.text(i.notes, 32, y, { maxWidth: W - 64 });
    y += 18;
  }

  // ----- Signatures -----
  pdf.setDrawColor("#cbd5e1"); pdf.setLineWidth(0.5);
  pdf.line(32, y + 40, 220, y + 40);
  pdf.line(W - 220, y + 40, W - 32, y + 40);
  pdf.setFontSize(8); pdf.setTextColor(BRAND.muted); pdf.setFont("helvetica", "normal");
  pdf.text("Employee signature", 32, y + 54);
  pdf.text("Authorised by / Company stamp", W - 32, y + 54, { align: "right" });

  // ----- Footer -----
  pdf.setDrawColor(BRAND.line); pdf.line(32, H - 32, W - 32, H - 32);
  pdf.setFontSize(7); pdf.setTextColor(BRAND.muted); pdf.setFont("helvetica", "normal");
  pdf.text(`Generated by SifoBooks · ${new Date().toLocaleString()}`, 32, H - 20);
  pdf.text("This is a computer generated payslip — no signature required unless stamped.", W - 32, H - 20, { align: "right" });

  return pdf;
}

export async function downloadPayslipPdf(i: PayslipPdfInput, filename: string) {
  const pdf = await buildPayslipPdf(i);
  pdf.save(filename);
}
