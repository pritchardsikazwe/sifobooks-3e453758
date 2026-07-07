// IFRS-for-SME reporting classes used to compile the Annual Financial Statements.
// Each account in the Chart of Accounts should be mapped to one of these `reporting_group` keys.
// If not mapped, we fall back to account_type.

export type AfsGroup =
  | "asset.current.cash"
  | "asset.current.receivables"
  | "asset.current.inventory"
  | "asset.current.prepayments"
  | "asset.current.other"
  | "asset.noncurrent.ppe"
  | "asset.noncurrent.intangible"
  | "asset.noncurrent.investments"
  | "asset.noncurrent.other"
  | "liability.current.payables"
  | "liability.current.tax"
  | "liability.current.loans"
  | "liability.current.other"
  | "liability.noncurrent.loans"
  | "liability.noncurrent.other"
  | "equity.share_capital"
  | "equity.retained_earnings"
  | "equity.reserves"
  | "revenue.sales"
  | "revenue.other"
  | "expense.cogs"
  | "expense.operating"
  | "expense.admin"
  | "expense.finance"
  | "expense.tax";

export const AFS_GROUPS: { value: AfsGroup; label: string; parent: string }[] = [
  { value: "asset.current.cash", label: "Cash & cash equivalents", parent: "Current assets" },
  { value: "asset.current.receivables", label: "Trade & other receivables", parent: "Current assets" },
  { value: "asset.current.inventory", label: "Inventories", parent: "Current assets" },
  { value: "asset.current.prepayments", label: "Prepayments", parent: "Current assets" },
  { value: "asset.current.other", label: "Other current assets", parent: "Current assets" },
  { value: "asset.noncurrent.ppe", label: "Property, plant & equipment", parent: "Non-current assets" },
  { value: "asset.noncurrent.intangible", label: "Intangible assets", parent: "Non-current assets" },
  { value: "asset.noncurrent.investments", label: "Investments", parent: "Non-current assets" },
  { value: "asset.noncurrent.other", label: "Other non-current assets", parent: "Non-current assets" },
  { value: "liability.current.payables", label: "Trade & other payables", parent: "Current liabilities" },
  { value: "liability.current.tax", label: "Current tax payable", parent: "Current liabilities" },
  { value: "liability.current.loans", label: "Short-term borrowings", parent: "Current liabilities" },
  { value: "liability.current.other", label: "Other current liabilities", parent: "Current liabilities" },
  { value: "liability.noncurrent.loans", label: "Long-term borrowings", parent: "Non-current liabilities" },
  { value: "liability.noncurrent.other", label: "Other non-current liabilities", parent: "Non-current liabilities" },
  { value: "equity.share_capital", label: "Share capital", parent: "Equity" },
  { value: "equity.retained_earnings", label: "Retained earnings", parent: "Equity" },
  { value: "equity.reserves", label: "Reserves", parent: "Equity" },
  { value: "revenue.sales", label: "Revenue", parent: "Income" },
  { value: "revenue.other", label: "Other income", parent: "Income" },
  { value: "expense.cogs", label: "Cost of sales", parent: "Expenses" },
  { value: "expense.operating", label: "Operating expenses", parent: "Expenses" },
  { value: "expense.admin", label: "Administrative expenses", parent: "Expenses" },
  { value: "expense.finance", label: "Finance costs", parent: "Expenses" },
  { value: "expense.tax", label: "Income tax expense", parent: "Expenses" },
];

// Suggest a reporting group from account name / type so users can bulk-map.
export function suggestGroup(name: string, type: string): AfsGroup | null {
  const n = (name || "").toLowerCase();
  if (type === "asset") {
    if (/cash|bank|petty|mobile money|momo/.test(n)) return "asset.current.cash";
    if (/receivable|debtor|trade/.test(n)) return "asset.current.receivables";
    if (/stock|inventor|goods/.test(n)) return "asset.current.inventory";
    if (/prepay|deposit paid/.test(n)) return "asset.current.prepayments";
    if (/vehicle|equipment|furniture|building|land|machinery|ppe|plant|computer|asset - /.test(n)) return "asset.noncurrent.ppe";
    if (/software|goodwill|intangible|licen/.test(n)) return "asset.noncurrent.intangible";
    if (/investment|share in/.test(n)) return "asset.noncurrent.investments";
    return "asset.current.other";
  }
  if (type === "liability") {
    if (/payable|creditor|trade payab/.test(n)) return "liability.current.payables";
    if (/vat|paye|napsa|nhima|tax pay|zra/.test(n)) return "liability.current.tax";
    if (/overdraft|short.*loan|short.*borrow/.test(n)) return "liability.current.loans";
    if (/long.*loan|mortgage|bond/.test(n)) return "liability.noncurrent.loans";
    return "liability.current.other";
  }
  if (type === "equity") {
    if (/share|capital/.test(n)) return "equity.share_capital";
    if (/retain|accumulated|profit/.test(n)) return "equity.retained_earnings";
    return "equity.reserves";
  }
  if (type === "revenue") {
    if (/sales|revenue|turnover|fees/.test(n)) return "revenue.sales";
    return "revenue.other";
  }
  if (type === "expense") {
    if (/cost of|cogs|purchases|direct/.test(n)) return "expense.cogs";
    if (/salar|wage|payroll|rent|utilit|electric|water|internet|telephone|marketing|advert|fuel|transport|repair|maintenance/.test(n)) return "expense.operating";
    if (/admin|office|legal|professional|audit|consult|bank charge|subscription/.test(n)) return "expense.admin";
    if (/interest|finance/.test(n)) return "expense.finance";
    if (/income tax|corporate tax/.test(n)) return "expense.tax";
    return "expense.operating";
  }
  return null;
}

export type AfsLine = {
  code: string;
  name: string;
  type: string;
  group: AfsGroup | null;
  balance: number;
};

export type AfsPayload = {
  fiscalYear: number;
  periodEnd: string;
  currency: string;
  companyName: string;
  sfp: { current_assets: AfsLine[]; noncurrent_assets: AfsLine[]; current_liab: AfsLine[]; noncurrent_liab: AfsLine[]; equity: AfsLine[]; totals: any };
  soci: { revenue: AfsLine[]; cogs: AfsLine[]; operating: AfsLine[]; admin: AfsLine[]; finance: AfsLine[]; tax: AfsLine[]; totals: any };
  ratios: Record<string, number>;
};

const num = (v: any) => Number(v ?? 0) || 0;

export function computeAfs(
  lines: Array<{ debit: any; credit: any; account: any }>,
  fiscalYear: number,
  periodEnd: string,
  currency: string,
  companyName: string,
): AfsPayload {
  const byAcc = new Map<string, AfsLine>();
  lines.forEach((l) => {
    const a = l.account;
    if (!a) return;
    const k = a.account_code + "|" + a.account_name;
    const cur = byAcc.get(k) ?? {
      code: a.account_code,
      name: a.account_name,
      type: a.account_type,
      group: (a.reporting_group as AfsGroup | null) ?? suggestGroup(a.account_name, a.account_type),
      balance: 0,
    };
    const drNormal = ["asset", "expense"].includes(a.account_type);
    cur.balance += drNormal ? num(l.debit) - num(l.credit) : num(l.credit) - num(l.debit);
    byAcc.set(k, cur);
  });
  const all = Array.from(byAcc.values());

  const pick = (g: string) => all.filter((r) => (r.group ?? "").startsWith(g));
  const sum = (arr: AfsLine[]) => arr.reduce((s, r) => s + r.balance, 0);

  const current_assets = pick("asset.current");
  const noncurrent_assets = pick("asset.noncurrent");
  const current_liab = pick("liability.current");
  const noncurrent_liab = pick("liability.noncurrent");
  const equity = pick("equity");
  const revenue = all.filter((r) => (r.group ?? "").startsWith("revenue"));
  const cogs = all.filter((r) => r.group === "expense.cogs");
  const operating = all.filter((r) => r.group === "expense.operating");
  const admin = all.filter((r) => r.group === "expense.admin");
  const finance = all.filter((r) => r.group === "expense.finance");
  const tax = all.filter((r) => r.group === "expense.tax");

  const totalRevenue = sum(revenue);
  const totalCogs = sum(cogs);
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = sum(operating) + sum(admin);
  const operatingProfit = grossProfit - totalOpex;
  const profitBeforeTax = operatingProfit - sum(finance);
  const netProfit = profitBeforeTax - sum(tax);

  const totalCurrentAssets = sum(current_assets);
  const totalNonCurrentAssets = sum(noncurrent_assets);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
  const totalCurrentLiab = sum(current_liab);
  const totalNonCurrentLiab = sum(noncurrent_liab);
  const totalLiab = totalCurrentLiab + totalNonCurrentLiab;
  const totalEquity = sum(equity) + netProfit;

  const ratios = {
    grossMargin: totalRevenue ? grossProfit / totalRevenue : 0,
    netMargin: totalRevenue ? netProfit / totalRevenue : 0,
    currentRatio: totalCurrentLiab ? totalCurrentAssets / totalCurrentLiab : 0,
    quickRatio: totalCurrentLiab
      ? (totalCurrentAssets - sum(all.filter((r) => r.group === "asset.current.inventory"))) / totalCurrentLiab
      : 0,
    debtToEquity: totalEquity ? totalLiab / totalEquity : 0,
    returnOnAssets: totalAssets ? netProfit / totalAssets : 0,
  };

  return {
    fiscalYear,
    periodEnd,
    currency,
    companyName,
    sfp: {
      current_assets,
      noncurrent_assets,
      current_liab,
      noncurrent_liab,
      equity,
      totals: {
        totalCurrentAssets,
        totalNonCurrentAssets,
        totalAssets,
        totalCurrentLiab,
        totalNonCurrentLiab,
        totalLiab,
        totalEquity,
        netProfit,
      },
    },
    soci: {
      revenue, cogs, operating, admin, finance, tax,
      totals: { totalRevenue, totalCogs, grossProfit, totalOpex, operatingProfit, profitBeforeTax, netProfit },
    },
    ratios,
  };
}

export function afsFactSheet(p: AfsPayload): string {
  const f = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => (n * 100).toFixed(1) + "%";
  const t = p.soci.totals; const s = p.sfp.totals; const r = p.ratios;
  return `Company: ${p.companyName}
Fiscal year: ${p.fiscalYear}
Period end: ${p.periodEnd}
Currency: ${p.currency}

INCOME STATEMENT
Revenue: ${f(t.totalRevenue)}
Cost of sales: ${f(t.totalCogs)}
Gross profit: ${f(t.grossProfit)} (margin ${pct(r.grossMargin)})
Operating expenses: ${f(t.totalOpex)}
Operating profit: ${f(t.operatingProfit)}
Finance costs: ${f(p.soci.finance.reduce((a, x) => a + x.balance, 0))}
Profit before tax: ${f(t.profitBeforeTax)}
Income tax: ${f(p.soci.tax.reduce((a, x) => a + x.balance, 0))}
Net profit: ${f(t.netProfit)} (margin ${pct(r.netMargin)})

BALANCE SHEET
Current assets: ${f(s.totalCurrentAssets)}
Non-current assets: ${f(s.totalNonCurrentAssets)}
Total assets: ${f(s.totalAssets)}
Current liabilities: ${f(s.totalCurrentLiab)}
Non-current liabilities: ${f(s.totalNonCurrentLiab)}
Total liabilities: ${f(s.totalLiab)}
Total equity: ${f(s.totalEquity)}

RATIOS
Current ratio: ${r.currentRatio.toFixed(2)}
Quick ratio: ${r.quickRatio.toFixed(2)}
Debt-to-equity: ${r.debtToEquity.toFixed(2)}
Return on assets: ${pct(r.returnOnAssets)}
`;
}
