import { Link } from "@tanstack/react-router";
import {
  Calculator, ReceiptText, ShoppingCart, Boxes, Landmark, Users, ShieldCheck, BarChart3,
} from "lucide-react";
import { MODULE_THEMES, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

const ORDER: ModuleKey[] = ["accounting", "sales", "purchases", "inventory", "banking", "payroll", "reports", "tax"];

const ICONS: Partial<Record<ModuleKey, any>> = {
  accounting: Calculator, sales: ReceiptText, purchases: ShoppingCart, inventory: Boxes,
  banking: Landmark, payroll: Users, reports: BarChart3, tax: ShieldCheck,
};

/**
 * Unified segmented module navigation shown under the page header.
 * One rounded container, scrolls horizontally on small screens.
 */
export function SifoModuleStrip({ active, className }: { active?: ModuleKey; className?: string }) {
  return (
    <div className={cn("overflow-x-auto no-scrollbar rounded-2xl border border-border bg-card p-1 shadow-[0_4px_18px_rgba(20,50,40,0.04)]", className)}>
      <div className="flex min-w-max items-center gap-1">
        {ORDER.map(key => {
          const m = MODULE_THEMES[key];
          const Icon = ICONS[key];
          const isActive = active === key;
          return (
            <Link
              key={key}
              to={m.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200",
                isActive
                  ? cn(m.soft, m.text)
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {Icon
                ? <Icon className={cn("h-[18px] w-[18px]", isActive ? m.text : "opacity-60")} />
                : <span className={cn("h-2 w-2 rounded-full", m.bar)} />}
              {m.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
