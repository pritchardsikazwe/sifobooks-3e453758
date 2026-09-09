import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronDown,
  FileText,
  Landmark,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { SifoLandingPresentation } from "@/components/sifo/SifoLandingPresentation";

const modules = [
  ["Accounting", Landmark, "Ledgers, journals, trial balance and financial statements", "#0e8f4a"],
  ["Sales", ReceiptText, "Quotes, invoices, receipts, customers and collections", "#2563eb"],
  ["Purchases", ShoppingCart, "Supplier quotations, POs, bills and payments", "#f59e0b"],
  ["Inventory", Boxes, "Warehouses, transfers, stock takes and valuation", "#7c3aed"],
  ["POS", ScanLine, "Fast retail checkout with shifts and payment control", "#059669"],
  ["Banking", WalletCards, "Cashbook, bank feeds, allocation and reconciliation", "#0891b2"],
  ["Payroll", Users, "Employees, payroll, PAYE, NAPSA and NHIMA", "#db2777"],
  ["Compliance", ShieldCheck, "ZRA, NAPSA, NHIMA, PACRA and filing visibility", "#dc2626"],
] as const;

const compliance = [
  ["VAT Return — Aug 2026", "Due 15 Sep 2026", "6 days", "#dc2626"],
  ["PAYE — Aug 2026", "Due 15 Sep 2026", "6 days", "#f59e0b"],
  ["NAPSA — Aug 2026", "Due 15 Sep 2026", "6 days", "#7c3aed"],
  ["NHIMA — Aug 2026", "Due 15 Sep 2026", "Not started", "#059669"],
  ["PACRA Annual Return", "Due 31 Dec 2026", "Not due", "#2563eb"],
];

function LogoMark() {
  return <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0e8f4a] text-xl font-black text-white shadow-lg shadow-[#0e8f4a]/20">S</div>;
}

function MiniBar({ value, height }: { value: number; height: number }) {
  return <div className="flex h-24 items-end gap-1.5">{[52, 42, 64, 48, 72, 58, 82, 68, value].map((v, i) => <div key={i} className="flex-1 rounded-t-md bg-[#0e8f4a]/20" style={{ height: `${Math.max(12, (v / 100) * height)}%` }}><div className="h-full w-full rounded-t-md bg-[#0e8f4a]" /></div>)}</div>;
}

export function SifoLandingShowcase() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f7f5] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5"><LogoMark /><div><div className="text-lg font-black tracking-tight">SifoBooks</div><div className="hidden text-[9px] font-semibold uppercase tracking-[.18em] text-slate-400 sm:block">Smart Business. Simplified.</div></div></div>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
            <a href="#platform">Platform</a><a href="#pos">POS</a><a href="#accounting">Accounting</a><a href="#compliance">Compliance</a><a href="#reports">Reports</a>
          </nav>
          <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e8f4a] px-4 py-2 text-xs font-bold text-white shadow-sm">Open SifoBooks <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(14,143,74,.10),transparent_32%),radial-gradient(circle_at_12%_72%,rgba(37,99,235,.07),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0e8f4a]/20 bg-[#0e8f4a]/5 px-3 py-1.5 text-[11px] font-bold text-[#0e8f4a]"><Sparkles className="h-3.5 w-3.5" /> Business management for real operations</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Run the business.<br /><span className="text-[#0e8f4a]">Know the numbers.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">SifoBooks connects sales, purchases, inventory, POS, banking, payroll, compliance and accounting into one controlled business record.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-[#0e8f4a] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0e8f4a]/20">Start with SifoBooks <ArrowRight className="h-4 w-4" /></Link><a href="#platform" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"><PlayIcon /> See how it works</a></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"><span>✓ Multi-company</span><span>✓ Zambia-ready</span><span>✓ Role-based</span><span>✓ Audit trail</span></div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-2xl shadow-slate-300/40 sm:p-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex h-11 items-center gap-3 border-b border-slate-200 px-4"><LogoMark /><div className="hidden w-48 rounded-lg bg-slate-100 px-3 py-1.5 text-[9px] text-slate-400 sm:block">Search invoices, customers, stock...</div><div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400"><span>🔔</span><span className="grid h-7 w-7 place-items-center rounded-full bg-[#0e8f4a] font-bold text-white">PS</span></div></div>
              <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[125px_1fr]">
                <aside className="hidden border-r border-slate-200 bg-slate-50 p-2 sm:block"><div className="rounded-lg bg-[#0e8f4a] px-2 py-2 text-[9px] font-bold text-white">⌂ Dashboard</div>{["Sales","Purchases","Inventory","POS","Banking","Accounting","Payroll","Compliance","Reports"].map(x => <div key={x} className="px-2 py-2 text-[8px] font-semibold text-slate-500">{x}</div>)}</aside>
                <div className="min-w-0 p-3 sm:p-4"><div className="flex items-center justify-between"><div><div className="text-[8px] uppercase tracking-wider text-slate-400">MKP Farms Limited</div><div className="text-sm font-black">Good evening, Pritchard</div></div><div className="rounded-lg border px-2 py-1 text-[8px]">This Month⌄</div></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Sales","125,430","#0e8f4a"],["Purchases","78,210","#2563eb"],["Expenses","24,580","#f59e0b"],["Net Profit","22,640","#7c3aed"]].map(([l,v,c]) => <div key={l} className="rounded-xl border border-slate-100 p-2.5"><div className="text-[7px] font-semibold text-slate-400">{l}</div><div className="mt-1 text-xs font-black" style={{color:c}}>{v}</div><div className="mt-1 h-1 rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full" style={{backgroundColor:c}} /></div></div>)}</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1.5fr_1fr]"><div className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between text-[8px] font-bold"><span>Sales & Purchases Trend</span><span className="text-slate-400">2026⌄</span></div><MiniBar value={88} height={100} /></div><div className="rounded-xl border border-slate-100 p-3"><div className="text-[8px] font-bold">Expense Breakdown</div><div className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full border-[13px] border-[#0e8f4a]/25 border-r-[#f59e0b] border-t-[#2563eb] text-[8px] font-black">24,580</div></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20"><div className="max-w-2xl"><div className="text-xs font-black uppercase tracking-[.18em] text-[#0e8f4a]">One connected platform</div><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Everything your team needs, without the clutter.</h2><p className="mt-3 text-slate-600">Every module has a clear purpose, consistent navigation and a direct path from action to result.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{modules.map(([name, Icon, text, tone]) => <a key={name} href={`#${name.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-11 w-11 place-items-center rounded-xl" style={{backgroundColor:`${tone}14`,color:tone}}><Icon className="h-5 w-5" /></div><div className="mt-4 flex items-center justify-between"><h3 className="font-black">{name}</h3><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" /></div><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></a>)}</div></section>

      <section id="pos" className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-20"><div><div className="text-xs font-black uppercase tracking-[.18em] text-[#059669]">Retail POS</div><h2 className="mt-2 text-3xl font-black">A proper checkout screen.</h2><p className="mt-3 text-slate-600">Built for a cashier: scan or search products, see stock, control the shift, take payment and finish the sale without leaving the workflow.</p><ul className="mt-5 space-y-2 text-sm font-semibold text-slate-600">{["Register + cashier shift required","Cash, card, mobile money and credit","Receipt, stock and accounting stay connected","Offline-ready with safe retry handling"].map(x => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#0e8f4a]" />{x}</li>)}</ul></div><div className="rounded-3xl border border-slate-200 bg-[#f8faf9] p-3 shadow-xl"><div className="grid gap-3 md:grid-cols-[1.25fr_.75fr]"><div className="rounded-2xl border bg-white p-3"><div className="flex items-center justify-between"><div><div className="text-[9px] font-bold text-slate-400">REGISTER 01 • CHIBOMBO</div><div className="font-black">John — Open Shift</div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">ACTIVE</span></div><div className="mt-3 flex gap-2 rounded-xl border px-3 py-2 text-xs text-slate-400"><ScanLine className="h-4 w-4" /> Scan barcode or search product...</div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Boron Liquid","444"],["Fertanix","958"],["Satva Liquid","384"],["Breakfast Meal","200"]].map(([n,p]) => <div key={n} className="rounded-xl border p-2"><div className="grid h-12 place-items-center rounded-lg bg-slate-100 text-[9px] font-black text-slate-400">IMG</div><div className="mt-1 truncate text-[9px] font-bold">{n}</div><div className="text-[9px] font-black text-[#0e8f4a]">K{p}</div></div>)}</div><div className="mt-3 divide-y rounded-xl border text-[10px]"><div className="flex justify-between p-2"><span>Boron Liquid 1 L × 2</span><b>K888</b></div><div className="flex justify-between p-2"><span>Breakfast Meal 25 KG × 1</span><b>K200</b></div><div className="flex justify-between p-2 font-black"><span>Total</span><span>K1,262.08</span></div></div></div><div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="text-[9px] font-bold text-slate-400">PAYMENT</div><div className="mt-2 text-2xl font-black">K1,262.08</div><div className="mt-4 grid grid-cols-2 gap-2">{["Cash","Card","MoMo","Credit"].map(x => <button key={x} className="rounded-lg bg-white/10 px-2 py-2 text-[9px] font-bold">{x}</button>)}</div><button className="mt-3 w-full rounded-lg bg-[#0e8f4a] px-3 py-2.5 text-[10px] font-black">Complete Sale →</button></div></div></div></div></section>

      <section id="accounting" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20"><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-wider text-[#0e8f4a]">Document preview</div><h3 className="mt-1 text-xl font-black">Sample Sales Invoice</h3></div><button className="rounded-lg border px-3 py-1.5 text-xs font-bold">View / Print</button></div><div className="mt-5 rounded-2xl border p-5"><div className="flex items-start justify-between"><div><div className="text-lg font-black">SifoBooks</div><div className="text-[10px] text-slate-500">MKP Farms Limited • Ndola, Zambia</div></div><span className="rounded-lg bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">INVOICE</span></div><div className="mt-5 grid grid-cols-2 gap-4 text-[10px]"><div><span className="text-slate-400">Invoice No.</span><div className="font-bold">INV-2026-0013</div></div><div><span className="text-slate-400">Date</span><div className="font-bold">09 Sep 2026</div></div><div><span className="text-slate-400">Customer</span><div className="font-bold">Cash Customer</div></div><div><span className="text-slate-400">VAT</span><div className="font-bold">16%</div></div></div><div className="mt-5 overflow-hidden rounded-xl border text-[10px]"><div className="grid grid-cols-4 bg-slate-50 p-2 font-black"><span>Item</span><span>Qty</span><span>Price</span><span className="text-right">Total</span></div>{[["Boron Liquid 1 L","2","444","888"],["Breakfast Meal 25 KG","1","200","200"]].map(r => <div key={r[0]} className="grid grid-cols-4 border-t p-2"><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span><span className="text-right font-bold">{r[3]}</span></div>)}<div className="border-t p-3 text-right"><div>Subtotal K1,088.00</div><div>VAT K174.08</div><div className="mt-1 text-base font-black">Total K1,262.08</div></div></div></div></div><div id="reports" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-wider text-[#475569]">Accounting proof</div><h3 className="mt-1 text-xl font-black">General Ledger</h3></div><button className="rounded-lg border px-3 py-1.5 text-xs font-bold">View Full Ledger</button></div><p className="mt-1 text-xs text-slate-500">Account: Sales Revenue (4000)</p><div className="mt-5 overflow-hidden rounded-xl border text-[10px]"><div className="grid grid-cols-5 bg-slate-50 p-2 font-black"><span>Date</span><span>Ref</span><span>Description</span><span>Debit</span><span>Credit / Balance</span></div>{[["01-09","INV-0013","Sales — Cash","0.00","888.00 / 5,440"],["03-09","INV-0012","Sales — Retail","0.00","1,250 / 6,690"],["05-09","INV-0013","Sales — Cash","0.00","2,340 / 9,030"],["09-09","INV-0014","Sales — Cash","0.00","1,262 / 10,292"]].map(r => <div key={r[0]+r[1]} className="grid grid-cols-5 border-t p-2"><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><span className="font-bold">{r[4]}</span></div>)}</div><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><div className="text-[9px] text-slate-400">Trial Balance</div><div className="mt-1 font-black">Balanced ✓</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-[9px] text-slate-400">Reports</div><div className="mt-1 font-black">P&L • Balance Sheet</div></div></div></div></div></section>

      <section id="compliance" className="bg-slate-950 text-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:py-20"><div><div className="text-xs font-black uppercase tracking-[.18em] text-[#7dd3a5]">Compliance centre</div><h2 className="mt-2 text-3xl font-black">Know what is due before it becomes a problem.</h2><p className="mt-3 text-sm leading-6 text-slate-400">Keep statutory obligations visible alongside the accounting records that support them.</p><div className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">Open obligations</div><div className="mt-1 text-2xl font-black">5</div></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">Due soon</div><div className="mt-1 text-2xl font-black text-[#f59e0b]">4</div></div></div></div><div className="rounded-3xl border border-white/10 bg-white/[.04] p-3"><div className="rounded-2xl bg-white text-slate-900"><div className="flex items-center justify-between border-b p-4"><div className="font-black">Statutory obligations</div><div className="rounded-lg border px-2 py-1 text-[10px]">Aug 2026⌄</div></div>{compliance.map(([name,due,status,tone]) => <div key={name} className="flex items-center gap-3 border-b p-3 last:border-0"><div className="grid h-8 w-8 place-items-center rounded-lg" style={{backgroundColor:`${tone}14`,color:tone}}><ShieldCheck className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{name}</div><div className="text-[10px] text-slate-400">{due}</div></div><span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{backgroundColor:`${tone}14`,color:tone}}>{status}</span></div>)}</div></div></div></section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20"><div className="grid gap-5 lg:grid-cols-3"><div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-sm font-black"><BarChart3 className="h-4 w-4 text-[#0e8f4a]" /> Reports that explain the business</div><p className="mt-3 text-sm leading-6 text-slate-500">Profit & Loss, Balance Sheet, Cash Flow, Inventory Valuation, Sales and Purchase reports with filters, print and export.</p><div className="mt-4 flex flex-wrap gap-2">{["P&L","Balance Sheet","Cash Flow","Stock Valuation"].map(x => <span key={x} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold">{x}</span>)}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-sm font-black"><FileText className="h-4 w-4 text-[#2563eb]" /> Clean documents</div><p className="mt-3 text-sm leading-6 text-slate-500">A consistent document language across invoices, bills, receipts, stock transfers, journals and payroll documents.</p><div className="mt-4 rounded-xl border border-dashed p-3 text-xs font-bold text-slate-500">View → Print → PDF → Export</div></div><div className="rounded-3xl border border-[#0e8f4a]/20 bg-[#0e8f4a]/5 p-5"><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-[#0e8f4a]" /> SifoAI guidance</div><p className="mt-3 text-sm leading-6 text-slate-600">After each workflow, SifoAI can explain what happened and show the next action — without replacing accounting controls.</p><div className="mt-4 rounded-xl bg-white p-3 text-xs font-semibold shadow-sm">“Your transfer is received. Next: reconcile Chibombo stock.”</div></div></div></section>

      <section className="border-t border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6"><div className="mx-auto max-w-2xl"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0e8f4a] text-xl font-black text-white">S</div><h2 className="mt-4 text-3xl font-black">One system. One record. Clear decisions.</h2><p className="mt-3 text-slate-500">SifoBooks brings the operational screen and the accounting record together.</p><Link to="/auth" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0e8f4a] px-6 py-3 text-sm font-bold text-white">Open SifoBooks <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-10 border-t pt-5 text-xs text-slate-400">SifoBooks v3.0 • Smart Business. Simplified. • © 2026 SifoBooks</div></div></section>
      <div id="whiteboard"><SifoLandingPresentation /></div>
    </main>
  );
}

function PlayIcon() { return <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-[8px] text-white">▶</span>; }
