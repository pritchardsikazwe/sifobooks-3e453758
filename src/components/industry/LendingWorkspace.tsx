import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Banknote, Building2, CalendarClock,
  CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck, CreditCard, FileCheck2,
  FilePlus2, HandCoins, Landmark, LayoutDashboard, ListChecks, LockKeyhole, Menu,
  MessageSquare, Percent, PieChart, Plus, RefreshCw, Scale, Search, ShieldCheck,
  Smartphone, Users, WalletCards, WifiOff, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/industry/IndustryKit";

const db: any = supabase;

type Screen = string;

export const LENDING_NAV: NavItem[] = [
  { label: "Dashboard", to: "/lending", icon: LayoutDashboard },
  { label: "Borrowers", to: "/lending/borrowers", icon: Users },
  { label: "Applications", to: "/lending/applications", icon: FilePlus2 },
  { label: "Credit Assessment", to: "/lending/credit-assessment", icon: Scale },
  { label: "Loan Products", to: "/lending/products", icon: ListChecks },
  { label: "Portfolio", to: "/lending/portfolio", icon: PieChart },
  { label: "Disbursements", to: "/lending/disbursements", icon: Banknote },
  { label: "Repayments", to: "/lending/repayments", icon: HandCoins },
  { label: "Collections", to: "/lending/collections", icon: Activity },
  { label: "Arrears", to: "/lending/arrears", icon: AlertTriangle },
  { label: "Mobile Money", to: "/lending/mobile-money", icon: Smartphone },
  { label: "Accounting", to: "/lending/accounting", icon: Landmark },
  { label: "Reports", to: "/lending/reports", icon: BarChart3 },
  { label: "ZRA / Compliance", to: "/lending/compliance", icon: ShieldCheck },
  { label: "Branches & Staff", to: "/lending/branches", icon: Building2 },
  { label: "Settings", to: "/lending/settings", icon: Menu },
];

const TITLES: Record<string, [string, string]> = {
  "/lending": ["Lending Dashboard", "A simple daily control centre for money lenders and microfinance teams."],
  "/lending/borrowers": ["Borrowers", "Customer records, KYC status, affordability and credit history."],
  "/lending/applications": ["Loan Applications", "Application → KYC → Assessment → Approval → Disbursement."],
  "/lending/credit-assessment": ["Credit Assessment", "Explainable affordability, credit score, guarantors and collateral checks."],
  "/lending/products": ["Loan Products", "Build simple or advanced lending products without changing the core system."],
  "/lending/portfolio": ["Loan Portfolio", "Active exposure, balances, arrears and portfolio quality."],
  "/lending/disbursements": ["Disbursements", "Approved loans ready for cash, bank or mobile-money disbursement."],
  "/lending/repayments": ["Repayments", "Record payments and allocate automatically to penalty, fees, interest and principal."],
  "/lending/collections": ["Collections Command Centre", "Today's due amounts, collector performance and promises to pay."],
  "/lending/arrears": ["Arrears Management", "Work overdue loans by ageing bucket and follow-up status."],
  "/lending/mobile-money": ["Mobile Money Reconciliation", "Import, match and clear MTN, Airtel and other mobile-money transactions."],
  "/lending/accounting": ["Accounting Integration", "Lending transactions mapped into SifoBooks double-entry accounting."],
  "/lending/reports": ["Reports & Analytics", "Portfolio, PAR, collections, product, branch and investor reporting."],
  "/lending/compliance": ["Zambia Compliance", "KYC, audit trail, tax configuration and ZRA integration readiness."],
  "/lending/branches": ["Branches & Staff", "Branches, loan officers, permissions and field collections."],
  "/lending/settings": ["Lending Settings", "Interest, penalties, repayment allocation, notifications and operating mode."],
};

function money(n: any) { return fmtMoney(Number(n || 0)); }

function Status({ value }: { value?: string | null }) {
  const v = (value ?? "pending").toLowerCase();
  const tone =
    ["active", "approved", "posted", "paid", "settled", "verified", "good"].includes(v)
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : ["overdue", "defaulted", "rejected", "write-off", "failed"].includes(v)
        ? "bg-red-50 text-red-700 border-red-200"
        : ["pending", "draft", "open", "unallocated"].includes(v)
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", tone)}>{value ?? "Pending"}</span>;
}

function Card({ title, hint, right, children, className="" }: { title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[#D9E6E3] bg-white shadow-[0_6px_20px_rgba(23,59,58,.055)]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4ECEA] px-4 py-3.5">
        <div>
          <h2 className="font-bold text-[#173B3A]">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-[#6C7F7D]">{hint}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function KPI({ label, value, hint, icon: Icon, tone="default" }: { label:string; value:string; hint?:string; icon:any; tone?: "default"|"good"|"warn"|"bad"|"info" }) {
  const iconTone = tone==="good" ? "bg-emerald-50 text-emerald-700" : tone==="warn" ? "bg-amber-50 text-amber-700" : tone==="bad" ? "bg-red-50 text-red-700" : tone==="info" ? "bg-blue-50 text-blue-700" : "bg-[#EAF5F1] text-[#087A4B]";
  return <div className="rounded-2xl border border-[#D9E6E3] bg-white p-4 shadow-[0_4px_18px_rgba(20,50,40,.05)]">
    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[#6C7F7D]">
      <span>{label}</span><span className={cn("rounded-xl p-2",iconTone)}><Icon className="h-4 w-4"/></span>
    </div>
    <div className="mt-2 text-2xl font-extrabold tabular-nums text-[#173B3A]">{value}</div>
    {hint ? <div className="mt-1 text-xs text-[#6C7F7D]">{hint}</div> : null}
  </div>;
}

function Empty({ title, message, action }: { title:string; message:string; action?: {label:string; to:string} }) {
  return <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
    <span className="rounded-2xl bg-[#EAF5F1] p-3 text-[#087A4B]"><FileCheck2 className="h-6 w-6"/></span>
    <div><h3 className="font-bold text-[#173B3A]">{title}</h3><p className="mt-1 max-w-md text-sm text-[#6C7F7D]">{message}</p></div>
    {action ? <Link to={action.to as never} className="rounded-xl bg-[#07834F] px-4 py-2 text-sm font-bold text-white">{action.label}</Link> : null}
  </div>;
}

function QuickAction({ to, icon: Icon, label, detail }: {to:string; icon:any; label:string; detail:string}) {
  return <Link to={to as never} className="group flex items-center gap-3 rounded-xl border border-[#D9E6E3] bg-white p-3.5 hover:-translate-y-0.5 hover:border-[#07834F] hover:shadow-md">
    <span className="rounded-xl bg-[#EAF5F1] p-2 text-[#087A4B]"><Icon className="h-5 w-5"/></span>
    <span className="min-w-0 flex-1"><b className="block text-sm text-[#173B3A]">{label}</b><small className="text-xs text-[#6C7F7D]">{detail}</small></span>
    <ChevronRight className="h-4 w-4 text-[#9AAEAA] group-hover:text-[#07834F]"/>
  </Link>;
}

export function LendingWorkspace({ screen }: { screen: Screen }) {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Record<string, any[]>>({});
  const [mode, setMode] = useState<"simple"|"professional">("simple");
  const [showBorrower, setShowBorrower] = useState(false);
  const [showLoan, setShowLoan] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setLoading(false); return; }
    const names = [
      "lending_borrowers","lending_loan_products","lending_applications","lending_loans",
      "lending_loan_schedules","lending_repayments","lending_collateral","lending_promises",
      "lending_mobile_money","lending_audit_log",
    ];
    const pairs = await Promise.all(names.map(async name => {
      const res = await db.from(name).select("*").eq("user_id", uid).order("created_at", { ascending:false }).limit(1000);
      return [name, res.data ?? []] as const;
    }));
    if (data) setData(Object.fromEntries(pairs));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const borrowers = data.lending_borrowers ?? [];
  const products = data.lending_loan_products ?? [];
  const applications = data.lending_applications ?? [];
  const loans = data.lending_loans ?? [];
  const schedules = data.lending_loan_schedules ?? [];
  const repayments = data.lending_repayments ?? [];
  const collateral = data.lending_collateral ?? [];
  const promises = data.lending_promises ?? [];
  const momo = data.lending_mobile_money ?? [];
  const audit = data.lending_audit_log ?? [];

  const borrowerName = useMemo(() => new Map(borrowers.map((b:any)=>[b.id,b.full_name])), [borrowers]);
  const productName = useMemo(() => new Map(products.map((p:any)=>[p.id,p.name])), [products]);

  const principal = loans.reduce((s:number,l:any)=>s+Number(l.principal||0),0);
  const outstanding = loans.reduce((s:number,l:any)=>s+Number(l.balance ?? Math.max(0, Number(l.total_payable||0)-Number(l.principal_paid||0)-Number(l.interest_paid||0)-Number(l.fees_paid||0)-Number(l.penalty_paid||0))),0);
  const collected = repayments.reduce((s:number,r:any)=>s+Number(r.amount||0),0);
  const overdue = schedules.filter((s:any)=>Number(s.amount_due||0)>Number(s.amount_paid||0) && s.due_date && new Date(s.due_date)<new Date()).reduce((s:number,x:any)=>s+Math.max(0,Number(x.amount_due||0)-Number(x.amount_paid||0)),0);
  const activeLoans = loans.filter((l:any)=>["active","approved","disbursed"].includes((l.status??"").toLowerCase()));
  const collectionRate = principal > 0 ? Math.min(100, (collected / principal) * 100) : 0;
  const par30 = outstanding > 0 ? Math.min(100, (overdue / outstanding) * 100) : 0;

  const saveBorrower = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true);
    const f = new FormData(e.currentTarget); const {data:u}=await supabase.auth.getUser(); const uid=u.user?.id;
    if (!uid) return setSaving(false);
    const count = borrowers.length + 1;
    await db.from("lending_borrowers").insert({
      user_id:uid, borrower_no:`BR-${String(count).padStart(5,"0")}`,
      full_name:String(f.get("full_name")||"").trim(), phone:String(f.get("phone")||"").trim()||null,
      national_id:String(f.get("national_id")||"").trim()||null, address:String(f.get("address")||"").trim()||null,
      monthly_income:Number(f.get("monthly_income")||0), status:"active", kyc_status:"pending"
    });
    setShowBorrower(false); await load(); setSaving(false);
  };

  const saveApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true);
    const f=new FormData(e.currentTarget); const {data:u}=await supabase.auth.getUser(); const uid=u.user?.id;
    if (!uid) return setSaving(false);
    const borrowerId=String(f.get("borrower_id")||""); const amount=Number(f.get("amount")||0);
    if (!borrowerId || !amount) return setSaving(false);
    const productId=String(f.get("product_id")||"")||null;
    await db.from("lending_applications").insert({
      user_id:uid, application_no:`APP-${Date.now()}`, borrower_id:borrowerId, product_id:productId,
      amount_requested:amount, term:Number(f.get("term")||1), purpose:String(f.get("purpose")||"").trim(),
      monthly_income:Number(f.get("income")||0), monthly_expenses:Number(f.get("expenses")||0),
      status:"pending", affordability_status:"pending", kyc_status:"pending"
    });
    setShowLoan(false); await load(); setSaving(false);
  };

  const saveRepayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true);
    const f=new FormData(e.currentTarget); const {data:u}=await supabase.auth.getUser(); const uid=u.user?.id;
    if (!uid) return setSaving(false);
    const loanId=String(f.get("loan_id")||""); const amount=Number(f.get("amount")||0);
    const loan=loans.find((x:any)=>x.id===loanId);
    if (!loan || !amount) return setSaving(false);
    const receipt=`RCP-${Date.now()}`;
    await db.from("lending_repayments").insert({
      user_id:uid, receipt_no:receipt, loan_id:loan.id, borrower_id:loan.borrower_id,
      amount, principal_amount:Math.min(amount, Number(loan.balance||amount)), interest_amount:0, fees_amount:0, penalty_amount:0,
      method:String(f.get("method")||"cash"), reference:String(f.get("reference")||"").trim()||null, status:"posted"
    });
    const newBalance=Math.max(0,Number(loan.balance||0)-amount);
    await db.from("lending_loans").update({
      principal_paid:Number(loan.principal_paid||0)+Math.min(amount,Number(loan.balance||amount)),
      balance:newBalance, status:newBalance<=0?"settled":"active"
    }).eq("id",loan.id).eq("user_id",uid);
    setShowPayment(false); await load(); setSaving(false);
  };

  const title = TITLES[screen] ?? TITLES["/lending"];
  const nav = screen === "/lending" ? LENDING_NAV : LENDING_NAV;
  const isSimple = mode === "simple";

  if (loading) return <div className="p-8 text-sm text-[#6C7F7D]">Loading lending workspace…</div>;

  const dashboard = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <KPI label="Borrowers" value={String(borrowers.length)} hint="Customer records" icon={Users} />
        <KPI label="Disbursed" value={money(principal)} hint="Loan principal" icon={Banknote} tone="info" />
        <KPI label="Collections" value={money(collected)} hint="Recorded repayments" icon={HandCoins} tone="good" />
        <KPI label="Outstanding" value={money(outstanding)} hint="Portfolio balance" icon={WalletCards} tone="warn" />
        <KPI label="Overdue" value={money(overdue)} hint="Past-due schedule value" icon={AlertTriangle} tone={overdue>0?"bad":"good"} />
        <KPI label="PAR 30" value={`${par30.toFixed(1)}%`} hint="Simple portfolio indicator" icon={Percent} tone={par30>10?"bad":"good"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr_.8fr]">
        <Card title="Portfolio overview" hint="Live figures from your lending records.">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="rounded-xl bg-[#F4F7F6] p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-[#6C7F7D]">Principal outstanding</div>
              <div className="mt-2 text-3xl font-extrabold text-[#173B3A]">{money(outstanding)}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DDE8E5]"><div className="h-full rounded-full bg-[#07834F]" style={{width:`${Math.max(0,Math.min(100,100-(outstanding?overdue/outstanding*100:0)))}%`}}/></div>
              <div className="mt-2 flex justify-between text-xs text-[#6C7F7D]"><span>Portfolio quality</span><b>{Math.max(0,100-par30).toFixed(1)}%</b></div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="mb-3 text-sm font-bold text-[#173B3A]">Loan status</div>
              {[
                ["Active", activeLoans.length, "bg-emerald-500"],
                ["Applications", applications.length, "bg-blue-500"],
                ["Overdue", schedules.filter((s:any)=>Number(s.amount_due)>Number(s.amount_paid)&&s.due_date&&new Date(s.due_date)<new Date()).length, "bg-red-500"],
                ["Settled", loans.filter((l:any)=>l.status==="settled").length, "bg-slate-400"],
              ].map(([label,value,tone]:any)=><div key={label} className="mb-2 flex items-center gap-2 text-sm"><span className={cn("h-2.5 w-2.5 rounded-full",tone)}/><span className="flex-1">{label}</span><b>{value}</b></div>)}
            </div>
          </div>
        </Card>

        <Card title="Quick actions" hint="Small-lender mode keeps the day simple.">
          <div className="space-y-2 p-3">
            <QuickAction to="/lending/borrowers" icon={Users} label="New borrower" detail="Capture KYC basics"/>
            <button type="button" onClick={()=>setShowLoan(true)} className="w-full text-left"><QuickAction to="/lending/applications" icon={FilePlus2} label="New loan application" detail="Start an application"/></button>
            <button type="button" onClick={()=>setShowPayment(true)} className="w-full text-left"><QuickAction to="/lending/repayments" icon={HandCoins} label="Record payment" detail="Cash, bank or mobile money"/></button>
            <QuickAction to="/lending/collections" icon={Activity} label="Today's collections" detail="See who is due"/>
          </div>
        </Card>

        <Card title="Operating mode" hint="Progressive complexity.">
          <div className="space-y-2 p-3">
            <button type="button" onClick={()=>setMode("simple")} className={cn("w-full rounded-xl border p-3 text-left",isSimple?"border-[#07834F] bg-[#EAF5F1]":"")}>
              <b className="block text-sm">🟢 Small Money Lender</b><span className="text-xs text-[#6C7F7D]">Borrowers, loans, payments, cash and reports.</span>
            </button>
            <button type="button" onClick={()=>setMode("professional")} className={cn("w-full rounded-xl border p-3 text-left",!isSimple?"border-[#07834F] bg-[#EAF5F1]":"")}>
              <b className="block text-sm">🔵 Professional / MFI</b><span className="text-xs text-[#6C7F7D]">Credit, branches, mobile money, risk and analytics.</span>
            </button>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F4F7F6] p-3 text-xs text-[#6C7F7D]"><WifiOff className="h-4 w-4"/><span>Windows-ready architecture · offline sync can be enabled.</span></div>
          </div>
        </Card>
      </div>

      <Card title="Collections control" hint="Use the same screen whether you are a one-person lender or a growing branch team." right={<Link to="/lending/collections" className="text-sm font-bold text-[#07834F]">Open collections <ArrowRight className="inline h-4 w-4"/></Link>}>
        {loans.length===0 ? <Empty title="No loans yet" message="Create a borrower and start a loan application. The dashboard will populate from your real lending records." action={{label:"Add borrower",to:"/lending/borrowers"}}/> :
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <div className="rounded-xl border p-4"><div className="text-xs uppercase text-[#6C7F7D]">Active loans</div><b className="mt-1 block text-2xl">{activeLoans.length}</b></div>
            <div className="rounded-xl border p-4"><div className="text-xs uppercase text-[#6C7F7D]">Collection rate</div><b className="mt-1 block text-2xl">{collectionRate.toFixed(1)}%</b></div>
            <div className="rounded-xl border p-4"><div className="text-xs uppercase text-[#6C7F7D]">Promises open</div><b className="mt-1 block text-2xl">{promises.filter((p:any)=>p.status==="open").length}</b></div>
          </div>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Mobile money" hint="Unallocated transactions need attention.">
          <div className="grid grid-cols-3 gap-3 p-4 text-center">
            <div><b className="block text-xl">{momo.length}</b><span className="text-xs text-[#6C7F7D]">Imported</span></div>
            <div><b className="block text-xl text-emerald-700">{momo.filter((m:any)=>m.status==="matched").length}</b><span className="text-xs text-[#6C7F7D]">Matched</span></div>
            <div><b className="block text-xl text-red-700">{momo.filter((m:any)=>m.status==="unallocated").length}</b><span className="text-xs text-[#6C7F7D]">Unallocated</span></div>
          </div>
        </Card>
        <Card title="Trust & compliance" hint="Built into the lending workflow.">
          <div className="grid grid-cols-2 gap-2 p-4 text-sm">
            {["KYC status","Audit trail","Accounting mapping","ZRA / tax configuration"].map(x=><div key={x} className="flex items-center gap-2 rounded-xl bg-[#F4F7F6] p-3"><CheckCircle2 className="h-4 w-4 text-emerald-600"/>{x}</div>)}
          </div>
        </Card>
      </div>
    </div>
  );

  const borrowersView = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setShowBorrower(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#07834F] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4"/> New borrower</button>
        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2"><Search className="h-4 w-4 text-[#6C7F7D]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search borrower…" className="w-52 bg-transparent text-sm outline-none"/></div>
      </div>
      <Card title="Borrower directory" hint="Only your real borrower records are shown.">
        {borrowers.length===0 ? <Empty title="No borrowers yet" message="Add your first borrower. KYC can be completed progressively."/> :
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{borrowers.filter((b:any)=>`${b.full_name} ${b.phone??""} ${b.borrower_no} ${b.national_id??""}`.toLowerCase().includes(q.toLowerCase())).map((b:any)=><div key={b.id} className="rounded-2xl border p-4 hover:border-[#07834F]">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF5F1] font-bold text-[#087A4B]">{b.full_name.split(" ").slice(0,2).map((x:string)=>x[0]).join("").toUpperCase()}</div><div className="min-w-0 flex-1"><b className="block truncate">{b.full_name}</b><span className="text-xs text-[#6C7F7D]">{b.borrower_no} · {b.phone??"No phone"}</span></div><Status value={b.kyc_status}/></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span>Income <b>{money(b.monthly_income)}</b></span><span>Score <b>{b.credit_score??"—"}</b></span><span className="col-span-2">ID <b>{b.national_id??"Not captured"}</b></span></div>
          </div>)}</div>}
      </Card>
    </div>
  );

  const listView = (kind:string) => {
    const cfg:any = {
      applications:{title:"Applications", rows:applications, empty:"No loan applications yet.", cols:["Application","Borrower","Requested","Term","Status"]},
      products:{title:"Loan products", rows:products, empty:"No loan products configured.", cols:["Code","Product","Range","Rate","Status"]},
      portfolio:{title:"Active loan portfolio", rows:loans, empty:"No loans have been disbursed yet.", cols:["Loan","Borrower","Principal","Balance","Status"]},
      disbursements:{title:"Disbursement register", rows:loans.filter((l:any)=>l.disbursed_at||["approved","active","settled"].includes(l.status)), empty:"No disbursements recorded yet.", cols:["Loan","Borrower","Amount","Method","Date"]},
      repayments:{title:"Repayment register", rows:repayments, empty:"No repayments recorded yet.", cols:["Receipt","Borrower","Amount","Method","Date"]},
      arrears:{title:"Arrears queue", rows:loans.filter((l:any)=>Number(l.balance)>0 && (schedules.some((s:any)=>s.loan_id===l.id && Number(s.amount_due)>Number(s.amount_paid) && s.due_date&&new Date(s.due_date)<new Date()))), empty:"No loans are currently in arrears.", cols:["Loan","Borrower","Balance","Ageing","Status"]},
      branches:{title:"Branches & staff", rows:[], empty:"Branch/staff records are managed from SifoBooks administration.", cols:[]},
    }[kind];
    if (!cfg) return null;
    return <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 w-fit"><Search className="h-4 w-4 text-[#6C7F7D]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search records…" className="w-56 bg-transparent text-sm outline-none"/></div>
      <Card title={cfg.title} hint={cfg.empty}>
        {cfg.rows.length===0 ? <Empty title={cfg.title==="Branches & staff"?"Connect staff to lending roles":"Nothing recorded yet"} message={cfg.empty}/> :
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#F4F7F6] text-[10px] uppercase tracking-wide text-[#6C7F7D]"><tr>{cfg.cols.map((c:string)=><th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>
            {cfg.rows.filter((r:any)=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).slice(0,200).map((r:any)=> {
              const borrower = borrowerName.get(r.borrower_id) ?? "—";
              const product = productName.get(r.product_id) ?? "—";
              return <tr key={r.id} className="border-t hover:bg-[#F8FBFA]">
                <td className="px-4 py-3 font-semibold">{r.application_no??r.loan_no??r.code??r.receipt_no??"—"}</td>
                <td className="px-4 py-3">{borrower}</td>
                <td className="px-4 py-3 tabular-nums">{money(r.amount_requested??r.principal??r.amount??r.max_amount??0)}</td>
                <td className="px-4 py-3">{r.term??r.interest_rate??r.method??r.disbursement_method??"—"}</td>
                <td className="px-4 py-3"><Status value={r.status}/></td>
              </tr>;
            })}
          </tbody></table></div>}
      </Card>
    </div>;
  };

  const collectionsView = <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <KPI label="Due" value={money(schedules.reduce((s:number,x:any)=>s+Number(x.amount_due||0),0))} icon={CalendarClock}/>
      <KPI label="Collected" value={money(collected)} icon={HandCoins} tone="good"/>
      <KPI label="Remaining" value={money(overdue)} icon={AlertTriangle} tone="warn"/>
      <KPI label="Promises" value={String(promises.length)} icon={MessageSquare}/>
      <KPI label="Recovery rate" value={`${collectionRate.toFixed(1)}%`} icon={Activity} tone="good"/>
    </div>
    <Card title="Collections command centre" hint="Prioritise today's due and overdue borrowers.">
      {loans.length===0 ? <Empty title="No collection queue" message="Disbursed loans with schedules will appear here."/> :
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{loans.filter((l:any)=>Number(l.balance)>0).slice(0,30).map((l:any)=><div key={l.id} className="rounded-2xl border p-4"><div className="flex justify-between gap-2"><b>{borrowerName.get(l.borrower_id)??"Borrower"}</b><Status value={l.status}/></div><div className="mt-1 text-xs text-[#6C7F7D]">{l.loan_no}</div><div className="mt-3 flex justify-between text-sm"><span>Balance</span><b>{money(l.balance)}</b></div><div className="mt-3 flex gap-2"><button onClick={()=>setShowPayment(true)} className="flex-1 rounded-lg bg-[#07834F] px-3 py-2 text-xs font-bold text-white">Record payment</button><button className="rounded-lg border px-3 py-2 text-xs font-semibold">Contact</button></div></div>)}</div>}
    </Card>
  </div>;

  const mobileView = <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="Imported" value={String(momo.length)} icon={Smartphone}/><KPI label="Matched" value={String(momo.filter((m:any)=>m.status==="matched").length)} icon={CheckCircle2} tone="good"/><KPI label="Unallocated" value={String(momo.filter((m:any)=>m.status==="unallocated").length)} icon={AlertTriangle} tone="bad"/><KPI label="Value" value={money(momo.reduce((s:number,m:any)=>s+Number(m.amount||0),0))} icon={CircleDollarSign}/></div>
    <Card title="Mobile money reconciliation" hint="Import or connect provider feeds, then match payments to loans.">
      {momo.length===0?<Empty title="No mobile-money transactions" message="When MTN, Airtel or bank transaction feeds are connected, unmatched payments will appear here."/>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#F4F7F6] text-xs text-[#6C7F7D]"><tr><th className="p-3 text-left">Provider</th><th className="p-3 text-left">Reference</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{momo.map((m:any)=><tr key={m.id} className="border-t"><td className="p-3">{m.provider}</td><td className="p-3">{m.transaction_ref}</td><td className="p-3">{m.phone??"—"}</td><td className="p-3 font-semibold">{money(m.amount)}</td><td className="p-3"><Status value={m.status}/></td></tr>)}</tbody></table></div>}
    </Card>
  </div>;

  const accountingView = <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="Loan principal" value={money(principal)} icon={Banknote}/><KPI label="Interest paid" value={money(repayments.reduce((s:number,r:any)=>s+Number(r.interest_amount||0),0))} icon={Percent} tone="good"/><KPI label="Fees paid" value={money(repayments.reduce((s:number,r:any)=>s+Number(r.fees_amount||0),0))} icon={CircleDollarSign}/><KPI label="Audit events" value={String(audit.length)} icon={LockKeyhole}/></div>
    <Card title="Lending accounting bridge" hint="Operational lending records are prepared for the SifoBooks double-entry engine.">
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">{[
        ["Disbursement","Dr Loan Receivable","Cr Cash / Bank"],
        ["Repayment","Dr Cash / Bank","Cr Loan Receivable"],
        ["Interest","Dr Interest Receivable","Cr Interest Income"],
        ["Fees","Dr Cash / Bank","Cr Lending Fee Income"],
      ].map(x=><div key={x[0]} className="rounded-xl border p-4"><b className="block text-sm">{x[0]}</b><span className="mt-2 block text-xs text-[#6C7F7D]">{x[1]}</span><span className="block text-xs text-[#6C7F7D]">{x[2]}</span></div>)}</div>
      <div className="border-t p-4"><Link to="/reports/trial-balance" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold">Open General Ledger <ArrowRight className="h-4 w-4"/></Link></div>
    </Card>
  </div>;

  const complianceView = <div className="space-y-4">
    <Card title="Zambia compliance control" hint="Configuration and audit readiness. Fiscalization is applied only where the applicable ZRA rules require it.">
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ["KYC","Borrower identity and verification status",ShieldCheck],
        ["Audit trail","Immutable operational history",LockKeyhole],
        ["Tax configuration","Map applicable taxes and income",Percent],
        ["ZRA integration","Connector readiness / receipt controls",Landmark],
      ].map(([a,b,I]:any)=><div key={a} className="rounded-2xl border p-4"><I className="h-5 w-5 text-[#07834F]"/><b className="mt-3 block text-sm">{a}</b><span className="mt-1 block text-xs text-[#6C7F7D]">{b}</span><Status value="ready"/></div>)}</div>
    </Card>
    <Card title="Recent audit events" hint="Every material lending change should be traceable.">
      {audit.length===0?<Empty title="No audit events yet" message="Audit events will appear as lending records are created and changed."/>:<div className="divide-y">{audit.slice(0,20).map((a:any)=><div key={a.id} className="flex items-center gap-3 p-4 text-sm"><LockKeyhole className="h-4 w-4 text-[#07834F]"/><span className="flex-1">{a.action} · {a.entity_type}</span><span className="text-xs text-[#6C7F7D]">{new Date(a.created_at).toLocaleString()}</span></div>)}</div>}
    </Card>
  </div>;

  const reportsView = <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KPI label="Portfolio" value={money(outstanding)} icon={PieChart}/><KPI label="PAR 30" value={`${par30.toFixed(1)}%`} icon={AlertTriangle} tone={par30>10?"bad":"good"}/><KPI label="Borrowers" value={String(borrowers.length)} icon={Users}/><KPI label="Recovery" value={`${collectionRate.toFixed(1)}%`} icon={BarChart3} tone="good"/></div>
    <Card title="Management reports" hint="Open the report areas from the same SifoBooks reporting engine.">
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{["Portfolio Summary","PAR 1 / 7 / 30 / 60 / 90","Collections Performance","Loan Officer Performance","Product Performance","Branch Performance","Investor Report","Write-off & Recovery","Cash Flow from Lending"].map(x=><Link key={x} to="/reports" className="group rounded-xl border p-4 hover:border-[#07834F]"><b>{x}</b><ArrowRight className="mt-3 h-4 w-4 text-[#07834F] group-hover:translate-x-1"/></Link>)}</div>
    </Card>
  </div>;

  const settingsView = <div className="space-y-4">
    <Card title="Lending operating settings" hint="Simple defaults first; professional controls can be enabled as the business grows.">
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Operating mode", mode==="simple"?"Small Money Lender":"Professional / MFI"],
        ["Currency","ZMW"],
        ["Interest","Reducing balance / configurable"],
        ["Payment allocation","Penalty → Fees → Interest → Principal"],
        ["Notifications","SMS / WhatsApp / Email ready"],
        ["Windows","Offline-first capable"],
        ["Branches","Multi-branch ready"],
        ["Accounting","Double-entry integration"],
        ["Security","Roles + audit trail"],
      ].map(([a,b])=><div key={a} className="rounded-xl bg-[#F4F7F6] p-4"><span className="text-xs uppercase text-[#6C7F7D]">{a}</span><b className="mt-1 block text-sm text-[#173B3A]">{b}</b></div>)}</div>
    </Card>
  </div>;

  const body =
    screen === "/lending" ? dashboard :
    screen === "/lending/borrowers" ? borrowersView :
    screen === "/lending/collections" ? collectionsView :
    screen === "/lending/mobile-money" ? mobileView :
    screen === "/lending/accounting" ? accountingView :
    screen === "/lending/compliance" ? complianceView :
    screen === "/lending/reports" ? reportsView :
    screen === "/lending/settings" ? settingsView :
    screen === "/lending/credit-assessment" ? <div className="space-y-4"><Card title="Credit assessment workspace" hint="Start with borrower income, expenses, repayment history and security."><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><KPI label="Borrowers" value={String(borrowers.length)} icon={Users}/><KPI label="Applications" value={String(applications.length)} icon={FilePlus2}/><KPI label="Guarantors / collateral" value={String(collateral.length)} icon={ShieldCheck}/><KPI label="Pending KYC" value={String(borrowers.filter((b:any)=>b.kyc_status!=="verified").length)} icon={LockKeyhole} tone="warn"/></div><Empty title="Assessment queue" message="Applications and borrower records will appear here once captured. The assessment engine is designed to remain explainable." action={{label:"Open applications",to:"/lending/applications"}}/></Card></div> :
    listView(screen.replace("/lending/","")) ?? <div className="space-y-4"><Card title={title[0]} hint={title[1]}><Empty title="Ready for live data" message="This workspace is connected to the lending data foundation. Create records to populate it."/></Card></div>;

  return (
    <div className="lending-2026-page">
      <div className="lending-2026-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="lending-2026-logo"><CircleDollarSign className="h-5 w-5"/></div>
          <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E5B83F]">SifoBooks Lending</div><h1 className="truncate text-xl font-extrabold text-white">{title[0]}</h1><p className="hidden text-xs text-emerald-100/70 lg:block">{title[1]}</p></div>
        </div>
        <div className="ml-auto flex items-center gap-2"><span className="hidden rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200 md:inline-flex"><span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400"/> LIVE DATA</span><button className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10" onClick={()=>void load()}><RefreshCw className="mr-1 inline h-3.5 w-3.5"/> Refresh</button></div>
      </div>

      <div className="lending-2026-nav">
        {LENDING_NAV.filter((n)=>isSimple ? ["Dashboard","Borrowers","Applications","Repayments","Collections","Reports"].includes(n.label) : true).map(n=>(
          n.to === "/lending" ? <Link key={n.to} to="/lending" className={cn("lending-nav-item",screen==="/lending"&&"active")}><n.icon className="h-4 w-4"/>{n.label}</Link> :
          <Link key={n.to} to={n.to as never} className={cn("lending-nav-item",screen===n.to&&"active")}><n.icon className="h-4 w-4"/>{n.label}</Link>
        ))}
        <button type="button" onClick={()=>setMode(isSimple?"professional":"simple")} className="ml-auto shrink-0 rounded-xl border border-[#D9E6E3] bg-white px-3 py-2 text-xs font-bold text-[#173B3A]">{isSimple?"Switch to Professional":"Switch to Simple"}</button>
      </div>

      <main className="lending-2026-workspace">
        {body}
      </main>

      <div className="lending-2026-footer">
        <span><WifiOff className="inline h-3.5 w-3.5"/> Windows / Offline Ready</span><span><RefreshCw className="inline h-3.5 w-3.5"/> Cloud Sync Ready</span><span><ShieldCheck className="inline h-3.5 w-3.5"/> Secure & Auditable</span><span><Landmark className="inline h-3.5 w-3.5"/> Zambia-first</span>
      </div>

      {showBorrower ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={saveBorrower} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#173B3A]">New borrower</h2><button type="button" onClick={()=>setShowBorrower(false)}><XCircle className="h-5 w-5"/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-semibold">Full name<input name="full_name" required className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Phone<input name="phone" className="mt-1 w-full rounded-xl border p-3" placeholder="+260…"/></label><label className="text-sm font-semibold">NRC / ID<input name="national_id" className="mt-1 w-full rounded-xl border p-3"/></label><label className="sm:col-span-2 text-sm font-semibold">Address<input name="address" className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Monthly income<input name="monthly_income" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border p-3"/></label></div><button disabled={saving} className="mt-5 w-full rounded-xl bg-[#07834F] px-4 py-3 font-bold text-white">{saving?"Saving…":"Save borrower"}</button></form></div> : null}

      {showLoan ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={saveApplication} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#173B3A]">New loan application</h2><button type="button" onClick={()=>setShowLoan(false)}><XCircle className="h-5 w-5"/></button></div>{borrowers.length===0?<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Add a borrower first.</p>:<div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Borrower<select name="borrower_id" required className="mt-1 w-full rounded-xl border p-3"><option value="">Select borrower</option>{borrowers.map((b:any)=><option key={b.id} value={b.id}>{b.full_name}</option>)}</select></label><label className="text-sm font-semibold">Loan product<select name="product_id" className="mt-1 w-full rounded-xl border p-3"><option value="">Select product</option>{products.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="text-sm font-semibold">Amount<input name="amount" required type="number" min="1" step="0.01" className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Term (months)<input name="term" defaultValue="1" type="number" min="1" className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Monthly income<input name="income" type="number" min="0" className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Monthly expenses<input name="expenses" type="number" min="0" className="mt-1 w-full rounded-xl border p-3"/></label><label className="sm:col-span-2 text-sm font-semibold">Purpose<input name="purpose" className="mt-1 w-full rounded-xl border p-3" placeholder="Business stock, salary advance…"/></label></div>}<button disabled={saving||borrowers.length===0} className="mt-5 w-full rounded-xl bg-[#07834F] px-4 py-3 font-bold text-white">{saving?"Saving…":"Save application"}</button></form></div> : null}

      {showPayment ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={saveRepayment} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#173B3A]">Record repayment</h2><button type="button" onClick={()=>setShowPayment(false)}><XCircle className="h-5 w-5"/></button></div>{activeLoans.length===0?<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No active loans are available for repayment.</p>:<div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-semibold">Loan<select name="loan_id" required className="mt-1 w-full rounded-xl border p-3"><option value="">Select loan</option>{activeLoans.map((l:any)=><option key={l.id} value={l.id}>{l.loan_no} · {borrowerName.get(l.borrower_id)} · {money(l.balance)}</option>)}</select></label><label className="text-sm font-semibold">Amount<input name="amount" required type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Method<select name="method" className="mt-1 w-full rounded-xl border p-3"><option>cash</option><option>bank</option><option>MTN MoMo</option><option>Airtel Money</option></select></label><label className="sm:col-span-2 text-sm font-semibold">Reference<input name="reference" className="mt-1 w-full rounded-xl border p-3"/></label></div>}<button disabled={saving||activeLoans.length===0} className="mt-5 w-full rounded-xl bg-[#07834F] px-4 py-3 font-bold text-white">{saving?"Posting…":"Post repayment"}</button></form></div> : null}
    </div>
  );
}
