import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney } from "@/lib/format";
import type { EarningLine, DeductionLine } from "@/lib/payroll";

export type PayslipPdfInput = {
  company?: {
    name?: string | null; address?: string | null; city?: string | null;
    country?: string | null; phone?: string | null; email?: string | null;
    logo_url?: string | null;
  } | null;
  employee: {
    name: string; title?: string | null; employee_code?: string | null;
    napsa_number?: string | null; national_id?: string | null;
    bank_name?: string | null; bank_account?: string | null;
  };
  period: { monthName: string; year: number; payDate?: string | null };
  earnings: EarningLine[];
  deductions: DeductionLine[];
  gross: number;
  taxable: number;
  net: number;
  ytd: { taxable: number; paye: number; napsa: number };
  loan_balance?: number;
  notes?: string | null;
  currency?: string;
};

const BRAND = "#0f4c5c";

export function buildPayslipPdf(i: PayslipPdfInput) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const currency = i.currency ?? "ZMW";
  const money = (n: number) => `${currency} ${fmtMoney(n)}`;

  // Header
  pdf.setFillColor(BRAND); pdf.rect(0, 0, W, 74, "F");
  pdf.setTextColor("#fff"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
  pdf.text((i.company?.name || "Company").toUpperCase(), 40, 32);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  const addrLines = [i.company?.address, [i.company?.city, i.company?.country].filter(Boolean).join(", "), i.company?.phone, i.company?.email].filter(Boolean) as string[];
  pdf.text(addrLines.join(" · "), 40, 48, { maxWidth: W - 240 });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
  pdf.text("PAY STATEMENT", W - 40, 32, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  pdf.text(`${i.period.monthName} ${i.period.year}`, W - 40, 50, { align: "right" });

  // Employee block
  let y = 96;
  pdf.setTextColor("#0f172a"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
  pdf.text(i.employee.name, 40, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#475569");
  y += 14;
  const meta: [string, string | null | undefined][] = [
    ["Title", i.employee.title],
    ["Man No.", i.employee.employee_code],
    ["NRC No.", i.employee.national_id],
    ["Social Sec. No.", i.employee.napsa_number],
    ["Bank", [i.employee.bank_name, i.employee.bank_account].filter(Boolean).join(" ")],
    ["Pay Date", i.period.payDate ?? ""],
  ];
  const left = meta.slice(0, 3), right = meta.slice(3);
  const drawCol = (rows: [string, string | null | undefined][], x: number) => {
    let yy = y;
    for (const [k, v] of rows) {
      pdf.setTextColor("#64748b"); pdf.text(`${k}:`, x, yy);
      pdf.setTextColor("#0f172a"); pdf.text(String(v ?? "—"), x + 78, yy);
      yy += 13;
    }
  };
  drawCol(left, 40); drawCol(right, W / 2);
  y += 13 * 3 + 8;

  // YTD strip
  pdf.setFillColor("#f1f5f9"); pdf.rect(40, y, W - 80, 26, "F");
  pdf.setTextColor("#0f172a"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  const ytd = [
    ["TAXABLE PAY YTD", money(i.ytd.taxable)],
    ["PAYE YTD", money(i.ytd.paye)],
    ["NAPSA YTD", money(i.ytd.napsa)],
    ["LOAN BALANCE", money(i.loan_balance ?? 0)],
  ];
  const colW = (W - 80) / ytd.length;
  ytd.forEach(([k, v], idx) => {
    const x = 40 + idx * colW + 10;
    pdf.setTextColor("#64748b"); pdf.setFontSize(7.5); pdf.text(k, x, y + 10);
    pdf.setTextColor("#0f172a"); pdf.setFontSize(10); pdf.text(v, x, y + 22);
  });
  y += 38;

  // Earnings / Deductions two tables side by side
  const halfW = (W - 80 - 12) / 2;
  autoTable(pdf, {
    startY: y,
    head: [["#", "Earning", "Amount"]],
    body: i.earnings.map((e, idx) => [String(idx + 1), e.label, money(e.amount)]),
    foot: [[{ content: "Gross", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } }, { content: money(i.gross), styles: { fontStyle: "bold" } }]],
    tableWidth: halfW,
    margin: { left: 40 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: BRAND, textColor: "#fff" },
    columnStyles: { 0: { cellWidth: 22 }, 2: { halign: "right", cellWidth: 80 } },
  });
  const earningsEndY = (pdf as any).lastAutoTable.finalY;
  autoTable(pdf, {
    startY: y,
    head: [["#", "Deduction", "Amount"]],
    body: i.deductions.map((d, idx) => [String(idx + 1), d.label, money(d.amount)]),
    foot: [[{ content: "Total Deductions", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } }, { content: money(i.gross - i.net), styles: { fontStyle: "bold" } }]],
    tableWidth: halfW,
    margin: { left: 40 + halfW + 12 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: "#334155", textColor: "#fff" },
    columnStyles: { 0: { cellWidth: 22 }, 2: { halign: "right", cellWidth: 80 } },
  });
  const dedEndY = (pdf as any).lastAutoTable.finalY;
  y = Math.max(earningsEndY, dedEndY) + 16;

  // Summary box
  pdf.setDrawColor("#e2e8f0"); pdf.setLineWidth(0.5);
  pdf.rect(40, y, W - 80, 60);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#64748b");
  pdf.text("Gross Pay", 56, y + 18);
  pdf.text("Taxable Pay", 56, y + 34);
  pdf.text("Total Deductions", 56, y + 50);
  pdf.setTextColor("#0f172a"); pdf.setFont("helvetica", "bold");
  pdf.text(money(i.gross), 220, y + 18);
  pdf.text(money(i.taxable), 220, y + 34);
  pdf.text(money(i.gross - i.net), 220, y + 50);

  pdf.setFillColor(BRAND); pdf.rect(W - 220, y + 8, 180, 44, "F");
  pdf.setTextColor("#fff"); pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  pdf.text("NET PAY", W - 210, y + 24);
  pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
  pdf.text(money(i.net), W - 30, y + 42, { align: "right" });
  y += 76;

  if (i.notes) {
    pdf.setTextColor("#475569"); pdf.setFont("helvetica", "italic"); pdf.setFontSize(9);
    pdf.text(i.notes, 40, y, { maxWidth: W - 80 });
    y += 18;
  }

  // Signatures
  pdf.setDrawColor("#94a3b8"); pdf.setLineWidth(0.5);
  pdf.line(40, y + 30, 220, y + 30);
  pdf.line(W - 220, y + 30, W - 40, y + 30);
  pdf.setFontSize(8); pdf.setTextColor("#64748b"); pdf.setFont("helvetica", "normal");
  pdf.text("Employee signature", 40, y + 44);
  pdf.text("Authorised by / Company stamp", W - 40, y + 44, { align: "right" });

  return pdf;
}

export function downloadPayslipPdf(i: PayslipPdfInput, filename: string) {
  const pdf = buildPayslipPdf(i);
  pdf.save(filename);
}
