/**
 * Smart Reporter insight generation.
 *
 * Insights are derived ONLY from the figures returned by the report that is
 * currently on screen (`ReportResult.facts`). Nothing here writes, posts,
 * adjusts or deletes anything — it is a read-only interpretation layer.
 *
 * Every insight separates FACT (what the data says) from INTERPRETATION
 * (what it probably means) so users are never misled.
 */

import type { ReportResult } from "./engine";
import { acctFmt } from "./engine";

export type Severity = "critical" | "warning" | "healthy" | "opportunity" | "info";

export type Insight = {
  id: string;
  severity: Severity;
  title: string;
  /** verifiable statement taken straight from the report figures */
  fact: string;
  /** what it likely means — explicitly an interpretation */
  interpretation: string;
  /** recommended next action, using existing SifoBooks workflows */
  action: string;
  confidence: "high" | "medium" | "low";
};

export type ReportId =
  | "trial-balance"
  | "general-ledger"
  | "pnl"
  | "balance-sheet"
  | "cashbook"
  | "ar-aging"
  | "ap-aging"
  | "stock-valuation"
  | "stock-movement"
  | "stock-reconciliation"
  | "sales-by-item"
  | "sales-by-customer"
  | "sales-by-branch"
  | "vat";

const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

export function buildInsights(reportId: ReportId, result: ReportResult): Insight[] {
  const f = result.facts;
  const out: Insight[] = [];

  if (!result.sufficient) {
    return [
      {
        id: "insufficient",
        severity: "info",
        title: "Not enough data to analyse",
        fact: "This report returned no rows for the selected period and filters.",
        interpretation: "Either nothing was recorded in this period, or the filters exclude the records.",
        action: "Widen the date range, clear filters, or capture and post the underlying transactions first.",
        confidence: "high",
      },
    ];
  }

  switch (reportId) {
    case "trial-balance": {
      const diff = n(f.difference);
      out.push(
        diff === 0
          ? {
              id: "tb-balanced",
              severity: "healthy",
              title: "Trial balance is in balance",
              fact: `Total debits ${acctFmt(n(f.totalDebit))} equal total credits ${acctFmt(n(f.totalCredit))} across ${n(f.accounts)} accounts.`,
              interpretation: "Double-entry integrity holds for all posted journals up to this date.",
              action: "Nothing required. Proceed to the Profit & Loss and Balance Sheet.",
              confidence: "high",
            }
          : {
              id: "tb-unbalanced",
              severity: "critical",
              title: "Trial balance does not balance",
              fact: `Debits ${acctFmt(n(f.totalDebit))} less credits ${acctFmt(n(f.totalCredit))} leaves a difference of ${acctFmt(diff)}.`,
              interpretation: "A posted journal is one-sided, or a line was posted to an account that no longer exists.",
              action: "Open General Ledger, sort by journal number, and review recent postings. Correct with a new journal — never edit history.",
              confidence: "high",
            },
      );
      if (n(f.accounts) < 5) {
        out.push({
          id: "tb-thin-coa",
          severity: "opportunity",
          title: "Very few accounts are in use",
          fact: `Only ${n(f.accounts)} account(s) carry posted movement.`,
          interpretation: "The chart of accounts is probably not yet fully mapped to real activity.",
          action: "Review the Chart of Accounts and map sales, cost of sales, VAT and bank accounts before relying on statements.",
          confidence: "medium",
        });
      }
      break;
    }

    case "general-ledger": {
      out.push({
        id: "gl-activity",
        severity: "info",
        title: "Ledger activity for the period",
        fact: `${n(f.lines)} posted lines: debits ${acctFmt(n(f.debits))}, credits ${acctFmt(n(f.credits))}, closing ${acctFmt(n(f.closing))}.`,
        interpretation: "This is the movement behind the trial balance figures for the selected scope.",
        action: "Click any row to open the source journal entry and verify supporting documents.",
        confidence: "high",
      });
      if (n(f.debits) !== n(f.credits) && !("account" in f)) {
        out.push({
          id: "gl-unbalanced",
          severity: "warning",
          title: "Period debits and credits differ",
          fact: `Debits ${acctFmt(n(f.debits))} vs credits ${acctFmt(n(f.credits))}.`,
          interpretation: "Expected when a single account is filtered; a concern when all accounts are shown.",
          action: "If no account filter is applied, run the Trial Balance to confirm overall integrity.",
          confidence: "medium",
        });
      }
      break;
    }

    case "pnl": {
      const rev = n(f.revenue);
      const cogs = n(f.cogs);
      const net = n(f.netProfit);
      out.push({
        id: "pnl-result",
        severity: net >= 0 ? "healthy" : "critical",
        title: net >= 0 ? "The period is profitable" : "The period is loss-making",
        fact: `Revenue ${acctFmt(rev)}, cost of sales ${acctFmt(cogs)}, operating expenses ${acctFmt(n(f.opex))}, net result ${acctFmt(net)}.`,
        interpretation: net >= 0 ? "Income covered costs in this period." : "Costs exceeded income in this period.",
        action: net >= 0 ? "Compare with the previous period to confirm the trend." : "Review the largest expense accounts in General Ledger and confirm nothing is misclassified.",
        confidence: "high",
      });
      if (rev > 0 && cogs === 0) {
        out.push({
          id: "pnl-no-cogs",
          severity: "warning",
          title: "Revenue recorded with no cost of sales",
          fact: `Revenue of ${acctFmt(rev)} was posted with cost of sales of zero.`,
          interpretation: "Cost of sales is probably not being posted from stock or POS, so gross profit is overstated.",
          action: "Check that stock items carry a cost price and that POS/inventory postings reach a cost of sales account.",
          confidence: "medium",
        });
      }
      if (rev > 0 && n(f.grossMargin) > 0.9 && cogs > 0) {
        out.push({
          id: "pnl-high-margin",
          severity: "opportunity",
          title: "Unusually high gross margin",
          fact: `Gross margin is ${(n(f.grossMargin) * 100).toFixed(1)}%.`,
          interpretation: "Either the business genuinely has high margins, or some costs are sitting in operating expenses instead of cost of sales.",
          action: "Review expense account classification against the Chart of Accounts reporting groups.",
          confidence: "low",
        });
      }
      break;
    }

    case "balance-sheet": {
      const diff = n(f.difference);
      out.push(
        diff === 0
          ? {
              id: "bs-balanced",
              severity: "healthy",
              title: "Balance sheet balances",
              fact: `Assets ${acctFmt(n(f.assets))} equal liabilities ${acctFmt(n(f.liabilities))} plus equity ${acctFmt(n(f.equity))}.`,
              interpretation: "The accounting equation holds for all posted entries at this date.",
              action: "No action needed.",
              confidence: "high",
            }
          : {
              id: "bs-unbalanced",
              severity: "critical",
              title: "Balance sheet does not balance",
              fact: `Assets less liabilities and equity leaves ${acctFmt(diff)}.`,
              interpretation: "Usually a one-sided journal, or accounts whose type is not classified as asset, liability or equity.",
              action: "Run the Trial Balance first, then check the Chart of Accounts for accounts with a missing or wrong account type.",
              confidence: "high",
            },
      );
      if (n(f.liabilities) > n(f.assets) && n(f.assets) > 0) {
        out.push({
          id: "bs-negative-equity",
          severity: "warning",
          title: "Liabilities exceed assets",
          fact: `Liabilities ${acctFmt(n(f.liabilities))} exceed assets ${acctFmt(n(f.assets))}.`,
          interpretation: "Equity is negative, which can indicate solvency pressure or unrecorded assets.",
          action: "Confirm that all bank, stock and receivable balances have been captured and posted.",
          confidence: "medium",
        });
      }
      break;
    }

    case "cashbook": {
      const closing = n(f.closing);
      out.push({
        id: "cash-position",
        severity: closing >= 0 ? "healthy" : "critical",
        title: closing >= 0 ? "Cash position is positive" : "Cash position is negative",
        fact: `Opening ${acctFmt(n(f.opening))}, receipts ${acctFmt(n(f.receipts))}, payments ${acctFmt(n(f.payments))}, closing ${acctFmt(closing)}.`,
        interpretation: closing >= 0 ? "The book balance covers the period's payments." : "The book balance is overdrawn, or receipts have not been captured.",
        action: closing >= 0 ? "Reconcile against the bank statement to confirm." : "Capture missing receipts and reconcile before reporting.",
        confidence: "high",
      });
      if (n(f.unreconciled) > 0) {
        out.push({
          id: "cash-unreconciled",
          severity: "warning",
          title: "Unreconciled bank items",
          fact: `${n(f.unreconciled)} transaction(s) in this period are not reconciled${n(f.unposted) ? `, ${n(f.unposted)} not yet posted` : ""}.`,
          interpretation: "The cash figure in the financial statements may not agree with the bank statement.",
          action: "Open Banking and run a reconciliation session for the period.",
          confidence: "high",
        });
      }
      break;
    }

    case "ar-aging": {
      const over90 = n(f.over90);
      out.push({
        id: "ar-total",
        severity: over90 > 0 ? "warning" : "healthy",
        title: "Receivables position",
        fact: `${acctFmt(n(f.outstanding))} outstanding across ${n(f.entities)} customer(s); ${acctFmt(n(f.overdue))} is overdue.`,
        interpretation: over90 > 0 ? "Some balances are long overdue and carry collection risk." : "Debtor book is current.",
        action: over90 > 0 ? "Send statements from Customer Statements and follow up 90+ day balances first." : "Keep issuing statements on schedule.",
        confidence: "high",
      });
      if (over90 > 0) {
        out.push({
          id: "ar-90",
          severity: "critical",
          title: "Debt older than 90 days",
          fact: `${acctFmt(over90)} has been outstanding for more than 90 days.`,
          interpretation: "These balances are at material risk of non-recovery and may need provisioning.",
          action: "Review each 90+ invoice, confirm it is genuinely owed, and agree a recovery or credit note decision with management.",
          confidence: "medium",
        });
      }
      break;
    }

    case "ap-aging": {
      out.push({
        id: "ap-total",
        severity: n(f.over90) > 0 ? "warning" : "healthy",
        title: "Payables position",
        fact: `${acctFmt(n(f.outstanding))} owed to ${n(f.entities)} supplier(s); ${acctFmt(n(f.overdue))} is overdue.`,
        interpretation: n(f.over90) > 0 ? "Long-overdue supplier balances risk supply interruption or penalties." : "Supplier balances are within terms.",
        action: n(f.over90) > 0 ? "Prioritise 90+ day suppliers in the next payment run." : "Maintain the current payment schedule.",
        confidence: "high",
      });
      break;
    }

    case "stock-valuation": {
      const value = n(f.totalValue);
      out.push({
        id: "stock-value",
        severity: value > 0 ? "healthy" : "warning",
        title: value > 0 ? "Stock is valued" : "Stock valuation is zero",
        fact: `${n(f.items)} item(s), total quantity ${n(f.totalQty).toFixed(2)}, total value ${acctFmt(value)}.`,
        interpretation: value > 0 ? "The inventory figure can be carried to the balance sheet." : "Either there is no stock, or no cost prices are recorded.",
        action: value > 0 ? "Agree this total to the inventory control account in the Trial Balance." : "Capture cost prices on stock items before valuing inventory.",
        confidence: "high",
      });
      if (n(f.missingCost) > 0) {
        out.push({
          id: "stock-missing-cost",
          severity: "warning",
          title: "Items hold stock with no cost",
          fact: `${n(f.missingCost)} item(s) have quantity on hand but no cost price.`,
          interpretation: "Their value is reported as zero, so total inventory is understated. No cost has been invented for them.",
          action: "Set the cost price on those items, or record a purchase/opening movement that carries cost.",
          confidence: "high",
        });
      }
      if (n(f.negative) > 0) {
        out.push({
          id: "stock-negative",
          severity: "critical",
          title: "Negative stock quantities",
          fact: `${n(f.negative)} item(s) show a negative quantity on hand.`,
          interpretation: "Issues or sales were recorded before the corresponding receipts.",
          action: "Run Stock Reconciliation for the affected items and capture the missing receipts through the normal workflow.",
          confidence: "high",
        });
      }
      break;
    }

    case "stock-movement": {
      out.push({
        id: "move-summary",
        severity: "info",
        title: "Movement summary",
        fact: `${n(f.movements)} movement(s): in ${n(f.inQty).toFixed(2)}, out ${n(f.outQty).toFixed(2)}, adjustments ${n(f.adjustedQty).toFixed(2)}.`,
        interpretation: "Adjustments represent quantity changes not explained by purchases, sales or transfers.",
        action: "Click a row to open the stock card for the item.",
        confidence: "high",
      });
      if (Math.abs(n(f.adjustedQty)) > 0) {
        out.push({
          id: "move-adjustments",
          severity: "warning",
          title: "Stock adjustments were made in this period",
          fact: `Net adjustment of ${n(f.adjustedQty).toFixed(2)} units.`,
          interpretation: "Adjustments often signal count differences, wastage or capture errors.",
          action: "Review the supporting stock counts and confirm each adjustment was authorised.",
          confidence: "medium",
        });
      }
      break;
    }

    case "stock-reconciliation": {
      const v = n(f.variances);
      out.push(
        v === 0
          ? {
              id: "recon-clean",
              severity: "healthy",
              title: "Stock agrees with movement history",
              fact: `All ${n(f.items)} item(s) match their expected closing quantity.`,
              interpretation: "Recorded movements fully explain current stock balances.",
              action: "No action required.",
              confidence: "high",
            }
          : {
              id: "recon-variance",
              severity: "critical",
              title: "Stock variances detected",
              fact: `${v} item(s) differ from expected, net variance ${n(f.netVariance).toFixed(2)} units.`,
              interpretation: "Movements are missing, duplicated or captured against the wrong location — or physical stock genuinely differs.",
              action: "Investigate each variance, then correct through a stock count or authorised adjustment. This report never adjusts stock itself.",
              confidence: "high",
            },
      );
      break;
    }

    case "sales-by-item":
    case "sales-by-customer":
    case "sales-by-branch": {
      const gross = n(f.gross);
      out.push({
        id: "sales-total",
        severity: gross > 0 ? "healthy" : "info",
        title: "Sales for the period",
        fact: `Gross sales ${acctFmt(gross)} from completed POS sales only.`,
        interpretation: "Held, voided and refunded sales are excluded, so this ties to revenue rather than till activity.",
        action: "Reconcile this total to the revenue lines in the Profit & Loss.",
        confidence: "high",
      });
      if (reportId === "sales-by-item" && n(f.cogs) === 0 && gross > 0) {
        out.push({
          id: "sales-no-cogs",
          severity: "warning",
          title: "No cost of sales on sold items",
          fact: `Sales of ${acctFmt(gross)} carry zero recorded unit cost.`,
          interpretation: "Margin cannot be measured and inventory will not relieve correctly.",
          action: "Set cost prices on stock items so POS captures unit cost at the time of sale.",
          confidence: "high",
        });
      }
      if (reportId === "sales-by-branch" && n(f.unassigned) > 0) {
        out.push({
          id: "sales-unassigned",
          severity: "warning",
          title: "Sales without a branch",
          fact: `${n(f.unassigned)} completed sale(s) are not linked to a branch or location.`,
          interpretation: "Branch performance reporting is incomplete.",
          action: "Assign a default location to each POS register so future sales carry a branch.",
          confidence: "high",
        });
      }
      break;
    }

    case "vat": {
      const diff = n(f.journalDifference);
      out.push({
        id: "vat-position",
        severity: "info",
        title: n(f.netVat) >= 0 ? "Net VAT is payable" : "Net VAT is refundable",
        fact: `Output VAT ${acctFmt(n(f.outputVat))} less input VAT ${acctFmt(n(f.inputVat))} gives ${acctFmt(Math.abs(n(f.netVat)))}.`,
        interpretation: "This is the position from source documents for the selected period.",
        action: "Agree these figures to the ZRA return before submission.",
        confidence: "high",
      });
      if (diff !== 0) {
        out.push({
          id: "vat-mismatch",
          severity: "critical",
          title: "Documents disagree with posted VAT journals",
          fact: `Documents show a net VAT of ${acctFmt(n(f.netVat))} while posted VAT control accounts show ${acctFmt(n(f.netVat) - diff)} — a difference of ${acctFmt(diff)}.`,
          interpretation: "Some VAT-bearing documents were not posted, or VAT was posted to a non-VAT account.",
          action: "Use the Posting Centre to confirm every invoice and bill in the period has been posted.",
          confidence: "medium",
        });
      }
      if (n(f.invoices) === 0 && n(f.bills) === 0) {
        out.push({
          id: "vat-nodocs",
          severity: "info",
          title: "No VAT documents in this period",
          fact: "No invoices or bills were dated in the selected period.",
          interpretation: "Insufficient data to assess VAT compliance.",
          action: "Select a period that contains trading activity.",
          confidence: "high",
        });
      }
      break;
    }
  }

  return out;
}
