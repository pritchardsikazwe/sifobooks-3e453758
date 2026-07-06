import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, CheckCircle2, ShieldCheck, Zap, BarChart3, Wallet,
  Users, FileText, ReceiptText, CreditCard, Truck, ShoppingCart, FileBox,
  Landmark, BookOpen, BookText, PiggyBank, Boxes, Warehouse, ClipboardEdit,
  UserSquare, CalendarCheck, CalendarDays, Banknote, Building2, Bell,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Accounting ERP for African Businesses" },
      { name: "description", content: "SifoBooks is a complete accounting ERP — sales, purchases, inventory, finance, HR, payroll and tax compliance in one bold platform." },
      { property: "og:title", content: "SifoBooks — Accounting ERP" },
      { property: "og:description", content: "Run your entire business from one place. Sales, purchases, inventory, payroll, and ZRA compliance." },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { section: "Sales", color: "from-emerald-500 to-teal-500", items: [
    { icon: Users, title: "Customers", desc: "CRM with balances & comms history" },
    { icon: FileText, title: "Quotes", desc: "Draft, send, approve, convert" },
    { icon: ReceiptText, title: "Invoices", desc: "ZRA-ready with VAT & TPIN" },
    { icon: CreditCard, title: "Receipts", desc: "Cash, mobile money, bank" },
  ]},
  { section: "Purchases", color: "from-blue-500 to-indigo-500", items: [
    { icon: Truck, title: "Suppliers", desc: "Vendor master with balances" },
    { icon: ShoppingCart, title: "Purchase Orders", desc: "Approve, track, receive" },
    { icon: FileBox, title: "Bills", desc: "Match POs to supplier invoices" },
    { icon: Wallet, title: "Supplier Payments", desc: "Bank, cash, cheque, MoMo" },
  ]},
  { section: "Finance", color: "from-violet-500 to-purple-500", items: [
    { icon: Landmark, title: "Banking", desc: "Statements & reconciliation" },
    { icon: BookOpen, title: "Chart of Accounts", desc: "Assets, liabilities, equity" },
    { icon: BookText, title: "Journal Entries", desc: "Double-entry bookkeeping" },
    { icon: PiggyBank, title: "Budgets", desc: "Plan vs. actual by dept" },
  ]},
  { section: "Inventory", color: "from-orange-500 to-red-500", items: [
    { icon: Boxes, title: "Items", desc: "SKUs, HS codes, valuation" },
    { icon: Warehouse, title: "Warehouses", desc: "Multi-location stock" },
    { icon: ClipboardEdit, title: "Adjustments", desc: "Count, damage, transfer" },
    { icon: BarChart3, title: "Reports", desc: "Live stock valuation" },
  ]},
  { section: "HR & Payroll", color: "from-pink-500 to-rose-500", items: [
    { icon: UserSquare, title: "Employees", desc: "Full HR master file" },
    { icon: CalendarCheck, title: "Attendance", desc: "Clock in/out tracking" },
    { icon: CalendarDays, title: "Leave", desc: "Requests & approvals" },
    { icon: Banknote, title: "Payroll", desc: "PAYE, NAPSA, NHIMA" },
  ]},
  { section: "Admin & Compliance", color: "from-amber-500 to-yellow-500", items: [
    { icon: Building2, title: "Company Setup", desc: "Branches, departments, tax" },
    { icon: ShieldCheck, title: "Compliance", desc: "ZRA, NAPSA obligations" },
    { icon: Bell, title: "Notifications", desc: "Real-time alerts" },
    { icon: ShieldCheck, title: "Audit Trail", desc: "Every action logged" },
  ]},
];

const STATS = [
  { value: "24", label: "Modules" },
  { value: "6", label: "Departments" },
  { value: "100%", label: "ZRA Ready" },
  { value: "ZMW", label: "Native Currency" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-sm font-black text-slate-900">SB</div>
            <span className="text-xl font-black tracking-tight">SifoBooks</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#modules" className="hover:text-emerald-600">Modules</a>
            <a href="#features" className="hover:text-emerald-600">Features</a>
            <a href="#compliance" className="hover:text-emerald-600">Compliance</a>
            <a href="#pricing" className="hover:text-emerald-600">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" className="font-semibold">Sign in</Button></Link>
            <Link to="/auth"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-600 mb-8">
            <Zap className="h-3.5 w-3.5" /> BUILT FOR AFRICAN BUSINESSES · ZMW · TPIN · ZRA
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] mb-6">
            Run your <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">entire business</span><br />
            from one place.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 font-medium">
            Sales. Purchases. Inventory. Finance. HR. Payroll. Compliance.
            <span className="block font-bold text-foreground mt-2">One bold accounting ERP.</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="h-14 px-8 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button></Link>
            <a href="#modules"><Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold">
              Explore Modules
            </Button></a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mt-20">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-3">Complete Coverage</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">Every module you need.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Six departments. Twenty-four modules. Zero add-ons required.
            </p>
          </div>

          <div className="space-y-16">
            {MODULES.map(group => (
              <div key={group.section}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${group.color}`} />
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight">{group.section}</h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{group.items.length} modules</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {group.items.map(item => (
                    <Card key={item.title} className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all border-2 hover:border-emerald-500/50 group cursor-default">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${group.color} grid place-items-center mb-4 group-hover:scale-110 transition-transform`}>
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="font-black text-lg mb-1">{item.title}</div>
                      <div className="text-sm text-muted-foreground font-medium">{item.desc}</div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 border-t border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-3">Why SifoBooks</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Built to move fast.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: "Real-Time Dashboard", desc: "Cash flow, receivables, payables, KPIs — updated live as transactions post." },
              { icon: ShieldCheck, title: "Bank-Grade Security", desc: "Row-level security, audit trails, and role-based access on every record." },
              { icon: Zap, title: "Automatic Everything", desc: "Invoice balances, stock movements, and payroll calculations run themselves." },
            ].map(f => (
              <Card key={f.title} className="p-8 border-2">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 grid place-items-center mb-6">
                  <f.icon className="h-7 w-7 text-emerald-600" />
                </div>
                <div className="text-2xl font-black mb-2">{f.title}</div>
                <div className="text-muted-foreground font-medium">{f.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section id="compliance" className="py-24 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-sm font-black uppercase tracking-widest text-emerald-600 mb-3">Fully Compliant</div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Zambian tax authorities. Handled.</h2>
          <p className="text-lg text-muted-foreground font-medium mb-10 max-w-2xl mx-auto">
            Native support for ZRA VAT, TPIN, PAYE brackets, NAPSA contributions, and NHIMA deductions.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["ZRA VAT", "TPIN", "PAYE", "NAPSA", "NHIMA", "Turnover Tax", "Withholding Tax"].map(tag => (
              <div key={tag} className="rounded-full border-2 border-emerald-500/30 bg-emerald-500/5 px-5 py-2 text-sm font-black text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="inline h-4 w-4 mr-1.5 -mt-0.5" />{tag}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="p-12 md:p-16 text-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-2xl">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">Ready to take control?</h2>
            <p className="text-xl font-medium opacity-90 mb-8">Get every module. One flat plan. Start today.</p>
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 text-base font-black bg-white text-emerald-700 hover:bg-white/90">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-[10px] font-black text-slate-900">SB</div>
            <span className="font-bold text-foreground">SifoBooks</span>
            <span>© {new Date().getFullYear()} · Accounting ERP</span>
          </div>
          <div className="flex gap-6 font-semibold">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#modules" className="hover:text-foreground">Modules</a>
            <a href="#compliance" className="hover:text-foreground">Compliance</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
