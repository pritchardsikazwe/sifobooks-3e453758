import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND = { dark: "#064e3b", primary: "#059669", accent: "#c9a84c", ivory: "#f5f0e0", line: "#e2e8f0", slate: "#0f172a", muted: "#64748b" };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

async function fetchCompany() {
  const { data } = await supabase.from("companies").select("name, address, tpin, email, phone, logo_url").limit(1).maybeSingle();
  return data;
}

async function header(pdf: jsPDF, title: string, subtitle?: string) {
  const company = await fetchCompany();
  const logo = await resolveLogo(company?.logo_url);
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 40;
  pdf.setFillColor(BRAND.dark); pdf.rect(0, 0, pageW, 92, "F");
  pdf.setFillColor(BRAND.primary); pdf.rect(0, 84, pageW, 6, "F");
  pdf.setFillColor(BRAND.accent); pdf.rect(0, 90, pageW, 2, "F");
  let tx = margin;
  if (logo) {
    try {
      const f = logo.startsWith("data:image/png") ? "PNG" : "JPEG";
      pdf.addImage(logo, f as any, margin, 18, 54, 54, undefined, "FAST");
      tx = margin + 68;
    } catch {}
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
  pdf.text((company?.name ?? "SifoBooks").toUpperCase(), tx, 38);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(220, 234, 224);
  if (company?.address) pdf.text(company.address, tx, 52);
  if (company?.tpin) pdf.text(`TPIN: ${company.tpin}`, tx, 64);

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(BRAND.ivory);
  pdf.text(title.toUpperCase(), pageW - margin, 40, { align: "right" });
  if (subtitle) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.setTextColor(220, 234, 224);
    pdf.text(subtitle, pageW - margin, 58, { align: "right" });
  }
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(220, 234, 224);
  pdf.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, 74, { align: "right" });
}

function footer(pdf: jsPDF, label: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(BRAND.line);
    pdf.line(margin, pageH - 26, pageW - margin, pageH - 26);
    pdf.setFontSize(7.5); pdf.setTextColor(BRAND.muted);
    pdf.text(`${label} · SifoBooks Inventory`, margin, pageH - 14);
    pdf.text(`Page ${p} of ${total}`, pageW - margin, pageH - 14, { align: "right" });
  }
}

// ============ BIN CARD (per item movement history) ============
export async function generateBinCardPdf(item: { id: string; name: string; sku?: string | null; unit?: string | null }) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  await header(pdf, "Bin Card", `${item.name}${item.sku ? ` · ${item.sku}` : ""}`);

  const { data: moves } = await supabase
    .from("stock_movements")
    .select("created_at, movement_type, quantity, unit_cost, reference, note")
    .eq("item_id", item.id)
    .order("created_at", { ascending: true });

  let bal = 0;
  const rows = (moves ?? []).map(m => {
    const qty = Number(m.quantity) || 0;
    const isIn = m.movement_type === "in" || m.movement_type === "adjustment_in" || (m.movement_type === "adjustment" && qty >= 0);
    const inQ = isIn ? Math.abs(qty) : 0;
    const outQ = !isIn ? Math.abs(qty) : 0;
    bal += inQ - outQ;
    return [
      new Date(m.created_at).toISOString().slice(0, 10),
      String(m.movement_type),
      m.reference || "—",
      m.note || "",
      inQ ? String(inQ) : "",
      outQ ? String(outQ) : "",
      m.unit_cost != null ? fmt(Number(m.unit_cost)) : "",
      String(bal),
    ];
  });

  autoTable(pdf, {
    startY: 110,
    head: [["Date", "Type", "Ref", "Note", "In", "Out", "Unit Cost", "Balance"]],
    body: rows.length ? rows : [[{ content: "No movements yet.", colSpan: 8, styles: { halign: "center", textColor: 150 } } as any]],
    styles: { fontSize: 8.5, cellPadding: 4, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });
  footer(pdf, `Bin Card — ${item.name}`);
  pdf.save(`bin-card-${item.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}

// ============ STOCK TAKE SHEET ============
export async function generateStockTakeSheet(items: { name: string; sku?: string | null; unit?: string | null; on_hand?: number | null; warehouse?: string | null; category?: string | null }[]) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  await header(pdf, "Stock Take Sheet", `${items.length} items · Cut-off: ${new Date().toISOString().slice(0, 10)}`);
  autoTable(pdf, {
    startY: 110,
    head: [["#", "SKU", "Item", "Category", "Warehouse", "Unit", "Book Qty", "Counted Qty", "Variance", "Counted By"]],
    body: items.map((it, i) => [
      String(i + 1),
      it.sku ?? "—",
      it.name,
      it.category ?? "—",
      it.warehouse ?? "—",
      it.unit ?? "—",
      String(it.on_hand ?? 0),
      "", "", "",
    ]),
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: BRAND.line, lineWidth: 0.3, minCellHeight: 22 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      6: { halign: "right" },
      7: { halign: "right", fillColor: [255, 253, 245] },
      8: { halign: "right", fillColor: [255, 253, 245] },
      9: { fillColor: [255, 253, 245] },
    },
    margin: { left: 30, right: 30 },
  });

  // Signature lines
  // @ts-expect-error autotable
  const y = pdf.lastAutoTable.finalY + 24;
  const pageW = pdf.internal.pageSize.getWidth();
  const sigW = 180;
  ["Counted by", "Verified by", "Approved by"].forEach((label, i) => {
    const x = 40 + i * (sigW + 30);
    pdf.setDrawColor(120);
    pdf.line(x, y + 20, x + sigW, y + 20);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(80);
    pdf.text(`${label} (Name / Signature / Date)`, x, y + 34);
  });

  footer(pdf, "Stock Take Sheet");
  pdf.save(`stock-take-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============ STOCK VALUATION REPORT ============
export async function generateStockValuationPdf(items: { name: string; sku?: string | null; on_hand?: number | null; cost_price?: number | null; category?: string | null }[]) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  await header(pdf, "Stock Valuation", `As of ${new Date().toISOString().slice(0, 10)}`);

  const rows = items.map(it => {
    const qty = Number(it.on_hand ?? 0);
    const cost = Number(it.cost_price ?? 0);
    return { name: it.name, sku: it.sku ?? "—", cat: it.category ?? "—", qty, cost, value: qty * cost };
  });
  const total = rows.reduce((a, r) => a + r.value, 0);

  autoTable(pdf, {
    startY: 110,
    head: [["SKU", "Item", "Category", "On Hand", "Unit Cost", "Value (ZMW)"]],
    body: rows.map(r => [r.sku, r.name, r.cat, String(r.qty), fmt(r.cost), fmt(r.value)]),
    foot: [[{ content: "TOTAL STOCK VALUE", colSpan: 5, styles: { halign: "right", fillColor: BRAND.dark, textColor: 255, fontStyle: "bold" } },
            { content: fmt(total), styles: { halign: "right", fillColor: BRAND.dark, textColor: 255, fontStyle: "bold" } }]],
    styles: { fontSize: 8.5, cellPadding: 5, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });
  footer(pdf, "Stock Valuation");
  pdf.save(`stock-valuation-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============ STOCK MOVEMENT REPORT ============
export async function generateStockMovementReport(from: string, to: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  await header(pdf, "Stock Movement Report", `${from} → ${to}`);

  const { data: moves } = await supabase
    .from("stock_movements")
    .select("created_at, movement_type, quantity, unit_cost, reference, note, item_id, stock_items(name, sku)")
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`)
    .order("created_at", { ascending: true });

  const rows = (moves ?? []).map((m: any) => {
    const qty = Number(m.quantity) || 0;
    const cost = m.unit_cost != null ? Number(m.unit_cost) : 0;
    return [
      new Date(m.created_at).toISOString().slice(0, 10),
      m.stock_items?.sku ?? "—",
      m.stock_items?.name ?? "—",
      String(m.movement_type),
      m.reference || "—",
      m.note || "",
      String(qty),
      fmt(cost),
      fmt(qty * cost),
    ];
  });

  autoTable(pdf, {
    startY: 110,
    head: [["Date", "SKU", "Item", "Type", "Ref", "Note", "Qty", "Unit Cost", "Value"]],
    body: rows.length ? rows : [[{ content: "No movements in this period.", colSpan: 9, styles: { halign: "center", textColor: 150 } } as any]],
    styles: { fontSize: 8, cellPadding: 4, lineColor: BRAND.line, lineWidth: 0.25 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    columnStyles: { 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 30, right: 30 },
  });
  footer(pdf, "Stock Movement Report");
  pdf.save(`stock-movements-${from}_to_${to}.pdf`);
}
