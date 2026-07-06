import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND = "#0f4c5c";
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Line = {
  debit: number | string | null;
  credit: number | string | null;
  account: { account_code: string; account_name: string; account_type: string } | null;
};

const num = (v: any) => Number(v ?? 0) || 0;

async function fetchLines(from?: string, to?: string) {
  let q = supabase.from("journal_entries").select("id, entry_date").eq("status", "posted");
  if (from) q = q.gte("entry_date", from);
  if (to) q = q.lte("entry_date", to);
  const { data: entries } = await q;
  const ids = (entries ?? []).map((e: any) => e.id);
  if (!ids.length) return [] as Line[];
  const { data } = await supabase.from("journal_lines")
    .select("debit,credit,account:account_id(account_code,account_name,account_type)")
    .in("entry_id", ids);
  return (data ?? []) as Line[];
}

async function fetchCompany() {
  const { data } = await supabase.from("companies").select("name, address, tpin, email, phone").limit(1).maybeSingle();
  return data;
}

function addHeader(pdf: jsPDF, title: string, subtitle: string, company: any) {
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
  pdf.text(title, pageW - 40, 40, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60);
  pdf.text(subtitle, pageW - 40, 56, { align: "right" });
  return 40 + Math.max(compLines.length * 11, 30) + 40;
}

function addFooter(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(230);
  pdf.line(40, pageH - 30, pageW - 40, pageH - 30);
  pdf.setFontSize(8);
  pdf.setTextColor(140);
  pdf.text(`Generated ${new Date().toLocaleString()} · SifoBooks`, pageW / 2, pageH - 18, { align: "center" });
}

function drawPnL(pdf: jsPDF, lines: Line[], company: any, from: string, to: string) {
  const y = addHeader(pdf, "Profit & Loss", `Period: ${from} → ${to}`, company);
  const byAcc = new Map<string, any>();
  lines.forEach(l => {
    const a = l.account; if (!a) return;
    const k = a.account_code + a.account_name;
    const cur = byAcc.get(k) ?? { code: a.account_code, name: a.account_name, type: a.account_type, amount: 0 };
    if (a.account_type === "revenue") cur.amount += num(l.credit) - num(l.debit);
    else if (a.account_type === "expense") cur.amount += num(l.debit) - num(l.credit);
    byAcc.set(k, cur);
  });
  const rows = Array.from(byAcc.values()).filter(r => r.type === "revenue" || r.type === "expense");
  const revenue = rows.filter(r => r.type === "revenue").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const net = revenue - expense;

  autoTable(pdf, {
    startY: y,
    head: [["Code", "Account", "Type", "Amount"]],
    body: [
      ...rows.filter(r => r.type === "revenue").map(r => [r.code, r.name, "Revenue", fmt(r.amount)]),
      [{ content: "Total Revenue", colSpan: 3, styles: { fontStyle: "bold" } }, { content: fmt(revenue), styles: { fontStyle: "bold", halign: "right" } }],
      ...rows.filter(r => r.type === "expense").map(r => [r.code, r.name, "Expense", fmt(r.amount)]),
      [{ content: "Total Expenses", colSpan: 3, styles: { fontStyle: "bold" } }, { content: fmt(expense), styles: { fontStyle: "bold", halign: "right" } }],
      [{ content: net >= 0 ? "Net Profit" : "Net Loss", colSpan: 3, styles: { fontStyle: "bold", fillColor: [15, 76, 92], textColor: 255 } },
       { content: fmt(Math.abs(net)), styles: { fontStyle: "bold", halign: "right", fillColor: [15, 76, 92], textColor: 255 } }],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: BRAND, textColor: 255 },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });
}

function drawTB(pdf: jsPDF, lines: Line[], company: any) {
  const y = addHeader(pdf, "Trial Balance", "All posted entries", company);
  const byAcc = new Map<string, any>();
  lines.forEach(l => {
    const a = l.account; if (!a) return;
    const k = a.account_code + a.account_name;
    const cur = byAcc.get(k) ?? { code: a.account_code, name: a.account_name, type: a.account_type, debit: 0, credit: 0 };
    cur.debit += num(l.debit); cur.credit += num(l.credit);
    byAcc.set(k, cur);
  });
  const rows = Array.from(byAcc.values()).sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  const tDR = rows.reduce((s, r) => s + r.debit, 0);
  const tCR = rows.reduce((s, r) => s + r.credit, 0);

  autoTable(pdf, {
    startY: y,
    head: [["Code", "Account", "Type", "Debit", "Credit"]],
    body: [
      ...rows.map(r => [r.code, r.name, r.type, r.debit > 0 ? fmt(r.debit) : "", r.credit > 0 ? fmt(r.credit) : ""]),
      [{ content: "Totals", colSpan: 3, styles: { fontStyle: "bold" } },
       { content: fmt(tDR), styles: { fontStyle: "bold", halign: "right" } },
       { content: fmt(tCR), styles: { fontStyle: "bold", halign: "right" } }],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: BRAND, textColor: 255 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  if (Math.abs(tDR - tCR) > 0.01) {
    // @ts-expect-error lastAutoTable
    const yy = pdf.lastAutoTable.finalY + 20;
    pdf.setTextColor(200, 40, 40);
    pdf.setFontSize(10);
    pdf.text(`⚠ Out of balance by ${fmt(tDR - tCR)}`, 40, yy);
  }
}

function drawBS(pdf: jsPDF, lines: Line[], company: any, asOf: string) {
  const y = addHeader(pdf, "Balance Sheet", `As of: ${asOf}`, company);
  const byAcc = new Map<string, any>();
  lines.forEach(l => {
    const a = l.account; if (!a) return;
    const k = a.account_code + a.account_name;
    const cur = byAcc.get(k) ?? { code: a.account_code, name: a.account_name, type: a.account_type, balance: 0 };
    const dr = ["asset", "expense"].includes(a.account_type);
    cur.balance += dr ? num(l.debit) - num(l.credit) : num(l.credit) - num(l.debit);
    byAcc.set(k, cur);
  });
  const all = Array.from(byAcc.values());
  const assets = all.filter(r => r.type === "asset");
  const liabs = all.filter(r => r.type === "liability");
  const equity = all.filter(r => r.type === "equity");
  const netIncome =
    all.filter(r => r.type === "revenue").reduce((s, r) => s + r.balance, 0) -
    all.filter(r => r.type === "expense").reduce((s, r) => s + r.balance, 0);
  const tA = assets.reduce((s, r) => s + r.balance, 0);
  const tL = liabs.reduce((s, r) => s + r.balance, 0);
  const tE = equity.reduce((s, r) => s + r.balance, 0) + netIncome;

  autoTable(pdf, {
    startY: y,
    head: [["Section", "Code", "Account", "Amount"]],
    body: [
      ...assets.map(r => ["Asset", r.code, r.name, fmt(r.balance)]),
      [{ content: "Total Assets", colSpan: 3, styles: { fontStyle: "bold" } }, { content: fmt(tA), styles: { fontStyle: "bold", halign: "right" } }],
      ...liabs.map(r => ["Liability", r.code, r.name, fmt(r.balance)]),
      [{ content: "Total Liabilities", colSpan: 3, styles: { fontStyle: "bold" } }, { content: fmt(tL), styles: { fontStyle: "bold", halign: "right" } }],
      ...equity.map(r => ["Equity", r.code, r.name, fmt(r.balance)]),
      ["Equity", "—", "Current period earnings", fmt(netIncome)],
      [{ content: "Total Equity", colSpan: 3, styles: { fontStyle: "bold" } }, { content: fmt(tE), styles: { fontStyle: "bold", halign: "right" } }],
      [{ content: "Total Liabilities + Equity", colSpan: 3, styles: { fontStyle: "bold", fillColor: [15, 76, 92], textColor: 255 } },
       { content: fmt(tL + tE), styles: { fontStyle: "bold", halign: "right", fillColor: [15, 76, 92], textColor: 255 } }],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: BRAND, textColor: 255 },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  if (Math.abs(tA - (tL + tE)) > 0.01) {
    // @ts-expect-error lastAutoTable
    const yy = pdf.lastAutoTable.finalY + 20;
    pdf.setTextColor(200, 40, 40);
    pdf.setFontSize(10);
    pdf.text(`⚠ Balance sheet does not balance (Δ ${fmt(tA - (tL + tE))})`, 40, yy);
  }
}

export async function generateAccountantPack(from: string, to: string) {
  const [pnlLines, allLines, company] = await Promise.all([
    fetchLines(from, to),
    fetchLines(undefined, to),
    fetchCompany(),
  ]);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  drawPnL(pdf, pnlLines, company, from, to); addFooter(pdf);
  pdf.addPage(); drawTB(pdf, allLines, company); addFooter(pdf);
  pdf.addPage(); drawBS(pdf, allLines, company, to); addFooter(pdf);
  pdf.save(`accountant-pack-${from}_to_${to}.pdf`);
}
