import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND = "#0f4c5c";
const fmt = (n: number) =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function fetchCompany() {
  const { data } = await supabase.from("companies")
    .select("name, address, tpin, email, phone").limit(1).maybeSingle();
  return data;
}

function header(pdf: jsPDF, title: string, subtitle: string, company: any) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(BRAND);
  pdf.rect(0, 0, pageW, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(20);
  pdf.text(company?.name ?? "SifoBooks", 40, 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  const meta = [company?.address, company?.tpin ? `TPIN: ${company.tpin}` : null, company?.phone, company?.email]
    .filter(Boolean) as string[];
  meta.forEach((l, i) => pdf.text(l, 40, 56 + i * 11));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(BRAND);
  pdf.text(title, pageW - 40, 40, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60);
  pdf.text(subtitle, pageW - 40, 56, { align: "right" });
  return 40 + Math.max(meta.length * 11, 30) + 30;
}

function footer(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(230);
  pdf.line(40, pageH - 30, pageW - 40, pageH - 30);
  pdf.setFontSize(8);
  pdf.setTextColor(140);
  pdf.text(`Generated ${new Date().toLocaleString()} · SifoBooks Payroll`, pageW / 2, pageH - 18, { align: "center" });
}

export type ScheduleRow = Record<string, any>;

export async function exportSchedulePdf(opts: {
  title: string;
  subtitle: string;
  head: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
  filename: string;
  landscape?: boolean;
  rightAlignCols?: number[];
}) {
  const company = await fetchCompany();
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: opts.landscape ? "landscape" : "portrait" });
  const y = header(pdf, opts.title, opts.subtitle, company);
  const columnStyles: any = {};
  (opts.rightAlignCols ?? []).forEach((c) => (columnStyles[c] = { halign: "right" }));
  const body: any[] = opts.rows.map((r) => r);
  if (opts.totalsRow) {
    body.push(
      opts.totalsRow.map((cell, i) => ({
        content: cell,
        styles: { fontStyle: "bold", fillColor: [237, 244, 246], halign: (opts.rightAlignCols ?? []).includes(i) ? "right" : "left" },
      })),
    );
  }
  autoTable(pdf, {
    startY: y,
    head: [opts.head],
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
    columnStyles,
    margin: { left: 30, right: 30 },
  });
  footer(pdf);
  pdf.save(`${opts.filename}.pdf`);
}
