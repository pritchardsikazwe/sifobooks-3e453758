import { supabase } from "@/integrations/supabase/client";

export type AuditSeverity = "critical" | "warning" | "info";

export type AuditFinding = {
  severity: AuditSeverity;
  code: string;
  title: string;
  message: string;
  reference?: string;
  entityId?: string;
};

export type TransactionAudit = {
  userId: string;
  generatedAt: string;
  counts: Record<string, number>;
  findings: AuditFinding[];
};

const money = (value: unknown) => Number(value ?? 0);
const nearZero = (value: number) => Math.abs(value) <= 0.01;

export async function runTransactionIntegrityAudit(userId: string): Promise<TransactionAudit> {
  const findings: AuditFinding[] = [];
  const counts: Record<string, number> = {};

  const [{ data: invoices, error: invoiceError }, { data: items, error: itemError }, { data: journals, error: journalError }, { data: lines, error: lineError }, { data: stock, error: stockError }] = await Promise.all([
    supabase.from("invoices").select("id,number,status,subtotal,vat_amount,total,issue_date,user_id").eq("user_id", userId),
    supabase.from("invoice_items").select("id,invoice_id,quantity,unit_price,line_total,stock_item_id,user_id").eq("user_id", userId),
    supabase.from("journal_entries").select("id,entry_number,entry_date,reference,status,total_debit,total_credit,user_id").eq("user_id", userId),
    supabase.from("journal_lines").select("id,entry_id,debit,credit,user_id").eq("user_id", userId),
    supabase.from("stock_movements").select("id,item_id,movement_type,quantity,reference,user_id").eq("user_id", userId),
  ]);

  if (invoiceError) findings.push({ severity: "critical", code: "INVOICE_READ_FAILED", title: "Invoice audit unavailable", message: invoiceError.message });
  if (itemError) findings.push({ severity: "critical", code: "ITEM_READ_FAILED", title: "Invoice-item audit unavailable", message: itemError.message });
  if (journalError) findings.push({ severity: "critical", code: "JOURNAL_READ_FAILED", title: "Journal audit unavailable", message: journalError.message });
  if (lineError) findings.push({ severity: "critical", code: "LINE_READ_FAILED", title: "Journal-line audit unavailable", message: lineError.message });
  if (stockError) findings.push({ severity: "critical", code: "STOCK_READ_FAILED", title: "Stock audit unavailable", message: stockError.message });

  counts.invoices = invoices?.length ?? 0;
  counts.invoiceItems = items?.length ?? 0;
  counts.journalEntries = journals?.length ?? 0;
  counts.journalLines = lines?.length ?? 0;
  counts.stockMovements = stock?.length ?? 0;

  const invoiceById = new Map((invoices ?? []).map(row => [row.id, row]));
  const linesByEntry = new Map<string, typeof lines>();
  for (const line of lines ?? []) {
    const existing = linesByEntry.get(line.entry_id) ?? [];
    existing.push(line);
    linesByEntry.set(line.entry_id, existing);
  }

  const itemsByInvoice = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const existing = itemsByInvoice.get(item.invoice_id) ?? [];
    existing.push(item);
    itemsByInvoice.set(item.invoice_id, existing);
    if (!invoiceById.has(item.invoice_id)) {
      findings.push({ severity: "critical", code: "ORPHAN_INVOICE_ITEM", title: "Invoice item has no invoice", message: `Invoice item ${item.id} references missing invoice ${item.invoice_id}.`, entityId: item.id });
    }
  }

  const journalByReference = new Map<string, typeof journals>();
  for (const journal of journals ?? []) {
    const existing = journalByReference.get(journal.reference ?? "") ?? [];
    existing.push(journal);
    journalByReference.set(journal.reference ?? "", existing);

    const entryLines = linesByEntry.get(journal.id) ?? [];
    const debit = entryLines.reduce((sum, line) => sum + money(line.debit), 0);
    const credit = entryLines.reduce((sum, line) => sum + money(line.credit), 0);
    if (!entryLines.length) {
      findings.push({ severity: "critical", code: "JOURNAL_NO_LINES", title: "Journal has no lines", message: `${journal.entry_number} has no journal lines.`, reference: journal.reference ?? undefined, entityId: journal.id });
    } else if (!nearZero(debit - credit) || !nearZero(debit - money(journal.total_debit)) || !nearZero(credit - money(journal.total_credit))) {
      findings.push({ severity: "critical", code: "JOURNAL_UNBALANCED", title: "Journal is out of balance", message: `${journal.entry_number}: header DR ${money(journal.total_debit).toFixed(2)}, CR ${money(journal.total_credit).toFixed(2)}; lines DR ${debit.toFixed(2)}, CR ${credit.toFixed(2)}.`, reference: journal.reference ?? undefined, entityId: journal.id });
    }
  }

  for (const [reference, matching] of journalByReference) {
    if (reference && matching.length > 1) {
      findings.push({ severity: "critical", code: "DUPLICATE_JOURNAL_REFERENCE", title: "Duplicate journal reference", message: `${reference} appears ${matching.length} times.`, reference });
    }
  }

  for (const invoice of invoices ?? []) {
    const invoiceItems = itemsByInvoice.get(invoice.id) ?? [];
    const itemTotal = invoiceItems.reduce((sum, item) => sum + money(item.line_total), 0);
    const total = money(invoice.total);
    const subtotal = money(invoice.subtotal);
    const vat = money(invoice.vat_amount);
    if (!nearZero(itemTotal - total)) {
      findings.push({ severity: "critical", code: "INVOICE_TOTAL_MISMATCH", title: "Invoice total differs from item lines", message: `${invoice.number}: invoice total ${total.toFixed(2)} vs item lines ${itemTotal.toFixed(2)}.`, reference: invoice.number, entityId: invoice.id });
    }
    if (!nearZero(subtotal + vat - total)) {
      findings.push({ severity: "warning", code: "INVOICE_TAX_TOTAL_MISMATCH", title: "Invoice subtotal + VAT differs from total", message: `${invoice.number}: subtotal ${subtotal.toFixed(2)} + VAT ${vat.toFixed(2)} != total ${total.toFixed(2)}.`, reference: invoice.number, entityId: invoice.id });
    }
    if (invoice.status === "sent") {
      const reference = `INV:${invoice.number}`;
      const matches = journalByReference.get(reference) ?? [];
      if (!matches.length) {
        findings.push({ severity: "critical", code: "POSTED_INVOICE_NO_JOURNAL", title: "Posted invoice has no journal", message: `${invoice.number} is marked sent but no ${reference} journal exists.`, reference: invoice.number, entityId: invoice.id });
      } else {
        const journal = matches[0];
        if (!nearZero(money(journal.total_debit) - total) || !nearZero(money(journal.total_credit) - total)) {
          findings.push({ severity: "critical", code: "INVOICE_JOURNAL_TOTAL_MISMATCH", title: "Invoice and journal totals differ", message: `${invoice.number}: invoice ${total.toFixed(2)} vs journal DR ${money(journal.total_debit).toFixed(2)} / CR ${money(journal.total_credit).toFixed(2)}.`, reference, entityId: invoice.id });
        }
      }
    }
  }

  const movementRefs = new Set((stock ?? []).map(movement => movement.reference).filter(Boolean));
  for (const invoice of invoices ?? []) {
    if (invoice.status === "sent") {
      const invoiceItems = itemsByInvoice.get(invoice.id) ?? [];
      for (const item of invoiceItems) {
        if (item.stock_item_id && !movementRefs.has(invoice.number)) {
          findings.push({ severity: "warning", code: "STOCK_MOVEMENT_MISSING", title: "Stock-linked invoice has no matching movement", message: `${invoice.number} contains stock item ${item.stock_item_id} but no movement references the invoice number.`, reference: invoice.number, entityId: invoice.id });
          break;
        }
      }
    }
  }

  counts.critical = findings.filter(f => f.severity === "critical").length;
  counts.warning = findings.filter(f => f.severity === "warning").length;
  counts.info = findings.filter(f => f.severity === "info").length;

  return { userId, generatedAt: new Date().toISOString(), counts, findings };
}
