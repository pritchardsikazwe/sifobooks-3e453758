import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND = { dark: "#064e3b", primary: "#059669", accent: "#c9a84c", ivory: "#f5f0e0", line: "#e2e8f0", slate: "#0f172a", muted: "#64748b" };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type StatementLine = {
  date: string; ref: string; description: string;
  debit: number; credit: number; balance: number;
};

async function fetchCompany() {
  const { data } = await supabase
    .from("companies")
    .select("name, address, tpin, email, phone, logo_url")
    .limit(1)
    .maybeSingle();
  return data;
}

async function resolveLogo(path?: string | null): Promise<string | null> {
  if (!path) return null;
  let url = path;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) {
    const { data } = await supabase.storage.from("company-logos").createSignedUrl(url, 300);
    if (!data?.signedUrl) return null;
    url = data.signedUrl;
  }
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((r, j) => { const fr = new FileReader(); fr.onloadend = () => r(String(fr.result)); fr.onerror = j; fr.readAsDataURL(blob); });
  } catch { return null; }
}

function computeAging(lines: StatementLine[], asOf: string): { current: number; d30: number; d60: number; d90: number; d90plus: number } {
  const bucket = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  const asOfMs = new Date(asOf).getTime();
  // Debits are outstanding charges; credits reduce (matched FIFO against oldest debits).
  const debits: { date: string; amt: number }[] = [];
  let creditPool = 0;
  for (const l of lines) {
    if (l.debit) debits.push({ date: l.date, amt: l.debit });
    creditPool += l.credit || 0;
  }
  for (const d of debits) {
    if (creditPool >= d.amt) { creditPool -= d.amt; continue; }
    const remaining = d.amt - creditPool; creditPool = 0;
    const age = Math.floor((asOfMs - new Date(d.date).getTime()) / (86400000));
    if (age <= 0)  bucket.current += remaining;
    else if (age <= 30) bucket.d30 += remaining;
    else if (age <= 60) bucket.d60 += remaining;
    else if (age <= 90) bucket.d90 += remaining;
    else bucket.d90plus += remaining;
  }
  return bucket;
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
  const logo = await resolveLogo(company?.logo_url);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;

  // Emerald header band
  pdf.setFillColor(BRAND.dark); pdf.rect(0, 0, pageW, 108, "F");
  pdf.setFillColor(BRAND.primary); pdf.rect(0, 100, pageW, 8, "F");
  pdf.setFillColor(BRAND.accent); pdf.rect(0, 108, pageW, 2, "F");

  let tx = margin;
  if (logo) {
    try {
      const f = logo.startsWith("data:image/png") ? "PNG" : "JPEG";
      pdf.addImage(logo, f as any, margin, 22, 62, 62, undefined, "FAST");
      tx = margin + 76;
    } catch {}
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
  pdf.text((company?.name ?? "SifoBooks").toUpperCase(), tx, 40);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
  pdf.setTextColor(220, 234, 224);
  const cl = [company?.address, [company?.email, company?.phone].filter(Boolean).join("  ·  "), company?.tpin ? `TPIN: ${company.tpin}` : null].filter(Boolean) as string[];
  cl.forEach((l, i) => pdf.text(l, tx, 56 + i * 12));

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(BRAND.ivory);
  pdf.text(opts.kind === "customer" ? "STATEMENT OF ACCOUNT" : "SUPPLIER STATEMENT", pageW - margin, 44, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.setTextColor(220, 234, 224);
  pdf.text(`Period: ${opts.from} → ${opts.to}`, pageW - margin, 62, { align: "right" });
  pdf.text(`Statement Date: ${new Date().toISOString().slice(0, 10)}`, pageW - margin, 76, { align: "right" });

  // Party card
  let y = 130;
  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(BRAND.line);
  pdf.roundedRect(margin, y, pageW - margin * 2, 74, 4, 4, "FD");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(BRAND.dark);
  pdf.text(opts.kind === "customer" ? "STATEMENT TO" : "SUPPLIER", margin + 12, y + 16);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(BRAND.slate);
  pdf.text(opts.partyName, margin + 12, y + 32);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(80);
  const meta = [opts.partyMeta?.address, [opts.partyMeta?.email, opts.partyMeta?.phone].filter(Boolean).join("  ·  "), opts.partyMeta?.tpin ? `TPIN: ${opts.partyMeta.tpin}` : null]
    .filter(Boolean) as string[];
  meta.forEach((l, i) => pdf.text(l, margin + 12, y + 48 + i * 11));
  y += 90;

  const closingBalance = opts.lines.length ? opts.lines[opts.lines.length - 1].balance : opts.openingBalance;

  autoTable(pdf, {
    startY: y,
    head: [["Date", "Ref", "Description", "Debit", "Credit", "Balance"]],
    body: [
      [{ content: "Opening balance", colSpan: 5, styles: { fontStyle: "bold", fillColor: [245, 240, 224] } },
       { content: fmt(opts.openingBalance), styles: { fontStyle: "bold", halign: "right", fillColor: [245, 240, 224] } }],
      ...opts.lines.map(l => [l.date, l.ref, l.description, l.debit ? fmt(l.debit) : "", l.credit ? fmt(l.credit) : "", fmt(l.balance)]),
      [{ content: "Closing balance", colSpan: 5, styles: { fontStyle: "bold", fillColor: [6, 78, 59], textColor: 255 } },
       { content: fmt(closingBalance), styles: { fontStyle: "bold", halign: "right", fillColor: [6, 78, 59], textColor: 255 } }],
    ],
    styles: { fontSize: 9, cellPadding: 5, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  // @ts-expect-error autotable
  y = pdf.lastAutoTable.finalY + 14;

  // ----- Aging summary (customer only) -----
  if (opts.kind === "customer") {
    const aging = computeAging(opts.lines, opts.to);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(BRAND.line);
    pdf.roundedRect(margin, y, pageW - margin * 2, 66, 4, 4, "FD");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(BRAND.dark);
    pdf.text("AGEING SUMMARY (OUTSTANDING)", margin + 12, y + 14);
    const cols: [string, number][] = [
      ["Current", aging.current], ["1-30 days", aging.d30], ["31-60 days", aging.d60],
      ["61-90 days", aging.d90], ["90+ days", aging.d90plus],
      ["Total outstanding", aging.current + aging.d30 + aging.d60 + aging.d90 + aging.d90plus],
    ];
    const cw = (pageW - margin * 2 - 24) / cols.length;
    cols.forEach(([k, v], i) => {
      const cx = margin + 12 + i * cw;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(BRAND.muted);
      pdf.text(k.toUpperCase(), cx, y + 30);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
      pdf.setTextColor(i === cols.length - 1 ? BRAND.dark : BRAND.slate);
      pdf.text(fmt(v), cx, y + 50);
    });
    y += 78;
  }

  // Footer
  pdf.setDrawColor(BRAND.line);
  pdf.line(margin, pageH - 30, pageW - margin, pageH - 30);
  pdf.setFontSize(7.5); pdf.setTextColor(BRAND.muted);
  pdf.text(`Generated ${new Date().toLocaleString()} · SifoBooks Accounting ERP · ZMW`, pageW / 2, pageH - 18, { align: "center" });

  const safe = opts.partyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  pdf.save(`${opts.kind}-statement-${safe}-${opts.from}_to_${opts.to}.pdf`);
}
