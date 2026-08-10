// Branded multi-section PDF for the Accountant Monthly Management Report.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlyReport } from "@/lib/reports/monthly-management";

const BRAND = { dark: "#064e3b", primary: "#059669", slate: "#0f172a", muted: "#64748b" };

const money = (v: number) =>
  (Math.round((v || 0) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function logoDataUrl(logoUrl?: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  let url = logoUrl;
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

type Meta = { preparedBy: string; reviewedBy: string; status: string; comments: string };

export async function exportMonthlyManagementPdf(r: MonthlyReport, meta: Meta) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 36;
  const c = r.company;

  // ---------- Header band ----------
  pdf.setFillColor(BRAND.dark);
  pdf.rect(0, 0, pageW, 104, "F");
  pdf.setFillColor(BRAND.primary);
  pdf.rect(0, 100, pageW, 4, "F");

  const logo = await logoDataUrl(c?.logo_url);
  let x = margin;
  if (logo) {
    try {
      pdf.addImage(logo, logo.startsWith("data:image/png") ? "PNG" : "JPEG", margin, 20, 58, 58, undefined, "FAST");
      x = margin + 72;
    } catch { /* ignore */ }
  }
  pdf.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(14);
  pdf.text((c?.name ?? "SifoBooks").toUpperCase(), x, 36);
  pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(214, 234, 224);
  [c?.address, [c?.email, c?.phone].filter(Boolean).join("  ·  "), c?.tpin ? `TPIN: ${c.tpin}` : null]
    .filter(Boolean)
    .forEach((l, i) => pdf.text(String(l), x, 50 + i * 11, { maxWidth: pageW - x - 210 }));

  pdf.setFont("helvetica", "bold").setFontSize(12).setTextColor(255, 255, 255);
  pdf.text("ACCOUNTANT MONTHLY", pageW - margin, 34, { align: "right" });
  pdf.text("MANAGEMENT REPORT", pageW - margin, 48, { align: "right" });
  pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(214, 234, 224);
  pdf.text(`Period: ${r.label}`, pageW - margin, 64, { align: "right" });
  pdf.text(`Ref: ${r.reference}`, pageW - margin, 76, { align: "right" });
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 88, { align: "right" });

  let y = 124;

  pdf.setTextColor(BRAND.slate).setFont("helvetica", "normal").setFontSize(9);
  pdf.text(`Prepared by: ${meta.preparedBy || "—"}    ·    Reviewed / approved by: ${meta.reviewedBy || "—"}    ·    Status: ${meta.status.toUpperCase()}`, margin, y);
  y += 16;

  // ---------- Executive summary cards ----------
  const cards = [
    ["Revenue", money(r.summary.revenue)],
    ["Expenses", money(r.summary.expenses)],
    ["Net profit", money(r.summary.netProfit)],
    ["Receivables", money(r.summary.receivables)],
    ["Payables", money(r.summary.payables)],
    ["Cash & bank", money(r.summary.cashAndBank)],
    ["Inventory value", money(r.summary.inventoryValue)],
    ["Tax obligations", money(r.summary.taxObligations)],
  ];
  const perRow = 4, gap = 10;
  const cw = (pageW - margin * 2 - gap * (perRow - 1)) / perRow;
  cards.forEach((card, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const cx = margin + col * (cw + gap);
    const cy = y + row * 48;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(cx, cy, cw, 42, 4, 4, "F");
    pdf.setFontSize(7).setTextColor(BRAND.muted).setFont("helvetica", "normal");
    pdf.text(card[0].toUpperCase(), cx + 8, cy + 14);
    pdf.setFontSize(10.5).setTextColor(BRAND.slate).setFont("helvetica", "bold");
    pdf.text(`${r.currency} ${card[1]}`, cx + 8, cy + 30);
  });
  y += Math.ceil(cards.length / perRow) * 48 + 6;

  pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(BRAND.slate);
  const wrapped = pdf.splitTextToSize(r.summary.text, pageW - margin * 2);
  pdf.text(wrapped, margin, y + 8);
  y += 8 + wrapped.length * 11 + 8;

  const table = (title: string, head: string[], body: (string | number)[][], startY?: number) => {
    if (!body.length) body = [[{ content: "No records for this period", colSpan: head.length } as any]];
    autoTable(pdf, {
      startY: startY ?? ((pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 24 : y),
      head: [head],
      body: body as any,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 4, textColor: [15, 23, 42], lineColor: [226, 232, 240] },
      headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: () => {
        pdf.setFontSize(7.5).setTextColor(148, 163, 184);
        pdf.text(
          `${c?.name ?? "SifoBooks"} · Accountant Monthly Management Report · ${r.label} · ${r.reference} · Page ${pdf.getNumberOfPages()}`,
          pageW / 2, pdf.internal.pageSize.getHeight() - 14, { align: "center" },
        );
      },
      willDrawPage: () => { /* noop */ },
      didParseCell: () => { /* noop */ },
      showHead: "everyPage",
      tableLineWidth: 0,
      pageBreak: "auto",
      // section title
      didDrawCell: () => { /* noop */ },
    });
  };

  const heading = (text: string) => {
    const prevY = (pdf as any).lastAutoTable?.finalY ?? y;
    let ny = prevY + 22;
    if (ny > pdf.internal.pageSize.getHeight() - 90) { pdf.addPage(); ny = 60; }
    pdf.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(BRAND.dark);
    pdf.text(text, margin, ny);
    return ny + 8;
  };

  table("Income", ["Date", "Customer", "Invoice", "Amount", "Tax", "Total", "Status"],
    r.income.rows.map(i => [i.date, i.customer, i.invoice, money(i.amount), money(i.tax), money(i.total), i.status]),
    y + 14);

  let sy = heading("Expenses by category");
  table("", ["Category", "Total"], r.byCategory.map(b => [b.category, money(b.total)]), sy);

  sy = heading("Expense detail");
  table("", ["Date", "Payee", "Account", "Reference", "Amount", "Tax", "Total", "Method", "Status"],
    r.expenseRows.map(e => [e.date, e.payee, e.account, e.reference, money(e.amount), money(e.tax), money(e.total), e.method, e.status]), sy);

  sy = heading("Purchase invoices");
  table("", ["Invoice", "Supplier", "Date", "Amount", "Tax", "Total", "Paid", "Balance", "Status"],
    r.purchases.rows.map(p => [p.number, p.supplier, p.date, money(p.amount), money(p.tax), money(p.total), money(p.paid), money(p.balance), p.status]), sy);

  sy = heading("Returns & credit notes");
  table("", ["Date", "Customer", "Invoice", "Credit note", "Amount", "Reason", "Status"],
    r.returns.sales.map(s => [s.date, s.customer, s.invoice, s.number, money(s.amount), s.reason, s.status]), sy);

  sy = heading("Customer receipts");
  table("", ["Date", "Customer", "Reference", "Amount", "Method"],
    r.receipts.map(x => [x.date, x.customer, x.reference, money(x.amount), x.method]), sy);

  sy = heading("Supplier payments");
  table("", ["Date", "Supplier", "Reference", "Amount", "Method"],
    r.supplierPayments.map(x => [x.date, x.supplier, x.reference, money(x.amount), x.method]), sy);

  sy = heading("Banking & reconciliation");
  table("", ["Account", "Opening", "Deposits", "Withdrawals", "Closing", "Unreconciled"],
    r.banking.accounts.map((b: any) => [`${b.name}${b.bank_name ? ` — ${b.bank_name}` : ""}`, money(b.opening_balance), money(b.deposits), money(b.withdrawals), money(b.closing), b.unreconciled]), sy);

  sy = heading("ZRA compliance activities");
  table("", ["Obligation", "Period", "Amount", "Due date", "Reference", "Status"],
    r.compliance.zra.map((o: any) => [`${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), o.period, money(o.amount), o.due_date, o.reference ?? "—", o.status]), sy);

  sy = heading("Other statutory compliance");
  table("", ["Obligation", "Period", "Amount", "Due date", "Reference", "Status"],
    r.compliance.other.map((o: any) => [`${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), o.period, money(o.amount), o.due_date, o.reference ?? "—", o.status]), sy);

  sy = heading("Accounting work completed");
  table("", ["Activity", "Count"], Object.entries(r.activity).map(([k, v]) => [
    k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()), String(v),
  ]), sy);

  sy = heading("Outstanding customer debts");
  table("", ["Customer", "Invoice", "Date", "Due", "Amount", "Paid", "Balance", "Days overdue"],
    r.debtors.slice(0, 60).map(d => [d.customer, d.invoice, d.date, d.due ?? "—", money(d.amount), money(d.paid), money(d.balance), d.days]), sy);

  sy = heading("Outstanding supplier & institution obligations");
  table("", ["Supplier / institution", "Reference", "Amount", "Due", "Status"], [
    ...r.creditors.slice(0, 60).map(x => [x.supplier, x.bill, money(x.balance), x.due ?? "—", x.days > 0 ? "Overdue" : "Open"]),
    ...r.compliance.all.filter((o: any) => o.status !== "paid").map((o: any) => [`${o.body ?? ""} ${o.obligation_type ?? ""}`.trim(), o.reference ?? o.period, money(o.amount), o.due_date ?? "—", o.status]),
  ], sy);

  sy = heading("Inventory accounting summary");
  table("", ["Metric", "Value"], [
    ["Items tracked", String(r.inventory.items)],
    ["Closing inventory value", `${r.currency} ${money(r.inventory.value)}`],
    ["Stock adjustments in period", String(r.inventory.adjustments.length)],
    ["Low-stock items", String(r.inventory.lowStock.length)],
  ], sy);

  sy = heading("General ledger control summary");
  table("", ["Metric", "Value"], [
    ["Journal entries", String(r.ledger.entries)],
    ["Posted", String(r.ledger.posted)],
    ["Unposted / draft", String(r.ledger.unposted)],
    ["Reversed", String(r.ledger.reversed)],
    ["Out of balance", String(r.ledger.outOfBalance.length)],
    ["Total debits", money(r.ledger.totalDebit)],
    ["Total credits", money(r.ledger.totalCredit)],
  ], sy);

  sy = heading("Month-on-month comparison");
  table("", ["Metric", r.label, r.prevLabel, "Change"], r.comparison.map(cmp => {
    const change = cmp.previous ? `${(((cmp.current - cmp.previous) / Math.abs(cmp.previous)) * 100).toFixed(1)}%` : "—";
    return [cmp.metric, money(cmp.current), money(cmp.previous), change];
  }), sy);

  sy = heading("Items requiring management attention");
  table("", ["Priority", "Item", "Detail"],
    r.attention.map(a => [a.severity.toUpperCase(), a.item, a.detail]), sy);

  // ---------- Accountant's comments + approval ----------
  let cy = ((pdf as any).lastAutoTable?.finalY ?? 200) + 26;
  if (cy > pdf.internal.pageSize.getHeight() - 220) { pdf.addPage(); cy = 60; }
  pdf.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(BRAND.dark);
  pdf.text("ACCOUNTANT'S COMMENTS", margin, cy);
  pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(BRAND.slate);
  const notes = pdf.splitTextToSize(meta.comments || "—", pageW - margin * 2);
  pdf.text(notes, margin, cy + 16);
  cy += 16 + notes.length * 11 + 30;

  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, cy + 30, margin + 200, cy + 30);
  pdf.line(pageW - margin - 200, cy + 30, pageW - margin, cy + 30);
  pdf.setFontSize(8).setTextColor(BRAND.muted);
  pdf.text(`Prepared by: ${meta.preparedBy || "—"}`, margin, cy + 44);
  pdf.text("Signature / Date", margin, cy + 56);
  pdf.text(`Reviewed by: ${meta.reviewedBy || "—"}`, pageW - margin - 200, cy + 44);
  pdf.text("Signature / Date", pageW - margin - 200, cy + 56);
  pdf.setFont("helvetica", "bold").setTextColor(BRAND.dark);
  pdf.text(`Approval status: ${meta.status.toUpperCase()}`, margin, cy + 76);

  pdf.save(`accountant-monthly-management-report-${r.period}.pdf`);
}
