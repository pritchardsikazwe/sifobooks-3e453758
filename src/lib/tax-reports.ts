// Shared VAT Return / Turnover Tax logic used by web and Windows.
import { evaluateInputVat, applyVatAdjustments, type TaxAdjustment } from "./tax-compliance";

export const EXCLUDED_STATUSES = ["draft", "voided", "void", "cancelled"];
export const VAT_INVOICE_COLUMNS = "id,number,issue_date,subtotal,vat_amount,total,status,customers(name),invoice_items(quantity,unit_price,discount_amount,discount_type,vat_rate,line_total)";
export const VAT_BILL_COLUMNS = "id,bill_number,bill_date,subtotal,tax_amount,total,status,vat_recoverable,vat_claim_date,business_use_percent,import_vat,vat_evidence_type,suppliers(name)";
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
  let salesStandardNet = 0;
  let salesStandardVat = 0;
  let salesZeroRatedNet = 0;

  for (const invoice of inv) {
    const lines = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];
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
          salesStandardVat += n(line.line_total) > 0 ? n(line.line_total) * rate / (100 + rate) : net * rate / 100;
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
  const eligible = bl.map(b => ({
    bill: b,
    decision: evaluateInputVat({
      taxAmount: b.tax_amount,
      importVat: b.import_vat,
      vatDate: b.vat_claim_date ?? b.bill_date,
      returnEnd,
      businessUsePercent: b.business_use_percent ?? 100,
      vatEvidenceType: b.vat_evidence_type ?? "tax_invoice",
      status: b.status,
    }),
  })).filter(x => x.decision.claimable);

  let purchasesNet = eligible.reduce((s, x) => s + n(x.bill.subtotal), 0);
  let purchasesVat = eligible.reduce((s, x) => s + x.decision.claimableVat, 0);

  if (opts.adjustments && opts.returnStart) {
    const a = applyVatAdjustments(opts.adjustments, opts.returnStart, returnEnd);
    salesStandardNet += a.outputNet;
    salesStandardVat += a.outputVat;
    purchasesNet += a.inputNet;
    purchasesVat += a.inputVat;
  }

  const out = {
    salesStandardNet: r2(salesStandardNet),
    salesStandardVat: r2(salesStandardVat),
    salesZeroRatedNet: r2(salesZeroRatedNet),
    purchasesNet: r2(purchasesNet),
    purchasesVat: r2(purchasesVat),
    netVat: 0,
    invoiceCount: inv.length,
    billCount: bl.length,
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
