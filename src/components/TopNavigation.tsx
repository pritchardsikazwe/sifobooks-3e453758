import { Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
    ["Items", "Overview", "Transfers", "Stock Counts", "Control Center", "Stock Card / History", "Stock Adjustments", "Locations", "Warehouses", "Batches & Expiry", "Serial Numbers"]
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



  const menus = [
    { label: "Home", icon: "Home", items: match(["/dashboard", "/notifications", "/approvals"], ["Home", "Notifications", "Approvals"]) },
    { label: "Customers", icon: "Users", items: take([...customers, ...sales]) },
    { label: "Suppliers", icon: "Truck", items: take([...suppliers, ...purchases]) },
    { label: "Items", icon: "Boxes", items: take([...inventory, ...manufacturing]) },
    { label: "Banking", icon: "Landmark", items: take(banking) },
    { label: "Accounts", icon: "BookOpen", items: take(accounting) },
    { label: "POS", icon: "ShoppingBag", items: take(pos) },
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
      className="hidden border-b border-border bg-card px-2 md:block sm:px-4"
    >
      <div className="mx-auto flex h-10 max-w-[1800px] items-stretch overflow-x-auto no-scrollbar">
        {menus.map(menu => {
          const active = menu.items.some(i => pathname === i.url || pathname.startsWith(i.url + "/"));
          return (
            <DropdownMenu key={menu.label}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "group h-full shrink-0 gap-1 rounded-none border-b-2 border-transparent px-2.5 text-xs font-medium text-muted-foreground shadow-none",
                    "hover:border-primary hover:bg-muted/60 hover:text-foreground",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    active && "border-primary bg-muted/50 text-primary"
                  )}
                >
                  <span>{menu.label}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={1}
                className="z-50 w-[min(560px,calc(100vw-16px))] rounded-md border-border bg-popover p-1.5 shadow-elevated"
              >
                <DropdownMenuLabel className="px-2.5 py-2 text-xs font-semibold text-foreground">
                  {menu.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                  {menu.items.map(item => {
                    const ItemIcon = iconFor(item.iconName);
                    const itemActive = pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <DropdownMenuItem
                        key={item.url}
                        asChild
                        className={cn(
                          "cursor-pointer rounded px-2.5 py-2 focus:bg-muted",
                          itemActive && "bg-muted text-primary"
                        )}
                      >
                        <Link to={item.url} className="flex min-w-0 items-start gap-2.5">
                          <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-popover-foreground">{item.title}</span>
                            {item.hint && (
                              <span className="mt-0.5 block line-clamp-1 text-[10px] leading-4 text-muted-foreground">{item.hint}</span>
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
      </div>
    </nav>
  );
}
