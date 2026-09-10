/**
 * SifoBooks report engine.
 *
 * Every loader here queries the CURRENT authenticated tenant's real data through
 * the standard Supabase client, so existing RLS / user_id tenant isolation applies.
 * No mock data, no seeding, no writes — all loaders are strictly read-only.
 *
 * Accounting rules enforced here:
 *  - Only journal entries with status = 'posted' feed financial statements.
 *  - Trial Balance / GL / P&L / Balance Sheet totals come from journal_lines.
 *  - Money is accumulated in integer minor units (ngwee) to avoid float drift.
 */

import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ColumnAlign = "left" | "right" | "center";

export type ReportColumn = {
  key: string;
  label: string;
  align?: ColumnAlign;
  /** money columns are formatted with 2dp accounting style and right aligned */
  money?: boolean;
  numeric?: boolean;
  /** hidden by default in the column-visibility menu */
  defaultHidden?: boolean;
  /** minimum priority to keep on small screens (1 = always show) */
  priority?: number;
};

export type ReportRow = Record<string, unknown> & {
  /** drill-down target — an existing app route */
  _link?: string;
  /** visual emphasis for subtotal / total rows */
  _emphasis?: "subtotal" | "total" | "warn";
};

export type SummaryStat = {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "bad";
  hint?: string;
};

export type ReportResult = {
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: SummaryStat[];
  /** notes shown under the summary — data limitations, exclusions, etc. */
  notes: string[];
  /** false => render the "not enough data" state instead of an empty table */
  sufficient: boolean;
  /** free-form figures used by the Smart Reporter */
  facts: Record<string, number | string | boolean | null>;
};

export type PeriodParams = { from: string; to: string };

/* ------------------------------------------------------------------ */
/* Money helpers (integer minor units)                                 */
/* ------------------------------------------------------------------ */

/** number -> integer minor units (ngwee), half-up */
export const toMinor = (v: unknown): number => {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
};
/** integer minor units -> major units number */
export const toMajor = (m: number): number => m / 100;

export const nf = new Intl.NumberFormat("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** accounting format: negatives in brackets */
export const acctFmt = (v: number | null | undefined, blankZero = false): string => {
  if (v == null || !isFinite(Number(v))) return "";
  const n = Number(v);
  if (blankZero && Math.abs(n) < 0.005) return "";
  return n < 0 ? `(${nf.format(Math.abs(n))})` : nf.format(n);
};

export const qty = (v: unknown, dp = 2): string => {
  const n = Number(v ?? 0);
  return isFinite(n) ? n.toFixed(dp) : "0.00";
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return isFinite(n) ? n : 0;
};

const daysBetween = (a: string, b: string) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const AGE_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

export function bucketFor(dueDate: string | null | undefined, asAt: string): AgeBucket {
  if (!dueDate) return "current";
  const d = daysBetween(dueDate, asAt);
  if (d <= 0) return "current";
  if (d <= 30) return "1-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  return "90+";
}

/* ------------------------------------------------------------------ */
/* Shared journal fetch                                                */
/* ------------------------------------------------------------------ */

export type PostedLine = {
  entryId: string;
  entryNumber: string | null;
  entryDate: string;
  reference: string | null;
  entryDescription: string | null;
  lineDescription: string | null;
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  accountType: string | null;
  reportingClass: string | null;
  debitMinor: number;
  creditMinor: number;
};

/** Chunked `.in()` so large tenants don't blow the URL length. */
async function fetchLinesForEntries(entryIds: string[]) {
  const out: any[] = [];
  const size = 200;
  for (let i = 0; i < entryIds.length; i += size) {
    const slice = entryIds.slice(i, i + size);
    const { data, error } = await supabase
      .from("journal_lines")
      .select("id,entry_id,account_id,description,debit,credit,account:account_id(account_code,account_name,account_type,reporting_class)")
      .in("entry_id", slice);
    if (error) throw error;
    out.push(...(data ?? []));
  }
  return out;
}

/** All POSTED journal lines within an (optional) date window. */
export async function loadPostedLines(opts: { from?: string; to: string }): Promise<PostedLine[]> {
  let q = supabase
    .from("journal_entries")
    .select("id,entry_number,entry_date,reference,description,status")
    .eq("status", "posted")
    .lte("entry_date", opts.to);
  if (opts.from) q = q.gte("entry_date", opts.from);
  const { data: entries, error } = await q.order("entry_date");
  if (error) throw error;
  const list = entries ?? [];
  if (!list.length) return [];

  const byId = new Map(list.map((e: any) => [e.id, e]));
  const lines = await fetchLinesForEntries(list.map((e: any) => e.id));

  return lines.map((l: any) => {
    const e: any = byId.get(l.entry_id) ?? {};
    return {
      entryId: l.entry_id,
      entryNumber: e.entry_number ?? null,
      entryDate: e.entry_date ?? "",
      reference: e.reference ?? null,
      entryDescription: e.description ?? null,
      lineDescription: l.description ?? null,
      accountId: l.account_id ?? null,
      accountCode: l.account?.account_code ?? null,
      accountName: l.account?.account_name ?? null,
      accountType: (l.account?.account_type ?? null) as string | null,
      reportingClass: l.account?.reporting_class ?? null,
      debitMinor: toMinor(l.debit),
      creditMinor: toMinor(l.credit),
    };
  });
}

const typeOf = (t: string | null) => (t ?? "").toLowerCase();
const isRevenue = (t: string | null) => ["revenue", "income", "sales"].includes(typeOf(t));
const isExpense = (t: string | null) => ["expense", "expenses", "cost of sales", "cogs"].includes(typeOf(t));
const isAsset = (t: string | null) => typeOf(t).startsWith("asset");
const isLiability = (t: string | null) => typeOf(t).startsWith("liab");
const isEquity = (t: string | null) => typeOf(t).startsWith("equity");
/** COGS detection uses account code 5xxx or an explicit name/class hint. */
const isCogs = (code: string | null, name: string | null, cls: string | null) => {
  const c = (code ?? "").trim();
  const hay = `${name ?? ""} ${cls ?? ""}`.toLowerCase();
  return /^5/.test(c) || hay.includes("cost of sale") || hay.includes("cost of good") || hay.includes("cogs");
};

/* ------------------------------------------------------------------ */
/* 1. Trial Balance                                                    */
/* ------------------------------------------------------------------ */

export async function loadTrialBalance(p: { to: string }): Promise<ReportResult> {
  const lines = await loadPostedLines({ to: p.to });
  type Acc = { id: string | null; code: string; name: string; type: string; dr: number; cr: number };
  const map = new Map<string, Acc>();

  for (const l of lines) {
    const key = l.accountId ?? `${l.accountCode}|${l.accountName}`;
    const cur = map.get(key) ?? {
      id: l.accountId,
      code: l.accountCode ?? "—",
      name: l.accountName ?? "(unmapped account)",
      type: l.accountType ?? "",
      dr: 0,
      cr: 0,
    };
    cur.dr += l.debitMinor;
    cur.cr += l.creditMinor;
    map.set(key, cur);
  }

  const accs = [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  let totalDr = 0;
  let totalCr = 0;
  const rows: ReportRow[] = accs.map((a) => {
    const net = a.dr - a.cr;
    totalDr += a.dr;
    totalCr += a.cr;
    return {
      code: a.code,
      account: a.name,
      type: a.type,
      debit: toMajor(a.dr),
      credit: toMajor(a.cr),
      balance: toMajor(net),
      _link: a.id ? `/reports/general-ledger?account=${a.id}` : undefined,
    };
  });

  const diffMinor = totalDr - totalCr;
  const balanced = diffMinor === 0;

  return {
    columns: [
      { key: "code", label: "Code", priority: 1 },
      { key: "account", label: "Account", priority: 1 },
      { key: "type", label: "Type", priority: 3 },
      { key: "debit", label: "Debit", money: true, priority: 1 },
      { key: "credit", label: "Credit", money: true, priority: 1 },
      { key: "balance", label: "Balance", money: true, priority: 2 },
    ],
    rows,
    summary: [
      { label: "Accounts", value: String(rows.length) },
      { label: "Total debits", value: acctFmt(toMajor(totalDr)) },
      { label: "Total credits", value: acctFmt(toMajor(totalCr)) },
      {
        label: "Difference",
        value: acctFmt(toMajor(diffMinor)),
        tone: balanced ? "good" : "bad",
        hint: balanced ? "Debits equal credits" : "Ledger is out of balance",
      },
    ],
    notes: ["Posted journal entries only. Draft and reversed-out entries are excluded."],
    sufficient: rows.length > 0,
    facts: {
      accounts: rows.length,
      totalDebit: toMajor(totalDr),
      totalCredit: toMajor(totalCr),
      difference: toMajor(diffMinor),
      balanced,
      asAt: p.to,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 2. General Ledger                                                   */
/* ------------------------------------------------------------------ */

export async function loadGeneralLedger(p: PeriodParams & { accountId?: string }): Promise<ReportResult> {
  const all = await loadPostedLines({ to: p.to });
  const filtered = all
    .filter((l) => (p.accountId ? l.accountId === p.accountId : true))
    .sort((a, b) =>
      a.entryDate === b.entryDate
        ? (a.entryNumber ?? "").localeCompare(b.entryNumber ?? "")
        : a.entryDate.localeCompare(b.entryDate),
    );

  // Opening balance = movement strictly before `from` (per selected account scope)
  let openingMinor = 0;
  const inPeriod: PostedLine[] = [];
  for (const l of filtered) {
    if (l.entryDate < p.from) openingMinor += l.debitMinor - l.creditMinor;
    else inPeriod.push(l);
  }

  let running = openingMinor;
  let dr = 0;
  let cr = 0;
  const rows: ReportRow[] = [
    {
      date: p.from,
      entry: "",
      reference: "",
      description: "Opening balance",
      account: p.accountId ? (filtered[0]?.accountName ?? "") : "All accounts",
      debit: null,
      credit: null,
      running: toMajor(openingMinor),
      _emphasis: "subtotal",
    },
  ];

  for (const l of inPeriod) {
    running += l.debitMinor - l.creditMinor;
    dr += l.debitMinor;
    cr += l.creditMinor;
    rows.push({
      date: l.entryDate,
      entry: l.entryNumber ?? "",
      reference: l.reference ?? "",
      description: l.lineDescription || l.entryDescription || "",
      account: `${l.accountCode ?? ""} ${l.accountName ?? ""}`.trim(),
      debit: l.debitMinor ? toMajor(l.debitMinor) : null,
      credit: l.creditMinor ? toMajor(l.creditMinor) : null,
      running: toMajor(running),
      _link: `/journal-entry/${l.entryId}`,
    });
  }

  return {
    columns: [
      { key: "date", label: "Date", priority: 1 },
      { key: "entry", label: "Journal #", priority: 2 },
      { key: "reference", label: "Reference", priority: 3 },
      { key: "description", label: "Description", priority: 2 },
      { key: "account", label: "Account", priority: 1 },
      { key: "debit", label: "Debit", money: true, priority: 1 },
      { key: "credit", label: "Credit", money: true, priority: 1 },
      { key: "running", label: "Running balance", money: true, priority: 2 },
    ],
    rows,
    summary: [
      { label: "Opening", value: acctFmt(toMajor(openingMinor)) },
      { label: "Debits", value: acctFmt(toMajor(dr)) },
      { label: "Credits", value: acctFmt(toMajor(cr)) },
      { label: "Closing", value: acctFmt(toMajor(running)) },
      { label: "Entries", value: String(inPeriod.length) },
    ],
    notes: [
      "Posted journal lines only. Click any row to open the source journal entry.",
      p.accountId ? "Filtered to a single account." : "All accounts included — filter by account for a classic ledger view.",
    ],
    sufficient: inPeriod.length > 0,
    facts: {
      opening: toMajor(openingMinor),
      debits: toMajor(dr),
      credits: toMajor(cr),
      closing: toMajor(running),
      lines: inPeriod.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 3. Profit & Loss                                                    */
/* ------------------------------------------------------------------ */

export async function loadProfitAndLoss(p: PeriodParams): Promise<ReportResult> {
  const lines = (await loadPostedLines({ to: p.to })).filter((l) => l.entryDate >= p.from);

  type Acc = { code: string; name: string; group: "revenue" | "cogs" | "opex"; amount: number; accountId: string | null };
  const map = new Map<string, Acc>();

  for (const l of lines) {
    let group: Acc["group"] | null = null;
    let amount = 0;
    if (isRevenue(l.accountType)) {
      group = "revenue";
      amount = l.creditMinor - l.debitMinor;
    } else if (isExpense(l.accountType)) {
      group = isCogs(l.accountCode, l.accountName, l.reportingClass) ? "cogs" : "opex";
      amount = l.debitMinor - l.creditMinor;
    }
    if (!group) continue;
    const key = l.accountId ?? `${l.accountCode}|${l.accountName}`;
    const cur =
      map.get(key) ?? { code: l.accountCode ?? "—", name: l.accountName ?? "(unmapped)", group, amount: 0, accountId: l.accountId };
    cur.amount += amount;
    map.set(key, cur);
  }

  const accs = [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  const sum = (g: Acc["group"]) => accs.filter((a) => a.group === g).reduce((s, a) => s + a.amount, 0);
  const revenue = sum("revenue");
  const cogs = sum("cogs");
  const opex = sum("opex");
  const gross = revenue - cogs;
  const net = gross - opex;

  const section = (label: string, g: Acc["group"], total: number): ReportRow[] => {
    const body = accs
      .filter((a) => a.group === g)
      .map<ReportRow>((a) => ({
        section: label,
        code: a.code,
        account: a.name,
        amount: toMajor(a.amount),
        _link: a.accountId ? `/reports/general-ledger?account=${a.accountId}&from=${p.from}&to=${p.to}` : undefined,
      }));
    return [...body, { section: label, code: "", account: `Total ${label}`, amount: toMajor(total), _emphasis: "subtotal" }];
  };

  const rows: ReportRow[] = [
    ...section("Revenue", "revenue", revenue),
    ...section("Cost of sales", "cogs", cogs),
    { section: "Gross profit", code: "", account: "Gross profit", amount: toMajor(gross), _emphasis: "total" },
    ...section("Operating expenses", "opex", opex),
    { section: "Net result", code: "", account: net >= 0 ? "Net profit" : "Net loss", amount: toMajor(net), _emphasis: "total" },
  ];

  const notes = ["Posted journal entries only, for the selected period."];
  if (cogs === 0 && revenue !== 0) notes.push("No cost of sales was posted in this period — gross profit equals revenue.");

  return {
    columns: [
      { key: "section", label: "Section", priority: 2 },
      { key: "code", label: "Code", priority: 3 },
      { key: "account", label: "Account", priority: 1 },
      { key: "amount", label: "Amount", money: true, priority: 1 },
    ],
    rows,
    summary: [
      { label: "Revenue", value: acctFmt(toMajor(revenue)) },
      { label: "Cost of sales", value: acctFmt(toMajor(cogs)) },
      { label: "Gross profit", value: acctFmt(toMajor(gross)), tone: gross >= 0 ? "good" : "bad" },
      { label: "Operating expenses", value: acctFmt(toMajor(opex)) },
      { label: net >= 0 ? "Net profit" : "Net loss", value: acctFmt(toMajor(net)), tone: net >= 0 ? "good" : "bad" },
    ],
    notes,
    sufficient: accs.length > 0,
    facts: {
      revenue: toMajor(revenue),
      cogs: toMajor(cogs),
      grossProfit: toMajor(gross),
      opex: toMajor(opex),
      netProfit: toMajor(net),
      grossMargin: revenue ? gross / revenue : 0,
      from: p.from,
      to: p.to,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 4. Balance Sheet                                                    */
/* ------------------------------------------------------------------ */

export async function loadBalanceSheet(p: { to: string; fyStart?: string }): Promise<ReportResult> {
  const lines = await loadPostedLines({ to: p.to });
  const fyStart = p.fyStart ?? `${p.to.slice(0, 4)}-01-01`;

  type Acc = { code: string; name: string; group: "asset" | "liability" | "equity"; amount: number; accountId: string | null };
  const map = new Map<string, Acc>();
  let currentResult = 0; // profit for the current financial year
  let retained = 0; // accumulated result before the current financial year

  for (const l of lines) {
    if (isRevenue(l.accountType) || isExpense(l.accountType)) {
      const profit = isRevenue(l.accountType)
        ? l.creditMinor - l.debitMinor
        : -(l.debitMinor - l.creditMinor);
      if (l.entryDate >= fyStart) currentResult += profit;
      else retained += profit;
      continue;
    }
    let group: Acc["group"] | null = null;
    let amount = 0;
    if (isAsset(l.accountType)) {
      group = "asset";
      amount = l.debitMinor - l.creditMinor;
    } else if (isLiability(l.accountType)) {
      group = "liability";
      amount = l.creditMinor - l.debitMinor;
    } else if (isEquity(l.accountType)) {
      group = "equity";
      amount = l.creditMinor - l.debitMinor;
    }
    if (!group) continue;
    const key = l.accountId ?? `${l.accountCode}|${l.accountName}`;
    const cur =
      map.get(key) ?? { code: l.accountCode ?? "—", name: l.accountName ?? "(unmapped)", group, amount: 0, accountId: l.accountId };
    cur.amount += amount;
    map.set(key, cur);
  }

  const accs = [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  const sum = (g: Acc["group"]) => accs.filter((a) => a.group === g).reduce((s, a) => s + a.amount, 0);
  const assets = sum("asset");
  const liabilities = sum("liability");
  const equityAccounts = sum("equity");
  const equity = equityAccounts + retained + currentResult;
  const diff = assets - (liabilities + equity);

  const section = (label: string, g: Acc["group"], extra: ReportRow[], total: number): ReportRow[] => [
    ...accs
      .filter((a) => a.group === g)
      .map<ReportRow>((a) => ({
        section: label,
        code: a.code,
        account: a.name,
        amount: toMajor(a.amount),
        _link: a.accountId ? `/reports/general-ledger?account=${a.accountId}` : undefined,
      })),
    ...extra,
    { section: label, code: "", account: `Total ${label}`, amount: toMajor(total), _emphasis: "subtotal" },
  ];

  const rows: ReportRow[] = [
    ...section("Assets", "asset", [], assets),
    ...section("Liabilities", "liability", [], liabilities),
    ...section(
      "Equity",
      "equity",
      [
        { section: "Equity", code: "", account: "Retained earnings (prior years)", amount: toMajor(retained) },
        { section: "Equity", code: "", account: "Current period result", amount: toMajor(currentResult) },
      ],
      equity,
    ),
    {
      section: "Check",
      code: "",
      account: "Assets − (Liabilities + Equity)",
      amount: toMajor(diff),
      _emphasis: diff === 0 ? "total" : "warn",
    },
  ];

  return {
    columns: [
      { key: "section", label: "Section", priority: 2 },
      { key: "code", label: "Code", priority: 3 },
      { key: "account", label: "Account", priority: 1 },
      { key: "amount", label: "Amount", money: true, priority: 1 },
    ],
    rows,
    summary: [
      { label: "Assets", value: acctFmt(toMajor(assets)) },
      { label: "Liabilities", value: acctFmt(toMajor(liabilities)) },
      { label: "Equity", value: acctFmt(toMajor(equity)) },
      { label: "Current period result", value: acctFmt(toMajor(currentResult)), tone: currentResult >= 0 ? "good" : "bad" },
      { label: "Difference", value: acctFmt(toMajor(diff)), tone: diff === 0 ? "good" : "bad" },
    ],
    notes: [
      `Posted journal entries as at ${p.to}. Financial year assumed to start ${fyStart}.`,
      "Retained earnings are derived from posted revenue and expense entries before the financial year start.",
    ],
    sufficient: accs.length > 0 || retained !== 0 || currentResult !== 0,
    facts: {
      assets: toMajor(assets),
      liabilities: toMajor(liabilities),
      equity: toMajor(equity),
      retained: toMajor(retained),
      currentResult: toMajor(currentResult),
      difference: toMajor(diff),
      balanced: diff === 0,
      asAt: p.to,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 5. Cashbook / Bank                                                  */
/* ------------------------------------------------------------------ */

export async function loadCashbook(p: PeriodParams & { bankAccountId?: string }): Promise<ReportResult> {
  const [{ data: accounts, error: accErr }, { data: books }] = await Promise.all([
    supabase.from("bank_accounts").select("id,name,bank_name,account_number,currency,opening_balance,opening_date,is_active"),
    supabase.from("cashbooks").select("id,code,name,cashbook_type,bank_account_id,currency,opening_balance,is_active"),
  ]);
  if (accErr) throw accErr;

  let q = supabase
    .from("bank_transactions")
    .select("id,txn_date,description,reference,amount,payee,bank_account_id,status,is_posted,is_cleared,reconciled,is_allocated,allocated_amount")
    .lte("txn_date", p.to)
    .order("txn_date");
  if (p.bankAccountId) q = q.eq("bank_account_id", p.bankAccountId);
  const { data: txns, error } = await q;
  if (error) throw error;

  const accById = new Map((accounts ?? []).map((a: any) => [a.id, a]));
  const scoped = (accounts ?? []).filter((a: any) => (p.bankAccountId ? a.id === p.bankAccountId : true));

  let openingMinor = scoped.reduce((s: number, a: any) => s + toMinor(a.opening_balance), 0);
  const rows: ReportRow[] = [];
  let receipts = 0;
  let payments = 0;
  let unreconciled = 0;
  let unposted = 0;

  const before = (txns ?? []).filter((t: any) => t.txn_date < p.from);
  for (const t of before) openingMinor += toMinor(t.amount);

  let running = openingMinor;
  rows.push({
    date: p.from,
    account: p.bankAccountId ? (accById.get(p.bankAccountId) as any)?.name ?? "" : "All cash & bank",
    reference: "",
    description: "Opening balance",
    receipt: null,
    payment: null,
    balance: toMajor(openingMinor),
    status: "",
    _emphasis: "subtotal",
  });

  for (const t of (txns ?? []).filter((x: any) => x.txn_date >= p.from)) {
    const m = toMinor(t.amount);
    running += m;
    if (m >= 0) receipts += m;
    else payments += -m;
    if (!t.reconciled) unreconciled += 1;
    if (!t.is_posted) unposted += 1;
    rows.push({
      date: t.txn_date,
      account: (accById.get(t.bank_account_id) as any)?.name ?? "—",
      reference: t.reference ?? t.payee ?? "",
      description: t.description ?? "",
      receipt: m > 0 ? toMajor(m) : null,
      payment: m < 0 ? toMajor(-m) : null,
      balance: toMajor(running),
      status: t.reconciled ? "Reconciled" : t.is_posted ? "Posted" : "Unposted",
      _link: "/banking",
    });
  }

  const body = rows.length - 1;
  return {
    columns: [
      { key: "date", label: "Date", priority: 1 },
      { key: "account", label: "Cash / bank account", priority: 2 },
      { key: "reference", label: "Reference", priority: 3 },
      { key: "description", label: "Description", priority: 1 },
      { key: "receipt", label: "Receipts", money: true, priority: 1 },
      { key: "payment", label: "Payments", money: true, priority: 1 },
      { key: "balance", label: "Balance", money: true, priority: 2 },
      { key: "status", label: "Status", priority: 3 },
    ],
    rows,
    summary: [
      { label: "Opening", value: acctFmt(toMajor(openingMinor)) },
      { label: "Receipts", value: acctFmt(toMajor(receipts)), tone: "good" },
      { label: "Payments", value: acctFmt(toMajor(payments)) },
      { label: "Closing", value: acctFmt(toMajor(running)), tone: running >= 0 ? "good" : "bad" },
      { label: "Unreconciled items", value: String(unreconciled), tone: unreconciled ? "warn" : "good" },
    ],
    notes: [
      "Opening balance = bank account opening balance plus all transactions dated before the period start.",
      `${(books ?? []).length} cashbook(s) configured; ${(accounts ?? []).length} bank/cash account(s).`,
    ],
    sufficient: body > 0 || (accounts ?? []).length > 0,
    facts: {
      opening: toMajor(openingMinor),
      receipts: toMajor(receipts),
      payments: toMajor(payments),
      closing: toMajor(running),
      unreconciled,
      unposted,
      transactions: body,
      accounts: (accounts ?? []).length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 6 & 7. AR / AP aging                                                */
/* ------------------------------------------------------------------ */

function agingResult(
  entityLabel: string,
  docLabel: string,
  docs: { entity: string; docNo: string; date: string; due: string | null; total: number; balance: number; link?: string }[],
  asAt: string,
): ReportResult {
  type Row = { entity: string; buckets: Record<AgeBucket, number>; total: number };
  const map = new Map<string, Row>();
  const detail: ReportRow[] = [];
  for (const d of docs) {
    const b = bucketFor(d.due ?? d.date, asAt);
    const row = map.get(d.entity) ?? {
      entity: d.entity,
      buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      total: 0,
    };
    const minor = toMinor(d.balance);
    row.buckets[b] += minor;
    row.total += minor;
    map.set(d.entity, row);
    detail.push({
      entity: d.entity,
      document: d.docNo,
      date: d.date,
      due: d.due ?? "",
      bucket: b,
      total: d.total,
      balance: d.balance,
      _link: d.link,
    });
  }

  const grouped = [...map.values()].sort((a, b) => b.total - a.total);
  const rows: ReportRow[] = grouped.map((g) => ({
    entity: g.entity,
    current: toMajor(g.buckets.current),
    "1-30": toMajor(g.buckets["1-30"]),
    "31-60": toMajor(g.buckets["31-60"]),
    "61-90": toMajor(g.buckets["61-90"]),
    "90+": toMajor(g.buckets["90+"]),
    total: toMajor(g.total),
  }));

  const tot = (k: AgeBucket) => grouped.reduce((s, g) => s + g.buckets[k], 0);
  const grand = grouped.reduce((s, g) => s + g.total, 0);
  const overdue = grand - tot("current");

  if (rows.length) {
    rows.push({
      entity: "Total",
      current: toMajor(tot("current")),
      "1-30": toMajor(tot("1-30")),
      "31-60": toMajor(tot("31-60")),
      "61-90": toMajor(tot("61-90")),
      "90+": toMajor(tot("90+")),
      total: toMajor(grand),
      _emphasis: "total",
    });
  }

  return {
    columns: [
      { key: "entity", label: entityLabel, priority: 1 },
      { key: "current", label: "Current", money: true, priority: 2 },
      { key: "1-30", label: "1–30 days", money: true, priority: 1 },
      { key: "31-60", label: "31–60 days", money: true, priority: 2 },
      { key: "61-90", label: "61–90 days", money: true, priority: 2 },
      { key: "90+", label: "90+ days", money: true, priority: 1 },
      { key: "total", label: "Total outstanding", money: true, priority: 1 },
    ],
    rows,
    summary: [
      { label: entityLabel + "s", value: String(grouped.length) },
      { label: "Outstanding", value: acctFmt(toMajor(grand)) },
      { label: "Overdue", value: acctFmt(toMajor(overdue)), tone: overdue > 0 ? "warn" : "good" },
      { label: "90+ days", value: acctFmt(toMajor(tot("90+"))), tone: tot("90+") > 0 ? "bad" : "good" },
    ],
    notes: [`Open ${docLabel} as at ${asAt}, aged on due date where present.`],
    sufficient: docs.length > 0,
    facts: {
      outstanding: toMajor(grand),
      overdue: toMajor(overdue),
      over90: toMajor(tot("90+")),
      current: toMajor(tot("current")),
      documents: docs.length,
      entities: grouped.length,
      overduePct: grand ? overdue / grand : 0,
    },
  };
}

export async function loadArAging(p: { to: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id,number,issue_date,due_date,total,balance_due,status,customer:customer_id(name)")
    .neq("status", "voided")
    .lte("issue_date", p.to)
    .order("due_date");
  if (error) throw error;
  const docs = (data ?? [])
    .filter((i: any) => num(i.balance_due) > 0)
    .map((i: any) => ({
      entity: i.customer?.name ?? "(no customer)",
      docNo: i.number ?? "",
      date: i.issue_date,
      due: i.due_date,
      total: num(i.total),
      balance: num(i.balance_due),
      link: `/invoice-detail/${i.id}`,
    }));
  return agingResult("Customer", "customer invoices", docs, p.to);
}

export async function loadApAging(p: { to: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("bills")
    .select("id,bill_number,bill_date,due_date,total,balance_due,status,supplier:supplier_id(name)")
    .lte("bill_date", p.to)
    .order("due_date");
  if (error) throw error;
  const docs = (data ?? [])
    .filter((b: any) => num(b.balance_due) > 0 && b.status !== "voided" && b.status !== "cancelled")
    .map((b: any) => ({
      entity: b.supplier?.name ?? "(no supplier)",
      docNo: b.bill_number ?? "",
      date: b.bill_date,
      due: b.due_date,
      total: num(b.total),
      balance: num(b.balance_due),
      link: `/bill-detail/${b.id}`,
    }));
  return agingResult("Supplier", "supplier bills", docs, p.to);
}

/* ------------------------------------------------------------------ */
/* 8. Stock valuation                                                  */
/* ------------------------------------------------------------------ */

export async function loadStockValuation(p: { locationId?: string }): Promise<ReportResult> {
  const [{ data: items, error }, { data: balances }, { data: locs }] = await Promise.all([
    supabase.from("stock_items").select("id,sku,name,unit,category,cost_price,quantity_on_hand,reorder_level,is_active").order("name"),
    supabase.from("stock_balances").select("item_id,location_id,quantity"),
    supabase.from("inventory_locations").select("id,name"),
  ]);
  if (error) throw error;

  const locName = new Map((locs ?? []).map((l: any) => [l.id, l.name]));
  const balByItem = new Map<string, { qty: number; byLoc: Map<string, number> }>();
  for (const b of balances ?? []) {
    if (p.locationId && b.location_id !== p.locationId) continue;
    const cur = balByItem.get(b.item_id) ?? { qty: 0, byLoc: new Map<string, number>() };
    cur.qty += num(b.quantity);
    cur.byLoc.set(b.location_id, (cur.byLoc.get(b.location_id) ?? 0) + num(b.quantity));
    balByItem.set(b.item_id, cur);
  }

  let totalValueMinor = 0;
  let totalQty = 0;
  let missingCost = 0;
  let negative = 0;

  const rows: ReportRow[] = (items ?? []).map((i: any) => {
    const bal = balByItem.get(i.id);
    const q = bal ? bal.qty : p.locationId ? 0 : num(i.quantity_on_hand);
    const cost = num(i.cost_price);
    const valueMinor = Math.round(q * toMinor(cost));
    totalValueMinor += valueMinor;
    totalQty += q;
    if (cost <= 0 && q !== 0) missingCost += 1;
    if (q < 0) negative += 1;
    const locations = bal
      ? [...bal.byLoc.entries()].map(([id, v]) => `${locName.get(id) ?? "—"}: ${qty(v)}`).join(", ")
      : "";
    return {
      sku: i.sku ?? "",
      item: i.name,
      category: i.category ?? "",
      unit: i.unit ?? "",
      quantity: q,
      cost,
      value: toMajor(valueMinor),
      locations,
      flag: q < 0 ? "Negative stock" : cost <= 0 && q !== 0 ? "No cost on record" : q <= num(i.reorder_level) ? "At/below reorder" : "",
      _emphasis: q < 0 || (cost <= 0 && q !== 0) ? "warn" : undefined,
      _link: `/inventory/stock-card?item=${i.id}`,
    };
  });

  const notes = ["Quantities come from stock_balances where present, otherwise the item's on-hand quantity."];
  if (missingCost) notes.push(`${missingCost} item(s) hold stock with no cost on record — their value is reported as zero, not estimated.`);

  return {
    columns: [
      { key: "sku", label: "SKU", priority: 2 },
      { key: "item", label: "Item", priority: 1 },
      { key: "category", label: "Category", priority: 3, defaultHidden: true },
      { key: "unit", label: "Unit", priority: 3 },
      { key: "quantity", label: "Qty on hand", numeric: true, priority: 1 },
      { key: "cost", label: "Unit cost", money: true, priority: 1 },
      { key: "value", label: "Stock value", money: true, priority: 1 },
      { key: "locations", label: "By location", priority: 3, defaultHidden: true },
      { key: "flag", label: "Flag", priority: 2 },
    ],
    rows,
    summary: [
      { label: "Items", value: String(rows.length) },
      { label: "Total quantity", value: qty(totalQty) },
      { label: "Total value", value: acctFmt(toMajor(totalValueMinor)), tone: totalValueMinor > 0 ? "good" : "warn" },
      { label: "Missing cost", value: String(missingCost), tone: missingCost ? "warn" : "good" },
      { label: "Negative stock", value: String(negative), tone: negative ? "bad" : "good" },
    ],
    notes,
    sufficient: rows.length > 0,
    facts: {
      items: rows.length,
      totalQty,
      totalValue: toMajor(totalValueMinor),
      missingCost,
      negative,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 9. Stock movement                                                   */
/* ------------------------------------------------------------------ */

const IN_TYPES = ["in", "purchase", "receipt", "transfer_in", "production_in", "opening", "return_in"];
const OUT_TYPES = ["out", "sale", "issue", "transfer_out", "production_out", "wastage", "return_out"];

export async function loadStockMovement(p: PeriodParams & { locationId?: string; itemId?: string }): Promise<ReportResult> {
  const [{ data: items }, { data: locs }] = await Promise.all([
    supabase.from("stock_items").select("id,sku,name,unit"),
    supabase.from("inventory_locations").select("id,name"),
  ]);
  const itemById = new Map((items ?? []).map((i: any) => [i.id, i]));
  const locById = new Map((locs ?? []).map((l: any) => [l.id, l.name]));

  let q = supabase
    .from("stock_movements")
    .select("id,item_id,location_id,movement_type,quantity,unit_cost,total_cost,transaction_date,created_at,reference,source_type,source_id")
    .order("transaction_date");
  if (p.locationId) q = q.eq("location_id", p.locationId);
  if (p.itemId) q = q.eq("item_id", p.itemId);
  const { data: moves, error } = await q;
  if (error) throw error;

  type Agg = { opening: number; inQ: number; outQ: number; adj: number; item: string; sku: string; unit: string; loc: string; itemId: string };
  const agg = new Map<string, Agg>();
  const dateOf = (m: any) => (m.transaction_date ?? m.created_at ?? "").slice(0, 10);

  for (const m of moves ?? []) {
    const d = dateOf(m);
    if (d > p.to) continue;
    const item: any = itemById.get(m.item_id);
    const key = `${m.item_id}|${m.location_id ?? ""}`;
    const cur =
      agg.get(key) ??
      ({
        opening: 0,
        inQ: 0,
        outQ: 0,
        adj: 0,
        item: item?.name ?? "(unknown item)",
        sku: item?.sku ?? "",
        unit: item?.unit ?? "",
        loc: locById.get(m.location_id) ?? "—",
        itemId: m.item_id,
      } as Agg);

    const type = String(m.movement_type ?? "").toLowerCase();
    const raw = num(m.quantity);
    let signed = raw;
    if (IN_TYPES.includes(type)) signed = Math.abs(raw);
    else if (OUT_TYPES.includes(type)) signed = -Math.abs(raw);

    if (d < p.from) {
      cur.opening += signed;
    } else if (type.includes("adjust") || type.includes("count")) {
      cur.adj += signed;
    } else if (signed >= 0) {
      cur.inQ += signed;
    } else {
      cur.outQ += -signed;
    }
    agg.set(key, cur);
  }

  const rows: ReportRow[] = [...agg.values()]
    .sort((a, b) => a.item.localeCompare(b.item))
    .map((a) => ({
      sku: a.sku,
      item: a.item,
      location: a.loc,
      unit: a.unit,
      opening: a.opening,
      in: a.inQ,
      out: a.outQ,
      adjusted: a.adj,
      closing: a.opening + a.inQ - a.outQ + a.adj,
      _link: `/inventory/stock-card?item=${a.itemId}`,
    }));

  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + num(r[k as string]), 0);

  return {
    columns: [
      { key: "sku", label: "SKU", priority: 2 },
      { key: "item", label: "Item", priority: 1 },
      { key: "location", label: "Location", priority: 1 },
      { key: "unit", label: "Unit", priority: 3 },
      { key: "opening", label: "Opening", numeric: true, priority: 2 },
      { key: "in", label: "In", numeric: true, priority: 1 },
      { key: "out", label: "Out", numeric: true, priority: 1 },
      { key: "adjusted", label: "Adjusted", numeric: true, priority: 2 },
      { key: "closing", label: "Closing", numeric: true, priority: 1 },
    ],
    rows,
    summary: [
      { label: "Item / location lines", value: String(rows.length) },
      { label: "Quantity in", value: qty(sum("in")), tone: "good" },
      { label: "Quantity out", value: qty(sum("out")) },
      { label: "Adjustments", value: qty(sum("adjusted")), tone: sum("adjusted") !== 0 ? "warn" : "good" },
      { label: "Closing quantity", value: qty(sum("closing")) },
    ],
    notes: ["Opening is derived from all movements dated before the period start. Click a row to open the stock card."],
    sufficient: (moves ?? []).length > 0,
    facts: {
      lines: rows.length,
      inQty: sum("in"),
      outQty: sum("out"),
      adjustedQty: sum("adjusted"),
      closingQty: sum("closing"),
      movements: (moves ?? []).length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 10. Stock reconciliation                                            */
/* ------------------------------------------------------------------ */

export async function loadStockReconciliation(p: PeriodParams & { locationId?: string }): Promise<ReportResult> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("Not signed in");

  const [{ data: rpc, error }, { data: balances }] = await Promise.all([
    supabase.rpc("stock_reconciliation", {
      _uid: uid,
      _location: p.locationId ?? null,
      _from: p.from,
      _to: p.to,
    } as any),
    supabase.from("stock_balances").select("item_id,location_id,quantity"),
  ]);
  if (error) throw error;

  const actualByItem = new Map<string, number>();
  for (const b of balances ?? []) {
    if (p.locationId && b.location_id !== p.locationId) continue;
    actualByItem.set(b.item_id, (actualByItem.get(b.item_id) ?? 0) + num(b.quantity));
  }

  let variances = 0;
  const rows: ReportRow[] = ((rpc as any[]) ?? []).map((r: any) => {
    const expected = num(r.expected_closing);
    const actual = actualByItem.has(r.item_id) ? (actualByItem.get(r.item_id) as number) : expected;
    const variance = actual - expected;
    if (Math.abs(variance) > 0.0001) variances += 1;
    return {
      sku: r.sku ?? "",
      item: r.item_name ?? "",
      unit: r.unit ?? "",
      opening: num(r.opening),
      produced: num(r.produced),
      transfers_in: num(r.transfers_in),
      other_in: num(r.other_in),
      sales: num(r.sales),
      returns: num(r.returns),
      transfers_out: num(r.transfers_out),
      adjustments: num(r.adjustments),
      expected: expected,
      actual,
      variance,
      _emphasis: Math.abs(variance) > 0.0001 ? "warn" : undefined,
      _link: `/inventory/stock-card?item=${r.item_id}`,
    };
  });

  return {
    columns: [
      { key: "sku", label: "SKU", priority: 2 },
      { key: "item", label: "Item", priority: 1 },
      { key: "unit", label: "Unit", priority: 3 },
      { key: "opening", label: "Opening", numeric: true, priority: 2 },
      { key: "produced", label: "Produced", numeric: true, priority: 3, defaultHidden: true },
      { key: "transfers_in", label: "Transfers in", numeric: true, priority: 3 },
      { key: "other_in", label: "Other in", numeric: true, priority: 3, defaultHidden: true },
      { key: "sales", label: "Sales", numeric: true, priority: 2 },
      { key: "returns", label: "Returns", numeric: true, priority: 3, defaultHidden: true },
      { key: "transfers_out", label: "Transfers out", numeric: true, priority: 3 },
      { key: "adjustments", label: "Adjustments", numeric: true, priority: 2 },
      { key: "expected", label: "Expected closing", numeric: true, priority: 1 },
      { key: "actual", label: "Actual on hand", numeric: true, priority: 1 },
      { key: "variance", label: "Variance", numeric: true, priority: 1 },
    ],
    rows,
    summary: [
      { label: "Items reconciled", value: String(rows.length) },
      { label: "Items with variance", value: String(variances), tone: variances ? "bad" : "good" },
      { label: "Net variance qty", value: qty(rows.reduce((s, r) => s + num(r.variance), 0)), tone: variances ? "warn" : "good" },
    ],
    notes: [
      "Expected closing is rebuilt from posted movement history; actual is the current stock balance.",
      "This report never adjusts stock. Investigate variances and use the existing stock count / adjustment workflow.",
    ],
    sufficient: rows.length > 0,
    facts: {
      items: rows.length,
      variances,
      netVariance: rows.reduce((s, r) => s + num(r.variance), 0),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 11–13. Sales reports (completed POS sales)                          */
/* ------------------------------------------------------------------ */

const COMPLETED = ["completed", "complete", "paid", "closed"];

async function loadCompletedSales(p: PeriodParams) {
  const { data: sales, error } = await supabase
    .from("pos_sales")
    .select("id,sale_no,status,sold_at,subtotal,discount,tax,total,cost_total,customer_id,customer_name,branch_id,location_id")
    .gte("sold_at", `${p.from}T00:00:00`)
    .lte("sold_at", `${p.to}T23:59:59`)
    .order("sold_at");
  if (error) throw error;
  const completed = (sales ?? []).filter((s: any) => COMPLETED.includes(String(s.status ?? "").toLowerCase()));
  const excluded = (sales ?? []).length - completed.length;
  return { completed, excluded };
}

async function loadSaleItems(saleIds: string[]) {
  const out: any[] = [];
  for (let i = 0; i < saleIds.length; i += 200) {
    const { data, error } = await supabase
      .from("pos_sale_items")
      .select("sale_id,item_id,name,sku,qty,price,unit_cost,discount,tax_rate,line_total")
      .in("sale_id", saleIds.slice(i, i + 200));
    if (error) throw error;
    out.push(...(data ?? []));
  }
  return out;
}

export async function loadSalesByItem(p: PeriodParams): Promise<ReportResult> {
  const { completed, excluded } = await loadCompletedSales(p);
  const items = completed.length ? await loadSaleItems(completed.map((s: any) => s.id)) : [];

  type Agg = { name: string; sku: string; qty: number; net: number; vat: number; gross: number; cogs: number; itemId: string | null };
  const map = new Map<string, Agg>();
  for (const li of items) {
    const key = li.item_id ?? li.sku ?? li.name;
    const cur = map.get(key) ?? { name: li.name ?? "(unnamed)", sku: li.sku ?? "", qty: 0, net: 0, vat: 0, gross: 0, cogs: 0, itemId: li.item_id ?? null };
    const q = num(li.qty);
    const lineTotal = toMinor(li.line_total);
    const rate = num(li.tax_rate);
    const vat = rate ? Math.round((lineTotal * rate) / (100 + rate)) : 0;
    cur.qty += q;
    cur.gross += lineTotal;
    cur.vat += vat;
    cur.net += lineTotal - vat;
    cur.cogs += Math.round(q * toMinor(li.unit_cost));
    map.set(key, cur);
  }

  const list = [...map.values()].sort((a, b) => b.gross - a.gross);
  const rows: ReportRow[] = list.map((a) => ({
    sku: a.sku,
    item: a.name,
    quantity: a.qty,
    net: toMajor(a.net),
    vat: toMajor(a.vat),
    gross: toMajor(a.gross),
    cogs: toMajor(a.cogs),
    margin: toMajor(a.net - a.cogs),
    _link: a.itemId ? `/inventory/stock-card?item=${a.itemId}` : undefined,
  }));

  const t = (k: keyof Agg) => list.reduce((s, a) => s + num(a[k]), 0);
  const notes = ["Completed POS sales only. Held, voided and refunded sales are excluded."];
  if (excluded) notes.push(`${excluded} non-completed sale(s) in this period were excluded.`);
  if (t("cogs") === 0 && list.length) notes.push("No unit cost was recorded on these sale lines, so cost of sales and margin show as zero rather than an estimate.");

  return {
    columns: [
      { key: "sku", label: "SKU", priority: 2 },
      { key: "item", label: "Item", priority: 1 },
      { key: "quantity", label: "Qty sold", numeric: true, priority: 1 },
      { key: "net", label: "Net sales", money: true, priority: 1 },
      { key: "vat", label: "VAT", money: true, priority: 2 },
      { key: "gross", label: "Gross sales", money: true, priority: 1 },
      { key: "cogs", label: "COGS", money: true, priority: 2 },
      { key: "margin", label: "Margin", money: true, priority: 2 },
    ],
    rows,
    summary: [
      { label: "Items sold", value: String(list.length) },
      { label: "Quantity", value: qty(t("qty")) },
      { label: "Net sales", value: acctFmt(toMajor(t("net"))) },
      { label: "VAT", value: acctFmt(toMajor(t("vat"))) },
      { label: "Gross sales", value: acctFmt(toMajor(t("gross"))), tone: "good" },
      { label: "COGS", value: acctFmt(toMajor(t("cogs"))), tone: t("cogs") === 0 && list.length ? "warn" : "default" },
    ],
    notes,
    sufficient: rows.length > 0,
    facts: {
      items: list.length,
      qty: t("qty"),
      net: toMajor(t("net")),
      vat: toMajor(t("vat")),
      gross: toMajor(t("gross")),
      cogs: toMajor(t("cogs")),
      excludedSales: excluded,
    },
  };
}

export async function loadSalesByCustomer(p: PeriodParams): Promise<ReportResult> {
  const { completed, excluded } = await loadCompletedSales(p);
  const { data: customers } = await supabase.from("customers").select("id,name");
  const custName = new Map((customers ?? []).map((c: any) => [c.id, c.name]));

  type Agg = { name: string; count: number; net: number; vat: number; gross: number; cogs: number };
  const map = new Map<string, Agg>();
  for (const s of completed) {
    const name = s.customer_name || custName.get(s.customer_id) || "Walk-in / cash";
    const cur = map.get(name) ?? { name, count: 0, net: 0, vat: 0, gross: 0, cogs: 0 };
    cur.count += 1;
    cur.vat += toMinor(s.tax);
    cur.gross += toMinor(s.total);
    cur.net += toMinor(s.total) - toMinor(s.tax);
    cur.cogs += toMinor(s.cost_total);
    map.set(name, cur);
  }
  const list = [...map.values()].sort((a, b) => b.gross - a.gross);
  const rows: ReportRow[] = list.map((a) => ({
    customer: a.name,
    sales: a.count,
    net: toMajor(a.net),
    vat: toMajor(a.vat),
    gross: toMajor(a.gross),
    cogs: toMajor(a.cogs),
    margin: toMajor(a.net - a.cogs),
    _link: "/pos-sales",
  }));
  const t = (k: keyof Agg) => list.reduce((s, a) => s + num(a[k]), 0);

  return {
    columns: [
      { key: "customer", label: "Customer", priority: 1 },
      { key: "sales", label: "Sales", numeric: true, priority: 1 },
      { key: "net", label: "Net sales", money: true, priority: 1 },
      { key: "vat", label: "VAT", money: true, priority: 2 },
      { key: "gross", label: "Gross sales", money: true, priority: 1 },
      { key: "cogs", label: "COGS", money: true, priority: 3 },
      { key: "margin", label: "Margin", money: true, priority: 2 },
    ],
    rows,
    summary: [
      { label: "Customers", value: String(list.length) },
      { label: "Sales", value: String(t("count")) },
      { label: "Net sales", value: acctFmt(toMajor(t("net"))) },
      { label: "Gross sales", value: acctFmt(toMajor(t("gross"))), tone: "good" },
    ],
    notes: [
      "Completed POS sales only; held, voided and refunded sales are excluded.",
      excluded ? `${excluded} non-completed sale(s) excluded.` : "",
    ].filter(Boolean),
    sufficient: rows.length > 0,
    facts: {
      customers: list.length,
      sales: t("count"),
      net: toMajor(t("net")),
      gross: toMajor(t("gross")),
      cogs: toMajor(t("cogs")),
    },
  };
}

export async function loadSalesByBranch(p: PeriodParams): Promise<ReportResult> {
  const { completed, excluded } = await loadCompletedSales(p);
  const [{ data: branches }, { data: locs }] = await Promise.all([
    supabase.from("branches").select("id,name,code"),
    supabase.from("inventory_locations").select("id,name,branch_id"),
  ]);
  const branchName = new Map((branches ?? []).map((b: any) => [b.id, b.name]));
  const locBranch = new Map((locs ?? []).map((l: any) => [l.id, l.branch_id]));
  const locName = new Map((locs ?? []).map((l: any) => [l.id, l.name]));

  type Agg = { name: string; count: number; net: number; vat: number; gross: number; cogs: number };
  const map = new Map<string, Agg>();
  for (const s of completed) {
    const bId = s.branch_id ?? locBranch.get(s.location_id);
    const name = branchName.get(bId) ?? locName.get(s.location_id) ?? "Unassigned branch";
    const cur = map.get(name) ?? { name, count: 0, net: 0, vat: 0, gross: 0, cogs: 0 };
    cur.count += 1;
    cur.vat += toMinor(s.tax);
    cur.gross += toMinor(s.total);
    cur.net += toMinor(s.total) - toMinor(s.tax);
    cur.cogs += toMinor(s.cost_total);
    map.set(name, cur);
  }
  const list = [...map.values()].sort((a, b) => b.gross - a.gross);
  const rows: ReportRow[] = list.map((a) => ({
    branch: a.name,
    sales: a.count,
    net: toMajor(a.net),
    vat: toMajor(a.vat),
    gross: toMajor(a.gross),
    cogs: toMajor(a.cogs),
    margin: toMajor(a.net - a.cogs),
    _link: "/pos-sales",
  }));
  const t = (k: keyof Agg) => list.reduce((s, a) => s + num(a[k]), 0);
  const unassigned = list.find((a) => a.name === "Unassigned branch");

  return {
    columns: [
      { key: "branch", label: "Branch / location", priority: 1 },
      { key: "sales", label: "Sales", numeric: true, priority: 1 },
      { key: "net", label: "Net sales", money: true, priority: 1 },
      { key: "vat", label: "VAT", money: true, priority: 2 },
      { key: "gross", label: "Gross sales", money: true, priority: 1 },
      { key: "cogs", label: "COGS", money: true, priority: 3 },
      { key: "margin", label: "Margin", money: true, priority: 2 },
    ],
    rows,
    summary: [
      { label: "Branches", value: String(list.length) },
      { label: "Sales", value: String(t("count")) },
      { label: "Gross sales", value: acctFmt(toMajor(t("gross"))), tone: "good" },
      { label: "Unassigned sales", value: String(unassigned?.count ?? 0), tone: unassigned ? "warn" : "good" },
    ],
    notes: [
      "Completed POS sales only. Branch is taken from the sale, falling back to the selling location's branch.",
      excluded ? `${excluded} non-completed sale(s) excluded.` : "",
    ].filter(Boolean),
    sufficient: rows.length > 0,
    facts: {
      branches: list.length,
      sales: t("count"),
      gross: toMajor(t("gross")),
      unassigned: unassigned?.count ?? 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 14. VAT / Tax                                                       */
/* ------------------------------------------------------------------ */

export async function loadVatReport(p: PeriodParams): Promise<ReportResult> {
  const [lines, { data: invoices }, { data: bills }, { data: taxSettings }] = await Promise.all([
    loadPostedLines({ from: p.from, to: p.to }),
    supabase.from("invoices").select("id,number,issue_date,subtotal,vat_amount,total,status").gte("issue_date", p.from).lte("issue_date", p.to),
    supabase.from("bills").select("id,bill_number,bill_date,subtotal,tax_amount,total,status").gte("bill_date", p.from).lte("bill_date", p.to),
    supabase.from("tax_settings").select("tax_name,rate,is_default,applies_to"),
  ]);

  // VAT control accounts from posted journals
  let outputJournal = 0;
  let inputJournal = 0;
  for (const l of lines) {
    const hay = `${l.accountCode ?? ""} ${l.accountName ?? ""}`.toLowerCase();
    if (!hay.includes("vat") && !hay.includes("tax")) continue;
    if (hay.includes("output") || hay.includes("payable") || hay.includes("sales")) outputJournal += l.creditMinor - l.debitMinor;
    else if (hay.includes("input") || hay.includes("receivable") || hay.includes("purchase")) inputJournal += l.debitMinor - l.creditMinor;
  }

  const validInv = (invoices ?? []).filter((i: any) => !["voided", "draft"].includes(String(i.status ?? "").toLowerCase()));
  const validBills = (bills ?? []).filter((b: any) => !["voided", "cancelled", "draft"].includes(String(b.status ?? "").toLowerCase()));
  const outputDocs = validInv.reduce((s: number, i: any) => s + toMinor(i.vat_amount), 0);
  const inputDocs = validBills.reduce((s: number, b: any) => s + toMinor(b.tax_amount), 0);
  const salesNet = validInv.reduce((s: number, i: any) => s + toMinor(i.subtotal), 0);
  const purchaseNet = validBills.reduce((s: number, b: any) => s + toMinor(b.subtotal), 0);

  const net = outputDocs - inputDocs;
  const journalNet = outputJournal - inputJournal;

  const rows: ReportRow[] = [
    { line: "1", description: "Standard-rated sales (net)", source: "Invoices", amount: toMajor(salesNet) },
    { line: "2", description: "Output VAT on sales", source: "Invoices", amount: toMajor(outputDocs) },
    { line: "3", description: "Purchases (net)", source: "Bills", amount: toMajor(purchaseNet) },
    { line: "4", description: "Input VAT on purchases", source: "Bills", amount: toMajor(inputDocs) },
    {
      line: "5",
      description: net >= 0 ? "Net VAT payable to ZRA" : "Net VAT refundable",
      source: "Computed",
      amount: toMajor(Math.abs(net)),
      _emphasis: "total",
    },
    { line: "6", description: "Output VAT per posted journals", source: "Journals", amount: toMajor(outputJournal) },
    { line: "7", description: "Input VAT per posted journals", source: "Journals", amount: toMajor(inputJournal) },
    {
      line: "8",
      description: "Documents vs journals difference",
      source: "Control",
      amount: toMajor(net - journalNet),
      _emphasis: net - journalNet === 0 ? "subtotal" : "warn",
    },
  ];

  const notes = [
    "Output/input VAT is taken from invoice and bill tax amounts, and cross-checked against posted VAT control accounts.",
    `${(taxSettings ?? []).length} tax rate(s) configured.`,
  ];
  if (!validInv.length && !validBills.length) notes.push("No VAT-bearing documents in this period.");

  return {
    columns: [
      { key: "line", label: "Line", priority: 2 },
      { key: "description", label: "Description", priority: 1 },
      { key: "source", label: "Source", priority: 2 },
      { key: "amount", label: "Amount", money: true, priority: 1 },
    ],
    rows,
    summary: [
      { label: "Output VAT", value: acctFmt(toMajor(outputDocs)) },
      { label: "Input VAT", value: acctFmt(toMajor(inputDocs)) },
      { label: net >= 0 ? "Net VAT payable" : "Net VAT refundable", value: acctFmt(toMajor(Math.abs(net))), tone: net >= 0 ? "warn" : "good" },
      {
        label: "Journal difference",
        value: acctFmt(toMajor(net - journalNet)),
        tone: net - journalNet === 0 ? "good" : "bad",
      },
    ],
    notes,
    sufficient: validInv.length > 0 || validBills.length > 0 || outputJournal !== 0 || inputJournal !== 0,
    facts: {
      outputVat: toMajor(outputDocs),
      inputVat: toMajor(inputDocs),
      netVat: toMajor(net),
      journalOutput: toMajor(outputJournal),
      journalInput: toMajor(inputJournal),
      journalDifference: toMajor(net - journalNet),
      salesNet: toMajor(salesNet),
      purchaseNet: toMajor(purchaseNet),
      invoices: validInv.length,
      bills: validBills.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Export helper                                                       */
/* ------------------------------------------------------------------ */

export function resultToExportRows(result: ReportResult): Record<string, any>[] {
  return result.rows.map((r) => {
    const out: Record<string, any> = {};
    for (const c of result.columns) {
      const v = r[c.key];
      out[c.label] = c.money || c.numeric ? (v == null ? "" : Number(v).toFixed(2)) : (v ?? "");
    }
    return out;
  });
}

/* ------------------------------------------------------------------ */
/* 15. Expenses (summary / detail / by month / by payee)               */
/*                                                                     */
/* Accounting rule: expenses are measured from POSTED journal lines on */
/* expense-type accounts — exactly the same population the Profit &    */
/* Loss uses. Payment-side entries hit bank / payables accounts, never */
/* expense accounts, so nothing is double counted, and reversal        */
/* journals net off automatically because they credit the same account.*/
/* ------------------------------------------------------------------ */

export type ExpenseView = "summary" | "detail" | "month" | "payee";

export type ExpenseLine = {
  date: string;
  entryId: string;
  entryNumber: string | null;
  reference: string | null;
  description: string;
  accountId: string | null;
  accountCode: string;
  accountName: string;
  cogs: boolean;
  payee: string;
  amountMinor: number;
};

const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleString("en-GB", { month: "short", year: "2-digit" });
};

/** Every month key between two ISO dates, inclusive (capped at 24 columns). */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  const cur = new Date(start);
  while (cur <= end && out.length < 24) {
    out.push(cur.toISOString().slice(0, 7));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

/**
 * Pure aggregation for the Expenses report. Exported for regression tests so
 * totals can be verified without touching the database.
 */
export function aggregateExpenses(
  lines: ExpenseLine[],
  p: { from: string; to: string; view: ExpenseView; accountId?: string },
): ReportResult {
  const scoped = p.accountId ? lines.filter((l) => l.accountId === p.accountId) : lines;
  const totalMinor = scoped.reduce((s, l) => s + l.amountMinor, 0);
  const total = toMajor(totalMinor);
  const count = scoped.length;
  const months = monthsBetween(p.from, p.to);
  const monthTotals = new Map<string, number>();
  for (const l of scoped) monthTotals.set(monthKey(l.date), (monthTotals.get(monthKey(l.date)) ?? 0) + l.amountMinor);
  const busiest = [...monthTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  /* per-account roll-up, shared by summary + month views */
  type Acc = { code: string; name: string; accountId: string | null; cogs: boolean; amount: number; n: number; byMonth: Map<string, number> };
  const accs = new Map<string, Acc>();
  for (const l of scoped) {
    const key = l.accountId ?? `${l.accountCode}|${l.accountName}`;
    const cur = accs.get(key) ?? { code: l.accountCode, name: l.accountName, accountId: l.accountId, cogs: l.cogs, amount: 0, n: 0, byMonth: new Map() };
    cur.amount += l.amountMinor;
    cur.n += 1;
    cur.byMonth.set(monthKey(l.date), (cur.byMonth.get(monthKey(l.date)) ?? 0) + l.amountMinor);
    accs.set(key, cur);
  }
  const ranked = [...accs.values()].sort((a, b) => b.amount - a.amount);
  const top = ranked[0];

  const summaryStats: SummaryStat[] = [
    { label: "Total expenses", value: acctFmt(total), tone: total > 0 ? "warn" : "default" },
    { label: "Categories", value: String(ranked.length) },
    { label: "Transactions", value: String(count) },
    {
      label: "Largest category",
      value: top ? top.name : "—",
      hint: top && totalMinor ? `${acctFmt(toMajor(top.amount))} · ${((top.amount / totalMinor) * 100).toFixed(1)}% of total` : undefined,
    },
    {
      label: "Monthly average",
      value: acctFmt(months.length ? total / months.length : total),
      hint: busiest ? `Highest: ${monthLabel(busiest[0])}` : undefined,
    },
  ];

  const notes = [
    "Posted journal entries only — the same expense accounts used by the Profit & Loss.",
    "Supplier payments and bank transfers are excluded, so nothing is counted twice.",
  ];
  if (p.accountId && top) notes.push(`Filtered to ${top.name}.`);

  const base = { summary: summaryStats, notes, sufficient: scoped.length > 0 };

  if (p.view === "detail") {
    const rows: ReportRow[] = scoped
      .slice()
      .sort((a, b) => (a.date === b.date ? a.accountCode.localeCompare(b.accountCode) : a.date.localeCompare(b.date)))
      .map((l) => ({
        date: l.date,
        entry: l.entryNumber ?? "",
        reference: l.reference ?? "",
        description: l.description,
        code: l.accountCode,
        account: l.accountName,
        payee: l.payee,
        amount: toMajor(l.amountMinor),
        _link: `/reports/general-ledger?account=${l.accountId ?? ""}&from=${p.from}&to=${p.to}`,
      }));
    rows.push({ date: "", entry: "", reference: "", description: "", code: "", account: "Total expenses", payee: "", amount: total, _emphasis: "total" });
    return {
      ...base,
      columns: [
        { key: "date", label: "Date", priority: 1 },
        { key: "entry", label: "Entry", priority: 3 },
        { key: "reference", label: "Reference", priority: 3 },
        { key: "description", label: "Description", priority: 2 },
        { key: "code", label: "Code", priority: 3 },
        { key: "account", label: "Account", priority: 1 },
        { key: "payee", label: "Payee", priority: 2 },
        { key: "amount", label: "Amount", money: true, priority: 1 },
      ],
      rows,
      facts: { total, transactions: count, from: p.from, to: p.to, view: "detail" },
    };
  }

  if (p.view === "month") {
    const columns: ReportColumn[] = [
      { key: "account", label: "Account", priority: 1 },
      ...months.map<ReportColumn>((m) => ({ key: m, label: monthLabel(m), money: true, priority: 2 })),
      { key: "amount", label: "Total", money: true, priority: 1 },
    ];
    const rows: ReportRow[] = ranked.map((a) => {
      const row: ReportRow = {
        account: a.name,
        amount: toMajor(a.amount),
        _link: `/reports/expenses?view=detail&account=${a.accountId ?? ""}&from=${p.from}&to=${p.to}`,
      };
      for (const m of months) row[m] = toMajor(a.byMonth.get(m) ?? 0);
      return row;
    });
    const totalRow: ReportRow = { account: "Total expenses", amount: total, _emphasis: "total" };
    for (const m of months) totalRow[m] = toMajor(monthTotals.get(m) ?? 0);
    rows.push(totalRow);
    return { ...base, columns, rows, facts: { total, transactions: count, months: months.length, from: p.from, to: p.to, view: "month" } };
  }

  if (p.view === "payee") {
    const byPayee = new Map<string, { amount: number; n: number }>();
    for (const l of scoped) {
      const cur = byPayee.get(l.payee) ?? { amount: 0, n: 0 };
      cur.amount += l.amountMinor;
      cur.n += 1;
      byPayee.set(l.payee, cur);
    }
    const rows: ReportRow[] = [...byPayee.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([payee, v]) => ({
        payee,
        transactions: v.n,
        amount: toMajor(v.amount),
        share: totalMinor ? Number(((v.amount / totalMinor) * 100).toFixed(1)) : 0,
      }));
    rows.push({ payee: "Total expenses", transactions: count, amount: total, share: totalMinor ? 100 : 0, _emphasis: "total" });
    return {
      ...base,
      columns: [
        { key: "payee", label: "Supplier / payee", priority: 1 },
        { key: "transactions", label: "Transactions", numeric: true, priority: 2 },
        { key: "share", label: "% of total", numeric: true, priority: 2 },
        { key: "amount", label: "Amount", money: true, priority: 1 },
      ],
      rows,
      notes: [...notes, "Payees are matched from expense records and supplier bills linked to each journal; unlinked journals show as “Journals & other”."],
      facts: { total, transactions: count, payees: byPayee.size, from: p.from, to: p.to, view: "payee" },
    };
  }

  /* summary */
  const rows: ReportRow[] = [];
  const groups: { label: string; cogs: boolean }[] = [
    { label: "Cost of sales", cogs: true },
    { label: "Operating expenses", cogs: false },
  ];
  for (const g of groups) {
    const items = ranked.filter((a) => a.cogs === g.cogs);
    if (!items.length) continue;
    for (const a of items) {
      rows.push({
        section: g.label,
        code: a.code,
        account: a.name,
        transactions: a.n,
        share: totalMinor ? Number(((a.amount / totalMinor) * 100).toFixed(1)) : 0,
        amount: toMajor(a.amount),
        _link: `/reports/expenses?view=detail&account=${a.accountId ?? ""}&from=${p.from}&to=${p.to}`,
      });
    }
    const sub = items.reduce((s, a) => s + a.amount, 0);
    rows.push({
      section: g.label,
      code: "",
      account: `Total ${g.label.toLowerCase()}`,
      transactions: items.reduce((s, a) => s + a.n, 0),
      share: totalMinor ? Number(((sub / totalMinor) * 100).toFixed(1)) : 0,
      amount: toMajor(sub),
      _emphasis: "subtotal",
    });
  }
  rows.push({ section: "", code: "", account: "TOTAL EXPENSES", transactions: count, share: totalMinor ? 100 : 0, amount: total, _emphasis: "total" });

  return {
    ...base,
    columns: [
      { key: "section", label: "Section", priority: 2 },
      { key: "code", label: "Code", priority: 3 },
      { key: "account", label: "Category / account", priority: 1 },
      { key: "transactions", label: "Txns", numeric: true, priority: 3 },
      { key: "share", label: "% of total", numeric: true, priority: 2 },
      { key: "amount", label: "Amount", money: true, priority: 1 },
    ],
    rows,
    facts: {
      total,
      transactions: count,
      categories: ranked.length,
      topCategory: top?.name ?? "",
      topCategoryAmount: top ? toMajor(top.amount) : 0,
      from: p.from,
      to: p.to,
      view: "summary",
    },
  };
}

/** Payee lookup: journal entry id -> supplier / payee name, from real records. */
async function loadPayeeMap(from: string, to: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data: exp } = await supabase
    .from("expenses")
    .select("journal_entry_id,reference,supplier_id,supplier:supplier_id(name)")
    .gte("expense_date", from)
    .lte("expense_date", to);
  for (const e of (exp ?? []) as any[]) {
    const name = e.supplier?.name ?? null;
    if (e.journal_entry_id && name) map.set(e.journal_entry_id, name);
  }
  return map;
}

export async function loadExpenses(
  p: PeriodParams & { view?: ExpenseView; accountId?: string },
): Promise<ReportResult> {
  const view = p.view ?? "summary";
  const [posted, payees] = await Promise.all([
    loadPostedLines({ from: p.from, to: p.to }),
    loadPayeeMap(p.from, p.to).catch(() => new Map<string, string>()),
  ]);

  const lines: ExpenseLine[] = posted
    .filter((l) => isExpense(l.accountType))
    .map((l) => ({
      date: l.entryDate,
      entryId: l.entryId,
      entryNumber: l.entryNumber,
      reference: l.reference,
      description: l.lineDescription || l.entryDescription || "",
      accountId: l.accountId,
      accountCode: l.accountCode ?? "—",
      accountName: l.accountName ?? "(unmapped account)",
      cogs: isCogs(l.accountCode, l.accountName, l.reportingClass),
      payee: payees.get(l.entryId) ?? "Journals & other",
      amountMinor: l.debitMinor - l.creditMinor,
    }))
    .filter((l) => l.amountMinor !== 0);

  return aggregateExpenses(lines, { from: p.from, to: p.to, view, accountId: p.accountId });
}
