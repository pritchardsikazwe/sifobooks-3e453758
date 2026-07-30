import { supabase } from "@/integrations/supabase/client";

export type LoanType = "staff" | "payable" | "receivable";

export const LOAN_TYPE_OPTIONS = [
  { value: "staff", label: "Staff / employee loan" },
  { value: "payable", label: "Bank / institution loan (payable)" },
  { value: "receivable", label: "Loan receivable (lent out)" },
];

export const INTEREST_METHOD_OPTIONS = [
  { value: "straight_line", label: "Straight line (flat)" },
  { value: "reducing", label: "Reducing balance" },
  { value: "none", label: "Interest free" },
];

export const LOAN_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "settled", label: "Settled" },
  { value: "written_off", label: "Written off" },
  { value: "defaulted", label: "Defaulted" },
];

export type ScheduleRow = {
  period_no: number;
  due_date: string;
  opening_balance: number;
  principal_due: number;
  interest_due: number;
  total_due: number;
  closing_balance: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function addMonths(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/** Build a monthly amortisation schedule for a loan. */
export function buildSchedule(loan: {
  principal: number;
  interest_rate: number;
  interest_method: string;
  term_months: number;
  start_date: string;
  first_due_date?: string | null;
}): ScheduleRow[] {
  const principal = Number(loan.principal) || 0;
  const months = Math.max(1, Number(loan.term_months) || 1);
  const annual = Number(loan.interest_rate) || 0;
  const monthlyRate = annual / 100 / 12;
  const start = loan.first_due_date || addMonths(loan.start_date, 1);
  const rows: ScheduleRow[] = [];
  let balance = principal;

  if (loan.interest_method === "reducing" && monthlyRate > 0) {
    const pmt = r2((principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)));
    for (let i = 1; i <= months; i++) {
      const interest = r2(balance * monthlyRate);
      let princ = r2(pmt - interest);
      if (i === months || princ > balance) princ = r2(balance);
      const closing = r2(balance - princ);
      rows.push({
        period_no: i,
        due_date: addMonths(start, i - 1),
        opening_balance: r2(balance),
        principal_due: princ,
        interest_due: interest,
        total_due: r2(princ + interest),
        closing_balance: closing,
      });
      balance = closing;
    }
    return rows;
  }

  // Straight line / interest-free
  const totalInterest = loan.interest_method === "none" ? 0 : r2(principal * (annual / 100) * (months / 12));
  const princPer = r2(principal / months);
  const intPer = r2(totalInterest / months);
  for (let i = 1; i <= months; i++) {
    let princ = princPer;
    let interest = intPer;
    if (i === months) {
      princ = r2(balance);
      interest = r2(totalInterest - intPer * (months - 1));
    }
    const closing = r2(balance - princ);
    rows.push({
      period_no: i,
      due_date: addMonths(start, i - 1),
      opening_balance: r2(balance),
      principal_due: princ,
      interest_due: interest,
      total_due: r2(princ + interest),
      closing_balance: closing,
    });
    balance = closing;
  }
  return rows;
}

export function scheduleTotals(rows: ScheduleRow[]) {
  const interest = r2(rows.reduce((s, r) => s + r.interest_due, 0));
  const principal = r2(rows.reduce((s, r) => s + r.principal_due, 0));
  return { interest, principal, total: r2(interest + principal), instalment: rows[0]?.total_due ?? 0 };
}

async function ensureAccount(uid: string, code: string, name: string, type: string) {
  const { data, error } = await (supabase as any).rpc("ensure_account", {
    _uid: uid, _code: code, _name: name, _type: type,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Post a balanced journal entry from two GL legs. */
async function postEntry(opts: {
  uid: string; date: string; reference: string; description: string; amount: number;
  debit: { code: string; name: string; type: string }; credit: { code: string; name: string; type: string };
}) {
  const { uid, date, reference, description, amount } = opts;
  if (!amount) return null;
  const existing = await supabase.from("journal_entries").select("id").eq("user_id", uid).eq("reference", reference).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const dr = await ensureAccount(uid, opts.debit.code, opts.debit.name, opts.debit.type);
  const cr = await ensureAccount(uid, opts.credit.code, opts.credit.name, opts.credit.type);
  const { data: je, error } = await supabase.from("journal_entries").insert({
    user_id: uid, entry_number: `JE-${reference}`, entry_date: date, reference,
    description, status: "posted", total_debit: amount, total_credit: amount,
  } as any).select("id").single();
  if (error) throw new Error(error.message);
  const { error: lerr } = await supabase.from("journal_lines").insert([
    { user_id: uid, entry_id: je.id, account_id: dr, debit: amount, credit: 0, description },
    { user_id: uid, entry_id: je.id, account_id: cr, debit: 0, credit: amount, description },
  ] as any);
  if (lerr) throw new Error(lerr.message);
  return je.id as string;
}

const LOAN_ACCOUNTS: Record<string, { code: string; name: string; type: string }> = {
  staff: { code: "1250", name: "Staff Loans Receivable", type: "asset" },
  receivable: { code: "1260", name: "Loans Receivable", type: "asset" },
  payable: { code: "2400", name: "Loans Payable", type: "liability" },
};
const BANK = { code: "1000", name: "Cash & Bank", type: "asset" };
const INT_INCOME = { code: "4400", name: "Interest Income", type: "revenue" };
const INT_EXPENSE = { code: "6400", name: "Interest Expense", type: "expense" };

/** Post the loan disbursement (money out for staff/receivable, money in for payable). */
export async function postLoanDisbursement(loan: any) {
  const uid = loan.user_id;
  const control = LOAN_ACCOUNTS[loan.loan_type] ?? LOAN_ACCOUNTS.staff;
  const amount = Number(loan.principal) || 0;
  const ref = `LOAN:${loan.loan_number}`;
  if (loan.loan_type === "payable") {
    return postEntry({ uid, date: loan.start_date, reference: ref, amount,
      description: `Loan received — ${loan.counterparty ?? loan.loan_number}`,
      debit: BANK, credit: control });
  }
  return postEntry({ uid, date: loan.start_date, reference: ref, amount,
    description: `Loan issued — ${loan.counterparty ?? loan.loan_number}`,
    debit: control, credit: BANK });
}

/** Post a repayment: principal against the control account, interest to P&L. */
export async function postLoanRepayment(loan: any, repayment: any) {
  const uid = loan.user_id;
  const control = LOAN_ACCOUNTS[loan.loan_type] ?? LOAN_ACCOUNTS.staff;
  const principal = Number(repayment.principal_portion) || 0;
  const interest = Number(repayment.interest_portion) || 0;
  const base = `REPAY:${repayment.id}`;
  let entryId: string | null = null;
  if (loan.loan_type === "payable") {
    entryId = await postEntry({ uid, date: repayment.payment_date, reference: base, amount: principal,
      description: `Loan repayment — ${loan.loan_number}`, debit: control, credit: BANK });
    if (interest) {
      await postEntry({ uid, date: repayment.payment_date, reference: `${base}:INT`, amount: interest,
        description: `Loan interest — ${loan.loan_number}`, debit: INT_EXPENSE, credit: BANK });
    }
  } else {
    entryId = await postEntry({ uid, date: repayment.payment_date, reference: base, amount: principal,
      description: `Loan recovery — ${loan.loan_number}`, debit: BANK, credit: control });
    if (interest) {
      await postEntry({ uid, date: repayment.payment_date, reference: `${base}:INT`, amount: interest,
        description: `Loan interest earned — ${loan.loan_number}`, debit: BANK, credit: INT_INCOME });
    }
  }
  return entryId;
}

/** Recalculate repaid + outstanding on a loan from its repayments. */
export async function refreshLoanBalance(loanId: string) {
  const { data: loan } = await supabase.from("loans").select("*").eq("id", loanId).maybeSingle();
  if (!loan) return;
  const { data: reps } = await supabase.from("loan_repayments").select("amount, principal_portion").eq("loan_id", loanId);
  const repaid = r2((reps ?? []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0));
  const principalPaid = r2((reps ?? []).reduce((s: number, r: any) => s + (Number(r.principal_portion) || 0), 0));
  const outstanding = Math.max(r2((Number((loan as any).principal) || 0) - principalPaid), 0);
  await supabase.from("loans").update({
    amount_repaid: repaid,
    outstanding_balance: outstanding,
    status: outstanding <= 0.01 ? "settled" : (loan as any).status === "draft" ? "active" : (loan as any).status,
  } as any).eq("id", loanId);
}
