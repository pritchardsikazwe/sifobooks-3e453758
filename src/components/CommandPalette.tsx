import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Plus, FileText, Users, Truck, CreditCard, Receipt, FileBox, BookText, Boxes, UserSquare,
  ClipboardList, Landmark, Sparkles, BarChart3, LayoutDashboard, ShieldCheck, CalendarClock,
  Wallet, ArrowUpRight, ArrowDownRight, Building2, Search,
} from "lucide-react";
import { MODULES } from "@/lib/modules";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

const RECENT_KEY = "sifobooks.cmdk.recent";
const MAX_RECENT = 8;

type Recent = { label: string; url: string; group: string };

function loadRecents(): Recent[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function pushRecent(r: Recent) {
  const cur = loadRecents().filter(x => x.url !== r.url);
  const next = [r, ...cur].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
}

const QUICK_ACTIONS: { label: string; url: string; icon: any; hint: string }[] = [
  { label: "New Invoice", url: "/invoices/new", icon: FileText, hint: "Sales" },
  { label: "New Quote", url: "/quotes/new", icon: ClipboardList, hint: "Sales" },
  { label: "Record Receipt", url: "/receipts", icon: CreditCard, hint: "Sales" },
  { label: "New Bill", url: "/bills", icon: FileBox, hint: "Purchases" },
  { label: "Pay Supplier", url: "/bill-payments", icon: Wallet, hint: "Purchases" },
  { label: "Record Expense", url: "/expenses", icon: Receipt, hint: "Purchases" },
  { label: "New Journal Entry", url: "/journal-entries", icon: BookText, hint: "Accounting" },
  { label: "Smart Posting Wizard", url: "/posting-wizard", icon: Sparkles, hint: "Accounting" },
  { label: "New Customer", url: "/customers", icon: Users, hint: "Sales" },
  { label: "New Supplier", url: "/suppliers", icon: Truck, hint: "Purchases" },
  { label: "New Employee", url: "/employees", icon: UserSquare, hint: "Payroll" },
  { label: "New Stock Item", url: "/stock", icon: Boxes, hint: "Inventory" },
];

const JUMPS: { label: string; url: string; icon: any }[] = [
  { label: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { label: "Reports Centre", url: "/reports", icon: BarChart3 },
  { label: "Banking", url: "/banking", icon: Landmark },
  { label: "Chart of Accounts", url: "/chart-of-accounts", icon: BookText },
  { label: "Period Close", url: "/period-close", icon: CalendarClock },
  { label: "Compliance", url: "/compliance", icon: ShieldCheck },
  { label: "Modules", url: "/modules", icon: Sparkles },
  { label: "Company Setup", url: "/setup", icon: Building2 },
];

const REPORT_ITEMS: { label: string; url: string }[] = [
  { label: "Profit & Loss", url: "/reports/pnl" },
  { label: "Balance Sheet", url: "/reports/balance-sheet" },
  { label: "Trial Balance", url: "/reports/trial-balance" },
  { label: "General Ledger", url: "/reports/general-ledger" },
  { label: "Cash Flow", url: "/reports/cash-flow" },
  { label: "Aged Receivables", url: "/reports/aged-receivables" },
  { label: "Aged Payables", url: "/reports/aged-payables" },
  { label: "Customer Statement", url: "/reports/customer-statement" },
  { label: "Supplier Statement", url: "/reports/supplier-statement" },
  { label: "Sales by Customer", url: "/reports/sales-by-customer" },
  { label: "Bank Reconciliation", url: "/reports/bank-reconciliation" },
  { label: "Management Pack", url: "/reports/management-pack" },
  { label: "Annual Financial Statements", url: "/reports/afs" },
  { label: "VAT Return", url: "/reports/vat-return" },
  { label: "Income Tax Computation", url: "/reports/income-tax" },
  { label: "Turnover Tax", url: "/reports/turnover-tax" },
  { label: "Payroll Summary", url: "/reports/payroll-summary" },
  { label: "Payroll Schedules", url: "/reports/payroll-schedules" },
  { label: "Inventory Valuation", url: "/reports/inventory-valuation" },
];

type RecentDoc = {
  kind: "invoice" | "bill" | "expense" | "customer" | "supplier";
  id: string;
  label: string;
  url: string;
  sub?: string;
};

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { installed } = useInstalledModules();
  const { canView } = usePermissions();
  const [recents, setRecents] = useState<Recent[]>([]);
  const [docs, setDocs] = useState<RecentDoc[]>([]);

  useEffect(() => { if (open) setRecents(loadRecents()); }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [inv, bl, ex, cs, sp] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, total").order("created_at", { ascending: false }).limit(6),
        supabase.from("bills").select("id, bill_number, total").order("created_at", { ascending: false }).limit(6),
        supabase.from("expenses").select("id, description, amount").order("created_at", { ascending: false }).limit(6),
        supabase.from("customers").select("id, name").order("created_at", { ascending: false }).limit(6),
        supabase.from("suppliers").select("id, name").order("created_at", { ascending: false }).limit(6),
      ]);
      if (cancelled) return;
      const list: RecentDoc[] = [];
      (inv.data ?? []).forEach((r: any) => list.push({ kind: "invoice", id: r.id, label: `Invoice ${r.invoice_number ?? r.id.slice(0, 8)}`, sub: r.total ? `K${Number(r.total).toLocaleString()}` : undefined, url: "/invoices" }));
      (bl.data ?? []).forEach((r: any) => list.push({ kind: "bill", id: r.id, label: `Bill ${r.bill_number ?? r.id.slice(0, 8)}`, sub: r.total ? `K${Number(r.total).toLocaleString()}` : undefined, url: "/bills" }));
      (ex.data ?? []).forEach((r: any) => list.push({ kind: "expense", id: r.id, label: r.description || "Expense", sub: r.amount ? `K${Number(r.amount).toLocaleString()}` : undefined, url: "/expenses" }));
      (cs.data ?? []).forEach((r: any) => list.push({ kind: "customer", id: r.id, label: r.name, url: "/customers" }));
      (sp.data ?? []).forEach((r: any) => list.push({ kind: "supplier", id: r.id, label: r.name, url: "/suppliers" }));
      setDocs(list);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const navigable = useMemo(() => {
    const out: { title: string; url: string; group: string }[] = [];
    for (const m of MODULES) {
      if (!m.core && !installed.has(m.key)) continue;
      if (!canView(m.key)) continue;
      for (const r of m.routes) out.push({ title: r.title, url: r.url, group: m.category });
    }
    return out;
  }, [installed, canView]);

  const go = (label: string, url: string, group = "Navigate") => {
    pushRecent({ label, url, group });
    onOpenChange(false);
    navigate({ to: url as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search actions, reports, pages, or recent records…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-4 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            No results. Try "invoice", "P&L", or a customer name.
          </div>
        </CommandEmpty>

        {recents.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recents.map(r => (
                <CommandItem key={"r:" + r.url} value={`recent ${r.label} ${r.group}`} onSelect={() => go(r.label, r.url, r.group)}>
                  <Sparkles className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{r.label}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{r.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <CommandItem key={"q:" + a.label} value={`action ${a.label} ${a.hint}`} onSelect={() => go(a.label, a.url, a.hint)}>
                <Icon className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">{a.label}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{a.hint}</span>
              </CommandItem>
            );
          })}
          <CommandItem value="action new" onSelect={() => go("New (chooser)", "/dashboard", "Actions")}>
            <Plus className="h-4 w-4 mr-2 text-primary" /> More create options…
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Jump to">
          {JUMPS.map(j => {
            const Icon = j.icon;
            return (
              <CommandItem key={"j:" + j.url} value={`jump ${j.label}`} onSelect={() => go(j.label, j.url, "Jump")}>
                <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">{j.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Reports">
          {REPORT_ITEMS.map(r => (
            <CommandItem key={"rep:" + r.url} value={`report ${r.label}`} onSelect={() => go(r.label, r.url, "Reports")}>
              <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {docs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent records">
              {docs.map(d => (
                <CommandItem key={`${d.kind}:${d.id}`} value={`record ${d.kind} ${d.label} ${d.sub ?? ""}`} onSelect={() => go(d.label, d.url, "Records")}>
                  {d.kind === "invoice" && <FileText className="h-4 w-4 mr-2 text-emerald-600" />}
                  {d.kind === "bill" && <FileBox className="h-4 w-4 mr-2 text-amber-600" />}
                  {d.kind === "expense" && <Receipt className="h-4 w-4 mr-2 text-rose-600" />}
                  {d.kind === "customer" && <ArrowUpRight className="h-4 w-4 mr-2 text-primary" />}
                  {d.kind === "supplier" && <ArrowDownRight className="h-4 w-4 mr-2 text-muted-foreground" />}
                  <span className="font-medium truncate">{d.label}</span>
                  {d.sub && <span className="ml-auto text-[11px] text-muted-foreground num">{d.sub}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navigable.map(r => (
            <CommandItem key={"n:" + r.url} value={`nav ${r.title} ${r.group}`} onSelect={() => go(r.title, r.url, r.group)}>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-2 w-20 truncate">{r.group}</span>
              <span className="font-medium">{r.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
