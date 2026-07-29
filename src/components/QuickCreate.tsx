import { Link } from "@tanstack/react-router";
import { Plus, FileText, Users, Truck, CreditCard, Receipt, FileBox, BookText, Boxes, UserSquare, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ITEMS = [
  { label: "Invoice", to: "/invoices/new", icon: FileText, group: "Sales" },
  { label: "Quote", to: "/quotes/new", icon: ClipboardList, group: "Sales" },
  { label: "Customer", to: "/customers", icon: Users, group: "Sales" },
  { label: "Receipt", to: "/receipts", icon: CreditCard, group: "Sales" },
  { label: "Bill", to: "/bills", icon: FileBox, group: "Purchases" },
  { label: "Supplier", to: "/suppliers", icon: Truck, group: "Purchases" },
  { label: "Expense", to: "/expenses", icon: Receipt, group: "Purchases" },
  { label: "Journal", to: "/journal-entries", icon: BookText, group: "Accounting" },
  { label: "Item", to: "/stock", icon: Boxes, group: "Inventory" },
  { label: "Employee", to: "/employees", icon: UserSquare, group: "Payroll" },
] as const;

const GROUPS = ["Sales", "Purchases", "Accounting", "Inventory", "Payroll"] as const;

export function QuickCreate() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {GROUPS.map((g, i) => {
          const items = ITEMS.filter(it => it.group === g);
          return (
            <div key={g}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">{g}</DropdownMenuLabel>
              {items.map(it => {
                const Icon = it.icon;
                return (
                  <DropdownMenuItem key={it.to + it.label} asChild>
                    <Link to={it.to}><Icon className="h-4 w-4 mr-2" /> {it.label}</Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
