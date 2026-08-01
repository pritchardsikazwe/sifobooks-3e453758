import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList, FolderOpen, FileText, Landmark, Users, Boxes,
  CalendarClock, ShieldCheck, ArrowLeft, CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/learn/new-company")({
  head: () => ({
    meta: [
      { title: "New to a Company? Set-Up & Source Documents — SifoBooks" },
      { name: "description", content: "A practical first-90-days checklist for taking over the books of a new company: what to collect, how to file source documents, and the order to capture them in SifoBooks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewCompanyGuide,
});

const PHASES = [
  {
    title: "Week 1 — Understand the business",
    icon: ClipboardList,
    steps: [
      "Confirm the legal name, PACRA registration, TPIN and VAT registration status.",
      "Establish the financial year-end and whether the company is on VAT, Turnover Tax or Income Tax.",
      "List the revenue streams (sales, grants, fees, donations) and the main cost drivers.",
      "Identify who approves payments, who signs cheques and who may post journals.",
      "Create the company in SifoBooks (Admin → Company Setup) and install only the modules the business needs.",
    ],
  },
  {
    title: "Week 2 — Collect the source documents",
    icon: FolderOpen,
    steps: [
      "Request the last audited or management accounts and the latest trial balance.",
      "Collect 12 months of bank statements for every account, plus mobile-money statements.",
      "Gather supplier invoices, customer invoices, receipts, delivery notes and petty-cash vouchers.",
      "Collect payroll files: contracts, NAPSA/NHIMA numbers, PAYE returns and last payslips.",
      "Obtain asset invoices, title deeds, lease agreements, loan agreements and grant contracts.",
    ],
  },
  {
    title: "Week 3 — Build the foundation in SifoBooks",
    icon: Landmark,
    steps: [
      "Pick an industry template so the chart of accounts is created for you, then rename accounts to match the business.",
      "Add bank accounts, cashbooks and opening balances using the Opening Balances wizard.",
      "Load customers, suppliers, employees and inventory items (CSV import is supported on each list).",
      "Set the tax profile: VAT rate, withholding tax, turnover-tax threshold and the filing calendar.",
      "Enter unpaid customer invoices and unpaid supplier bills as at the opening date — never as fresh sales or costs.",
    ],
  },
  {
    title: "Week 4 — Start the monthly rhythm",
    icon: CalendarClock,
    steps: [
      "Import bank statements weekly and allocate every line; use bank rules for repeating items.",
      "Run payroll, post it, and file PAYE, NAPSA, NHIMA, WCF and SDL by the statutory dates.",
      "Reconcile every bank and cash account at month-end and lock the period.",
      "Produce the monthly pack: Trial Balance, Profit & Loss, Balance Sheet, Cash Flow and Aged Debtors/Creditors.",
      "Review the Compliance Centre for upcoming filings before the 10th and 14th of each month.",
    ],
  },
];

const DOCS = [
  { icon: Landmark, title: "Banking", items: ["Bank statements (all accounts, all months)", "Mobile money statements", "Cheque books & counterfoils", "Bank reconciliation from the prior accountant"] },
  { icon: FileText, title: "Sales & income", items: ["Customer invoices & credit notes", "Official receipts issued", "Contracts / grant agreements", "Fee structures or price lists"] },
  { icon: Boxes, title: "Purchases & stock", items: ["Supplier invoices & statements", "Goods received / delivery notes", "Purchase orders & quotations", "Stock counts and valuation sheets"] },
  { icon: Users, title: "Payroll & HR", items: ["Employment contracts", "NRC, TPIN, NAPSA & NHIMA numbers", "Last 12 payslips & PAYE returns", "Loan, advance and leave records"] },
  { icon: ShieldCheck, title: "Statutory & legal", items: ["PACRA certificate & TPIN", "VAT / TPIN registration certificates", "Prior tax returns and ZRA assessments", "Board or committee minutes"] },
  { icon: FolderOpen, title: "Assets & funding", items: ["Asset purchase invoices & fixed-asset register", "Title deeds and vehicle white books", "Loan agreements & repayment schedules", "Donor / grant award letters"] },
];

const FILING = [
  "One folder per month, named YYYY-MM, for every company.",
  "Inside each month: Bank, Sales, Purchases, Payroll, Statutory, Journals.",
  "Give every document a voucher number and write it on the paper copy — SifoBooks stores the same number on the transaction.",
  "Scan and attach the document to the transaction in SifoBooks so an auditor never has to ask for the file.",
  "Never post a transaction that has no source document; raise a query instead.",
];

function NewCompanyGuide() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-10">
      <div>
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Learn Centre
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="secondary">Beginner · 14 min</Badge>
          <Badge variant="outline">Onboarding</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          New to a company? Start here
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Whether you have just been hired as an accountant, taken on a new client, or you are the owner
          finally putting the books in order — this is the exact order to work in, and the source documents
          you must have in place before you post a single transaction.
        </p>
      </div>

      {/* Phases */}
      <div className="space-y-5">
        {PHASES.map((p) => {
          const I = p.icon;
          return (
            <Card key={p.title} className="p-6 border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <I className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-foreground">{p.title}</h2>
              </div>
              <ol className="space-y-2.5">
                {p.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </div>

      {/* Source documents */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Source documents to request</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Send this list to the client or the outgoing bookkeeper on day one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {DOCS.map((d) => {
            const I = d.icon;
            return (
              <Card key={d.title} className="p-5 border-border">
                <div className="flex items-center gap-2 mb-3">
                  <I className="h-4 w-4 text-primary" />
                  <div className="font-semibold text-foreground">{d.title}</div>
                </div>
                <ul className="space-y-1.5">
                  {d.items.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filing system */}
      <Card className="p-6 border-border bg-muted/30">
        <h2 className="text-lg font-bold text-foreground mb-3">How to organise the filing</h2>
        <ul className="space-y-2">
          {FILING.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to="/learn/quick-start" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:shadow-lg transition">
          Next: 10-minute quick start
        </Link>
        <Link to="/opening-balances" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition">
          Open the Opening Balances wizard
        </Link>
      </div>
    </div>
  );
}
