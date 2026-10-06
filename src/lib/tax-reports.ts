// Shared VAT Return / Turnover Tax logic, used by both report screens and the
// regression tests. Same requests and same maths on the web and on Windows.
// Rules are the ones the screens already used (no new tax rules):
//  - only issued documents count: drafts are excluded, and voided/cancelled
//    documents are excluded as the invoice list already treats them as void;
//  - VAT sales classification prefers invoice-line VAT rates, so mixed-rate invoices are split correctly;\n//    legacy invoices without line data retain the invoice-level fallback.
//  - Turnover Tax = gross invoiced turnover x rate (default 5%).

export const EXCLUDED_STATUSES = ["draft", "voided", "void", "cancelled"];

export const VAT_INVOICE_COLUMNS = "id,number,issue_date,subtotal,vat_amount,total,status,customers(name),invoice_items(quantity,unit_price,discount_amount,discount_type,vat_rate,line_total)";
export const VAT_BILL_COLUMNS = "id,bill_number,bill_date,subtotal,tax_amount,total,status,suppliers(name)";
export const TOT_INVOICE_COLUMNS = "id,number,issue_date,subtotal,total,status,customers(name)";

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const r2 = (v: number) => Math.round(v * 100) / 100;

export function isCountable(row: { status?: string | null }) {
  return !EXCLUDED_STATUSES.includes(String(row?.status ?? "").toLowerCase());
}

/** Query builders — `db` is the Supabase(-compatible) client. */
export function vatInvoicesQuery(db: any, from: string, to: string) {
  return db.from("invoices").select(VAT_INVOICE_COLUMNS)
    .gte("issue_date", from).lte("issue_date", to)
    .neq("status", "draft") // voided/cancelled removed by isCountable (same on both databases)
    .order("issue_date", { ascending: true });
}
export function vatBillsQuery(db: any, from: string, to: string) {
  return db.from("bills").select(VAT_BILL_COLUMNS)
    .gte("bill_date", from).lte("bill_date", to)
    .neq("status", "draft") // voided/cancelled removed by isCountable (same on both databases)
    .order("bill_date", { ascending: true });
}
export function totInvoicesQuery(db: any, from: string, to: string) {
  return db.from("invoices").select(TOT_INVOICE_COLUMNS)
    .gte("issue_date", from).lte("issue_date", to)
    .neq("status", "draft") // voided/cancelled removed by isCountable (same on both databases)
    .order("issue_date", { ascending: true });
}

export type VatReturn = {
  salesStandardNet: number; salesStandardVat: number; salesZeroRatedNet: number;
  purchasesNet: number; purchasesVat: number; netVat: number;
  invoiceCount: number; billCount: number;
};

export function computeVatReturn(invoices: any[], bills: any[]): VatReturn {
  const inv = (invoices ?? []).filter(isCountable);
  const bl = (bills ?? []).filter(isCountable);

  // Prefer invoice-line tax classification when line data is available. This
  // fixes mixed-rate invoices: an invoice is not classified wholly by its
  // invoice-level VAT amount. Legacy invoices without lines retain the old
  // invoice-level fallback so historical data remains reportable.
  let salesStandardNet = 0;
  let salesStandardVat = 0;
  let salesZeroRatedNet = 0;

  for (const invoice of inv) {
    if (hasLines(invoice)) {
      for (const line of invoice.invoice_items as InvoiceLine[]) {
        const rate = n(line.vat_rate);
        const net = invoiceLineNet(line);
        if (rate > 0) {
          salesStandardNet += net;
          salesStandardVat += invoiceLineVat(line);
        } else {
          salesZeroRatedNet += net;
        }
      }
    } else if (n(invoice.vat_amount) > 0) {
      salesStandardNet += n(invoice.subtotal);
      salesStandardVat += n(invoice.vat_amount);
    } else {
      salesZeroRatedNet += n(invoice.subtotal);
    }
  }

  const stdIn = bl.filter((b) => n(b.tax_amount) > 0);
  const out = {
    salesStandardNet: r2(salesStandardNet),
    salesStandardVat: r2(salesStandardVat),
    salesZeroRatedNet: r2(salesZeroRatedNet),
    purchasesNet: r2(stdIn.reduce((s, r) => s + n(r.subtotal), 0)),
    purchasesVat: r2(stdIn.reduce((s, r) => s + n(r.tax_amount), 0)),
    netVat: 0, invoiceCount: inv.length, billCount: bl.length,
  };
  out.netVat = r2(out.salesStandardVat - out.purchasesVat);
  return out;
}

export type TurnoverTax = { turnover: number; rate: number; tax: number; dueDate: string; invoiceCount: number };

export function computeTurnoverTax(invoices: any[], month: string, rate = 5): TurnoverTax {
  const inv = (invoices ?? []).filter(isCountable);
  const turnover = r2(inv.reduce((s, r) => s + n(r.total), 0));
  const [y, m] = month.split("-").map(Number);
  // 14th of the following month
  const due = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 14));
  return { turnover, rate, tax: r2((turnover * rate) / 100), dueDate: due.toISOString().slice(0, 10), invoiceCount: inv.length };
}
