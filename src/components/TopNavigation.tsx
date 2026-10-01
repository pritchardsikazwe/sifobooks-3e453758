import { Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ChevronDown, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInstalledModules } from "@/hooks/useInstalledModules";
import { usePermissions } from "@/hooks/usePermissions";
import { hubsForMode, visibleHubGroups, type HubItem } from "@/lib/nav-hubs";
import { SIFOBOOKS_EDITION } from "@/lib/edition";
import { cn } from "@/lib/utils";

type Menu = {
  label: string;
  icon: keyof typeof Icons;
  items: HubItem[];
};

const iconFor = (name?: string) => {
  if (!name) return Icons.Circle;
  return (Icons as any)[name] ?? (Icons as any)[name.replace("Icon", "")] ?? Icons.Circle;
};

function useNavigationMenus(): Menu[] {
  const { installed } = useInstalledModules();
  const { canView, isStaff, isSuperAdmin } = usePermissions();
  const pathname = useRouterState({ select: r => r.location.pathname });

  const hubs = hubsForMode(undefined, SIFOBOOKS_EDITION);
  const all: HubItem[] = [];
  const seen = new Set<string>();

  for (const hub of hubs) {
    for (const group of visibleHubGroups(hub, installed, canView)) {
      for (const item of group.items) {
        if ((item as any).superAdminOnly && !isSuperAdmin) continue;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        all.push(item);
      }
    }
  }

  const match = (patterns: string[], titles: string[] = []) =>
    all.filter(item =>
      patterns.some(p => item.url === p || item.url.startsWith(p + "/")) ||
      titles.some(t => item.title.toLowerCase() === t.toLowerCase())
    );

  const take = (items: HubItem[]) => {
    const used = new Set<string>();
    return items.filter(item => {
      if (used.has(item.url)) return false;
      used.add(item.url);
      return true;
    });
  };

  const customers = match(["/customers", "/reports/customer-statement"], ["Customers", "Customer Statement"]);
  const suppliers = match(["/suppliers", "/reports/supplier-statement"], ["Suppliers", "Supplier Statement"]);

  const sales = take([
    ...match(["/invoices", "/quotes", "/receipts", "/credit-notes", "/returns"], ["Invoices", "Quotes", "Receive Payments", "Credit Notes", "Returns"]),
    ...all.filter(i => i.module === "sales" && !customers.includes(i) && !suppliers.includes(i)),
  ]);

  const purchases = take([
    ...match(["/bills", "/purchase-orders", "/expenses", "/bill-payments", "/goods-receipts", "/quotation-comparison", "/expense-rules"], ["Bills", "Purchase Orders", "Expenses", "Supplier Payments", "Goods Receipts", "Quotation Comparison"]),
    ...all.filter(i => i.module === "purchases" && !customers.includes(i) && !suppliers.includes(i)),
  ]);

  const inventory = match(
    ["/inventory", "/stock", "/warehouses", "/stock-counts", "/stock-adjustments", "/stock-batches", "/stock-serials", "/inventory/"],
    ["Items", "Overview", "Transfers", "Stock Counts", "Reconciliation", "Control Center", "Stock Card / History", "Stock Adjustments", "Locations", "Warehouses", "Batches & Expiry", "Serial Numbers"]
  );

  const banking = match(
    ["/banking", "/bank-accounts", "/bank-rules", "/reconciliation", "/reconciliation-sessions", "/cashbook"],
    ["Banking", "Bank Accounts", "Bank Rules", "Recon Sessions", "Cashbook", "Reconciliation"]
  );

  const accounting = match(
    ["/chart-of-accounts", "/journal-entries", "/opening-balances", "/period-close", "/fixed-assets", "/budgets", "/fx-rates", "/posting-wizard"],
    ["Chart of Accounts", "Journal Entries", "Opening Balances", "Period Close", "Fixed Assets", "Budgets", "Exchange Rates", "Smart Posting Wizard"]
  );

  const pos = match(
    ["/pos", "/pos-sales", "/sifopos", "/pos-workers", "/pos/"],
    ["Retail POS", "POS Sales History", "SifoPOS Hub", "Worker Access & Roles", "POS Control Centre"]
  );

  const manufacturing = match(
    ["/inventory/production"],
    ["Production Batches", "Manufacturing"]
  );

  const payroll = match(
    ["/payroll", "/employees", "/attendance", "/timesheet", "/payroll-dashboard", "/payroll-review", "/payroll-payments", "/payroll-statutory", "/payroll-rules", "/payroll-setup", "/payroll-transactions", "/payroll-tools", "/leave", "/jobs", "/hr-compliance", "/hr360"],
    ["Payroll", "Employees", "Attendance", "Timesheet", "Leave", "Jobs & Recruitment", "Statutory Centre", "Payroll Setup"]
  );

  const reports = match(
    ["/reports", "/compliance", "/compliance-centre"],
    ["Reports Centre", "Trial Balance", "Annual Financial Statements", "VAT Return (VAT 3)", "Income Tax Computation", "Turnover Tax", "Compliance", "Government Compliance"]
  );

  const company = match(
    ["/setup", "/documents-branding", "/industry", "/modules", "/subscription", "/learn"],
    ["Company Setup", "Documents & Branding", "Industry & Business", "Modules", "Subscription", "Learn Centre", "New Company Setup", "Accounting Basics"]
  );

  const administration = match(
    ["/roles", "/admin", "/audit-logs", "/approval-centre", "/approvals", "/system-health"],
    ["Users & Roles", "Administration", "Audit Logs", "Approval Centre", "Approvals", "System Health"]
  );

  const menuTheme: Record<string, { iconBg: string; iconText: string; activeBg: string }> = {
  Home: { iconBg: "bg-[#EAF6F0]", iconText: "text-[#07834F]", activeBg: "bg-[#EAF6F0]" },
  Customers: { iconBg: "bg-[#EEF5FF]", iconText: "text-[#2563EB]", activeBg: "bg-[#EEF5FF]" },
  Suppliers: { iconBg: "bg-[#FFF5E8]", iconText: "text-[#C77700]", activeBg: "bg-[#FFF5E8]" },
  Sales: { iconBg: "bg-[#EAFBF4]", iconText: "text-[#059669]", activeBg: "bg-[#EAFBF4]" },
  Purchases: { iconBg: "bg-[#FFF1F2]", iconText: "text-[#E11D48]", activeBg: "bg-[#FFF1F2]" },
  Inventory: { iconBg: "bg-[#F3F0FF]", iconText: "text-[#7C3AED]", activeBg: "bg-[#F3F0FF]" },
  Banking: { iconBg: "bg-[#ECFDF5]", iconText: "text-[#047857]", activeBg: "bg-[#ECFDF5]" },
  Accounting: { iconBg: "bg-[#EFF6FF]", iconText: "text-[#1D4ED8]", activeBg: "bg-[#EFF6FF]" },
  POS: { iconBg: "bg-[#FFF7ED]", iconText: "text-[#EA580C]", activeBg: "bg-[#FFF7ED]" },
  Manufacturing: { iconBg: "bg-[#F5F3FF]", iconText: "text-[#6D28D9]", activeBg: "bg-[#F5F3FF]" },
  "HR & Payroll": { iconBg: "bg-[#FDF2F8]", iconText: "text-[#BE185D]", activeBg: "bg-[#FDF2F8]" },
  Reports: { iconBg: "bg-[#EFF6FF]", iconText: "text-[#0369A1]", activeBg: "bg-[#EFF6FF]" },
  Company: { iconBg: "bg-[#F8FAFC]", iconText: "text-[#475569]", activeBg: "bg-[#F8FAFC]" },
  Administration: { iconBg: "bg-[#F1F5F9]", iconText: "text-[#334155]", activeBg: "bg-[#F1F5F9]" },
};

  const menus = [
    { label: "Home", icon: "Home", items: match(["/dashboard", "/notifications", "/approvals"], ["Home", "Notifications", "Approvals"]) },
    { label: "Customers", icon: "Users", items: take(customers) },
    { label: "Suppliers", icon: "Truck", items: take(suppliers) },
    { label: "Sales", icon: "TrendingUp", items: sales },
    { label: "Purchases", icon: "ShoppingCart", items: purchases },
    { label: "Inventory", icon: "Boxes", items: take(inventory) },
    { label: "Banking", icon: "Landmark", items: take(banking) },
    { label: "Accounting", icon: "BookOpen", items: take(accounting) },
    { label: "POS", icon: "ShoppingBag", items: take(pos) },
    { label: "Manufacturing", icon: "Factory", items: take(manufacturing) },
    { label: "HR & Payroll", icon: "UsersRound", items: take(payroll) },
    { label: "Reports", icon: "BarChart3", items: take(reports) },
    { label: "Company", icon: "Building2", items: take(company) },
    { label: "Administration", icon: "Settings2", items: take(administration) },
  ].filter(m => m.items.length > 0 || m.label === "Home") as Menu[];

  // Staff see only the same permission-filtered routes. Avoid showing empty
  // administrative menus just because the owner has those capabilities.
  return menus.filter(m => !isStaff || m.items.length > 0);
}

export function TopNavigation() {
  const pathname = useRouterState({ select: r => r.location.pathname });
  const menus = useNavigationMenus();

  return (
    <nav
      aria-label="Main navigation"
      className="border-b border-[#DDEBE6] bg-white px-2 sm:px-4"
    >
      <div className="mx-auto flex h-[52px] max-w-[1800px] items-center gap-0.5 overflow-x-auto no-scrollbar">
        {menus.map(menu => {
          const Icon = iconFor(menu.icon);
          const theme = menuTheme[menu.label] ?? menuTheme.Home;
          const active = menu.items.some(i => pathname === i.url || pathname.startsWith(i.url + "/"));
          return (
            <DropdownMenu key={menu.label}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold text-[#526B65] outline-none transition-colors",
                    "hover:bg-[#F1F8F5] hover:text-[#07834F]",
                    "focus-visible:ring-2 focus-visible:ring-[#07834F]/30 focus-visible:ring-offset-1",
                    active && cn(theme.activeBg, theme.iconText)
                  )}
                >
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md", theme.iconBg, theme.iconText)}>
                    <Icon className="h-3.5 w-3.5 stroke-[2]" />
                  </span>
                  <span>{menu.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={7}
                className="z-50 w-[min(720px,calc(100vw-16px))] rounded-2xl border-[#DDEBE6] bg-white p-2 shadow-[0_18px_50px_rgba(23,59,58,.14)]"
              >
                <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#78908A]">
                  {menu.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#EAF1EE]" />
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {menu.items.map(item => {
                    const ItemIcon = iconFor(item.iconName);
                    const itemActive = pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <DropdownMenuItem
                        key={item.url}
                        asChild
                        className={cn(
                          "cursor-pointer rounded-xl px-3 py-2.5 focus:bg-[#F1F8F5]",
                          itemActive && "bg-[#EAF6F0]"
                        )}
                      >
                        <Link to={item.url} className="flex min-w-0 items-start gap-2.5">
                          <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", theme.iconBg, theme.iconText)}>
                            <ItemIcon className="h-4 w-4 stroke-[1.9]" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold text-[#173B3A]">{item.title}</span>
                            {item.hint && (
                              <span className="mt-0.5 block line-clamp-1 text-[10px] leading-4 text-[#718A84]">{item.hint}</span>
                            )}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        <div className="ml-auto hidden shrink-0 items-center gap-1 pl-2 lg:flex">
          <div className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E1ECE7] bg-[#F7FBF9] px-2 text-[10px] font-medium text-[#78908A]">
            <Search className="h-3.5 w-3.5" />
            <span>Ctrl K</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
