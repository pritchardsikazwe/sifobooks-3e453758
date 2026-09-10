import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Check } from "lucide-react";
import { toast } from "sonner";
import {
  resolveAuthenticatedContext, productDef, productLanding, writePreferredProduct,
  readPreferredProduct, type AuthContext, type ProductKey,
} from "@/lib/workspace-context";

/**
 * Switches between the workspaces this company is entitled to AND this user is
 * authorised for. Same company, branch, user and session — only the workspace
 * changes. Products the company does not have are never listed.
 */
export function WorkspaceSwitch() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<AuthContext | null>(null);
  const [current, setCurrent] = useState<ProductKey | null>(null);

  useEffect(() => {
    void resolveAuthenticatedContext().then((c) => {
      setCtx(c);
      setCurrent(readPreferredProduct(c?.company?.id ?? null) ?? c?.resolution.product ?? null);
    }).catch(() => {});
  }, []);

  const choose = (next: ProductKey) => {
    if (!ctx?.products.includes(next)) {
      toast.error("That workspace is not enabled for this company");
      return;
    }
    writePreferredProduct(ctx.company?.id ?? null, next);
    setCurrent(next);
    navigate({ to: productLanding(next, ctx.access) as never });
  };

  const products = ctx?.products ?? [];
  if (products.length < 2) return null;
  const label = current ? productDef(current).label : "Workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-2 sm:px-3 border border-border bg-card hover:bg-muted text-foreground"
          title="Switch workspace"
        >
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="hidden lg:inline text-xs font-medium">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {products.map((key) => {
          const p = productDef(key);
          return (
            <DropdownMenuItem key={key} onClick={() => choose(key)} className="items-start gap-2 py-2">
              <span className="mt-0.5">{p.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {p.label}
                  {key === current && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                <span className="block text-xs text-muted-foreground leading-snug">{p.description}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
