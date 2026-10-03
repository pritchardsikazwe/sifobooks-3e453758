import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, ArrowRight, ClipboardCheck, Database, FileText, Boxes, ShoppingBag, UtensilsCrossed, BedDouble, GraduationCap, Banknote, Landmark, Beef } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SifoPage, SifoSection } from "@/components/sifo";

type Status = "live" | "controlled" | "review";
type ModuleAudit = {
  name: string; route: string; icon: any; status: Status;
  workspace: string; posting: string; checks: string[];
  actions: { label: string; to: string }[];
};

const modules: ModuleAudit[] = [
  { name:"Accounting", route:"/dashboard", icon: FileText, status:"live", workspace:"Core accounting workspace with journals, reports, approvals and ledger controls.", posting:"Direct double-entry journal posting.", checks:["GL balance/integrity checks","Posting centre and journal review","Financial reports"], actions:[{label:"Open workspace",to:"/dashboard"},{label:"Posting centre",to:"/posting-centre"},{label:"System health",to:"/system-health"}] },
  { name:"Inventory", route:"/inventory", icon: Boxes, status:"live", workspace:"Stock master, locations, receiving, movements, reconciliation and valuation.", posting:"Stock movements feed inventory/GL flows through existing posting engines.", checks:["Warehouse/location controls","Receiving/opening stock","Stock reconciliation"], actions:[{label:"Open workspace",to:"/inventory/"},{label:"Stock",to:"/stock"},{label:"Receiving",to:"/goods-receipts"}] },
  { name:"Retail POS", route:"/retail", icon: ShoppingBag, status:"live", workspace:"Dedicated retail dashboard, POS, shifts, sales, stock and reports.", posting:"Completed POS sales link into the accounting ledger.", checks:["POS posting coverage","Shift/cash control","Sales/refunds/voids"], actions:[{label:"Open workspace",to:"/retail/"},{label:"POS",to:"/pos"},{label:"Sales",to:"/pos-sales"}] },
  { name:"Restaurant", route:"/restaurant", icon: UtensilsCrossed, status:"live", workspace:"Restaurant command centre, POS, tables, kitchen, menu, cash and reports.", posting:"Paid/completed restaurant orders use the restaurant posting path; cash checkout is protected for legacy SQLite.", checks:["Restaurant checkout","Kitchen/table workflow","Restaurant → GL coverage"], actions:[{label:"Open workspace",to:"/restaurant/"},{label:"POS",to:"/restaurant/pos"},{label:"System health",to:"/system-health"}] },
  { name:"Butchery 2026", route:"/retail/butchery-dashboard", icon: Beef, status:"live", workspace:"Cuts, receiving, processing/yield, scale, labels, prices, inventory, sales and invoice workspace.", posting:"Uses existing POS, inventory, invoice and accounting posting engines.", checks:["Processing/yield","Scale/labels","Inventory/sales"], actions:[{label:"Open workspace",to:"/retail/butchery-dashboard"},{label:"Processing",to:"/retail/butchery-processing"},{label:"Sales",to:"/retail/butchery-sales"}] },
  { name:"Hotel", route:"/hotel", icon: BedDouble, status:"controlled", workspace:"PMS workspace for rooms, reservations, check-in/out, folios, payments, housekeeping and night audit.", posting:"Hotel-only mode deliberately does not silently post to GL; Accounting must be enabled for ledger posting.", checks:["Folio/payment flow","Night audit","Accounting dependency"], actions:[{label:"Open workspace",to:"/hotel"},{label:"Folios",to:"/hotel/folios"},{label:"Accounting",to:"/hotel/accounting"}] },
  { name:"School", route:"/school", icon: GraduationCap, status:"controlled", workspace:"School workspace covers learners, classes, fees, collections, boarding and connected operational panels.", posting:"Fee/payment records are operational; broader school-to-GL posting requires a dedicated accounting mapping review.", checks:["Learner/class records","Fees and collections","Boarding operations"], actions:[{label:"Open workspace",to:"/school"},{label:"Fees",to:"/school/fees-billing"},{label:"Payments",to:"/school/payments"}] },
  { name:"Payroll", route:"/payroll-dashboard", icon: Banknote, status:"live", workspace:"Payroll runs, employees, statutory calculations, approvals and payroll reports.", posting:"Payroll run/posting status is tracked in the payroll engine.", checks:["PAYE/NAPSA/NHIMA/WCF/SDL","Payroll runs","Approval/audit trail"], actions:[{label:"Open workspace",to:"/payroll-dashboard"},{label:"Payroll setup",to:"/payroll-setup"},{label:"Statutory",to:"/payroll-statutory"}] },
  { name:"Lending", route:"/lending", icon: Landmark, status:"live", workspace:"Borrowers, applications, assessment, disbursement, repayment, collections and portfolio control.", posting:"RPC posting path exists for disbursement and repayment workflows.", checks:["Application approval","Disbursement posting","Repayment posting"], actions:[{label:"Open workspace",to:"/lending"},{label:"Disbursements",to:"/lending/disbursements"},{label:"Repayments",to:"/lending/repayments"}] },
  { name:"Property", route:"/property", icon: Landmark, status:"controlled", workspace:"Properties, units, tenants, leases, recurring rent, charges, payments, maintenance and statements.", posting:"Operational billing/payment flows exist; accounting mapping/posting should be verified before being treated as fully posted.", checks:["Recurring rent generation","Charges/collections","Accounting integration review"], actions:[{label:"Open workspace",to:"/property"},{label:"Collections",to:"/property/collections"},{label:"Reports",to:"/property/reports"}] },
];

const tone: Record<Status,string> = {
  live:"bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  controlled:"bg-amber-500/10 text-amber-700 border-amber-500/30",
  review:"bg-rose-500/10 text-rose-700 border-rose-500/30",
};

export function SifoModuleAudit() {
  return <SifoPage>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">SifoBooks 2026</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Module & Workspace Audit</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">A code-level operational map of the major business editions: workspace coverage, posting path and the areas that must remain controlled rather than silently claiming functionality.</p>
      </div>
      <Link to="/system-health" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"><ClipboardCheck className="h-4 w-4"/> System health</Link>
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Card className="p-3"><div className="text-xs text-muted-foreground">Modules audited</div><div className="mt-1 text-xl font-bold">{modules.length}</div></Card>
      <Card className="p-3"><div className="text-xs text-muted-foreground">Operational posting</div><div className="mt-1 text-xl font-bold text-emerald-700">{modules.filter(m=>m.status==="live").length}</div></Card>
      <Card className="p-3"><div className="text-xs text-muted-foreground">Controlled</div><div className="mt-1 text-xl font-bold text-amber-700">{modules.filter(m=>m.status==="controlled").length}</div></Card>
      <Card className="p-3"><div className="text-xs text-muted-foreground">Design rule</div><div className="mt-1 text-sm font-semibold">No silent posting</div></Card>
    </div>
    <div className="grid gap-3 xl:grid-cols-2">
      {modules.map(m => {
        const Icon=m.icon;
        return <SifoSection key={m.name} title={<span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary"/>{m.name}<Badge variant="outline" className={tone[m.status]}>{m.status==="live"?"Operational":m.status==="controlled"?"Controlled":"Review"}</Badge></span>} description={m.workspace}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Posting path</div><div className="mt-1 text-sm">{m.posting}</div></div>
            <div className="rounded-lg border bg-muted/20 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Checks</div><div className="mt-1 space-y-1">{m.checks.map(x=><div key={x} className="flex items-center gap-1.5 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>{x}</div>)}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{m.actions.map(a=><Link key={a.to} to={a.to as never} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">{a.label}<ArrowRight className="h-3 w-3"/></Link>)}</div>
        </SifoSection>;
      })}
    </div>
  </SifoPage>;
}
