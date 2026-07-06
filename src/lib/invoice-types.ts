export type Status = "paid" | "pending" | "overdue" | "draft";
export type LineItem = { description: string; qty: number; price: number; hsCode?: string; stockItemId?: string | null };
export type ZraInfo = {
  invoiceType: "normal" | "credit" | "debit" | "training" | "export";
  vatRate: number;
  sellerTpin: string;
  buyerTpin: string;
  submittedRef?: string;
  submittedAt?: string;
};
export type Invoice = {
  id: string; number: string; client: string; email: string;
  issueDate: string; dueDate: string; status: Status; items: LineItem[];
  zra?: ZraInfo;
};

export type StockPick = { id: string; name: string; sku: string | null; hs_code: string | null; vat_rate: number; sell_price: number; unit: string; quantity_on_hand: number };

export const PENDING_INVOICE_KEY = "kopelacode.pendingInvoice";
export const PENDING_QUOTE_KEY = "kopelacode.pendingQuote";

export type Quote = {
  id: string; number: string; client: string; email: string;
  issueDate: string; validUntil: string; status: "draft" | "sent" | "accepted" | "declined";
  items: LineItem[]; notes?: string;
};
