// Shared VAT Return / Turnover Tax logic used by web and Windows.
import { evaluateInputVat, applyVatAdjustments, type TaxAdjustment } from "./tax-compliance";

export const EXCLUDED_STATUSES = ["draft", "voided", "void", "cancelled"];
export const VAT_INVOICE_COLUMNS = "id,number,issue_date,subtotal,vat_amount,total,status,customers(name),invoice_items(quantity,unit_price,discount_amount,discount_type,vat_rate,line_total)";
export const VAT_BILL_COLUMNS = "id,bill_number,bill_date,subtotal,tax_amount,total,status,vat_recoverable,vat_claim_date,business_use_percent,import_vat,vat_evidence_type,suppliers(name),bill_vat_lines(id,description,tax_category,vat_rate,net_amount,vat_amount,business_use_percent,import_vat,evidence_type)";
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

export function vatInvoicesQuery(db: any, from: string, to: string) {
  return db.from("invoices").select(VAT_INVOICE_COLUMNS)
    .gte("issue_date", from).lte("issue_date", to)
    .neq("status", "draft").order("issue_date", { ascending: true });
}

export function vatBillsQuery(db: any, from: string, to: string) {
  return db.from("bills").select(VAT_BILL_COLUMNS)
    .gte("bill_date", from).lte("bill_date", to)
    .neq("status", "draft").order("bill_date", { ascending: true });
}

export function totInvoicesQuery(db: any, from: string, to: string) {
  return db.from("invoices").select(TOT_INVOICE_COLUMNS)
    .gte("issue_date", from).lte("issue_date", to)
    .neq("status", "draft").order("issue_date", { ascending: true });
}

export type VatReturn = {
  salesStandardNet: number;
  salesStandardVat: number;
  salesZeroRatedNet: number;
  purchasesNet: number;
  purchasesVat: number;
  netVat: number;
  invoiceCount: number;
  billCount: number;
};

export function computeVatReturn(
  invoices: any[],
  bills: any[],
  opts: { returnEnd?: string; returnStart?: string; adjustments?: TaxAdjustment[] } = {},
): VatReturn {
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
    const lines = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];
    const lineTotalSum = lines.reduce((s: number, line: any) => s + n(line.line_total), 0);
    const inclusiveLines = Math.abs(lineTotalSum - n(invoice.total)) < 0.01;
    if (lines.length) {
      for (const line of lines) {
        const qty = n(line.quantity);
        const unit = n(line.unit_price);
        const gross = qty * unit;
        const discount = n(line.discount_amount);
        const discountType = String(line.discount_type ?? "%");
        const net = n(line.line_total) || (discountType === "%" ? gross - gross * discount / 100 : gross - discount);
        const rate = n(line.vat_rate);
        if (rate > 0) {
          salesStandardNet += net;
          salesStandardVat += inclusiveLines ? n(line.line_total) * rate / (100 + rate) : net * rate / 100;
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

  const returnEnd = opts.returnEnd ?? new Date().toISOString().slice(0, 10);
  let purchasesNet = 0;
  let purchasesVat = 0;
  for (const bill of bl) {
    const lines = Array.isArray(bill.bill_vat_lines) ? bill.bill_vat_lines : [];
    if (lines.length) {
      for (const line of lines) {
        const decision = evaluateInputVat({
          taxAmount: line.vat_amount,
          importVat: line.import_vat,
          vatDate: bill.vat_claim_date ?? bill.bill_date,
          returnEnd,
          businessUsePercent: line.business_use_percent ?? 100,
          vatEvidenceType: line.evidence_type ?? "tax_invoice",
          status: bill.status,
        });
        if (decision.claimable) {
          purchasesNet += n(line.net_amount);
          purchasesVat += decision.claimableVat;
        }
      }
    } else {
      const decision = evaluateInputVat({
        taxAmount: bill.tax_amount,
        importVat: bill.import_vat,
        vatDate: bill.vat_claim_date ?? bill.bill_date,
        returnEnd,
        businessUsePercent: bill.business_use_percent ?? 100,
        vatEvidenceType: bill.vat_evidence_type ?? "tax_invoice",
        status: bill.status,
      });
      if (decision.claimable) {
        purchasesNet += n(bill.subtotal);
        purchasesVat += decision.claimableVat;
      }
    }
  }

  if (opts.adjustments && opts.returnStart) {
    const a = applyVatAdjustments(opts.adjustments, opts.returnStart, returnEnd);
    salesStandardNet += a.outputNet;
    salesStandardVat += a.outputVat;
    purchasesNet += a.inputNet;
    purchasesVat += a.inputVat;
  }

  const stdIn = bl.filter((b) => n(b.tax_amount) > 0);
  const out = {
    salesStandardNet: r2(salesStandardNet),
    salesStandardVat: r2(salesStandardVat),
    salesZeroRatedNet: r2(salesZeroRatedNet),
    purchasesNet: r2(purchasesNet),
    purchasesVat: r2(purchasesVat),
    netVat: 0,
    invoiceCount: inv.length,
    billCount: bl.length,
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
  const due = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 14));
  return { turnover, rate, tax: r2((turnover * rate) / 100), dueDate: due.toISOString().slice(0, 10), invoiceCount: inv.length };
}
