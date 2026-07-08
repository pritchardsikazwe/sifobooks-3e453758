import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND = "#0f4c5c";
const fmt = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type StatementLine = {
  date: string;
  ref: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

async function fetchCompany() {
  const { data } = await supabase
    .from("companies")
    .select("name, address, tpin, email, phone")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function generateStatementPdf(opts: {
  kind: "customer" | "supplier";
  partyName: string;
  partyMeta?: { email?: string | null; phone?: string | null; tpin?: string | null; address?: string | null };
  from: string;
  to: string;
  openingBalance: number;
  lines: StatementLine[];
}) {
  const company = await fetchCompany();
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(BRAND);
  pdf.rect(0, 0, pageW, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(20);
  pdf.text(company?.name ?? "SifoBooks", 40, 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  const compLines = [company?.address, company?.tpin ? `TPIN: ${company.tpin}` : null, company?.email, company?.phone].filter(Boolean) as string[];
  compLines.forEach((l, i) => pdf.text(l, 40, 56 + i * 11));

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(BRAND);
  pdf.text(opts.kind === "customer" ? "Customer Statement" : "Supplier Statement", pageW - 40, 40, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60);
  pdf.text(`Period: ${opts.from} → ${opts.to}`, pageW - 40, 56, { align: "right" });

  const partyStart = 100 + compLines.length * 4;
  pdf.setDrawColor(220);
  pdf.roundedRect(40, partyStart, pageW - 80, 60, 4, 4, "S");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(20);
  pdf.text(opts.kind === "customer" ? "Bill To" : "Supplier", 50, partyStart + 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(opts.partyName, 50, partyStart + 34);
  const meta = [opts.partyMeta?.address, opts.partyMeta?.email, opts.partyMeta?.phone, opts.partyMeta?.tpin ? `TPIN: ${opts.partyMeta.tpin}` : null]
    .filter(Boolean).join("  ·  ");
  if (meta) pdf.text(meta, 50, partyStart + 48);

  const closingBalance = opts.lines.length ? opts.lines[opts.lines.length - 1].balance : opts.openingBalance;

  autoTable(pdf, {
    startY: partyStart + 76,
    head: [["Date", "Ref", "Description", "Debit", "Credit", "Balance"]],
    body: [
      [{ content: "Opening balance", colSpan: 5, styles: { fontStyle: "bold" } }, { content: fmt(opts.openingBalance), styles: { fontStyle: "bold", halign: "right" } }],
      ...opts.lines.map(l => [l.date, l.ref, l.description, l.debit ? fmt(l.debit) : "", l.credit ? fmt(l.credit) : "", fmt(l.balance)]),
      [{ content: "Closing balance", colSpan: 5, styles: { fontStyle: "bold", fillColor: [15, 76, 92], textColor: 255 } },
       { content: fmt(closingBalance), styles: { fontStyle: "bold", halign: "right", fillColor: [15, 76, 92], textColor: 255 } }],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: BRAND, textColor: 255 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(230); pdf.line(40, pageH - 30, pageW - 40, pageH - 30);
  pdf.setFontSize(8); pdf.setTextColor(140);
  pdf.text(`Generated ${new Date().toLocaleString()} · SifoBooks`, pageW / 2, pageH - 18, { align: "center" });

  const safe = opts.partyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  pdf.save(`${opts.kind}-statement-${safe}-${opts.from}_to_${opts.to}.pdf`);
}
