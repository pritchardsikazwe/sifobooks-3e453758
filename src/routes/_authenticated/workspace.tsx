import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Check, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  resolveAuthenticatedContext, selectCompany, productDef, productLanding, writePreferredProduct,
  type AuthContext, type ProductKey,
} from "@/lib/workspace-context";

/**
 * Company + workspace chooser. Shown only when the signed-in user genuinely has
 * more than one authorised company or product — SifoBooks never guesses.
 */
export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Choose your workspace — SifoBooks" },
      { name: "description", content: "Pick the company and the SifoBooks workspace you want to work in." },
      { property: "og:title", content: "Choose your workspace — SifoBooks" },
      { property: "og:description", content: "Pick the company and the SifoBooks workspace you want to work in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspaceChooser,
});

function WorkspaceChooser() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<AuthContext | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void resolveAuthenticatedContext().then(setCtx); }, []);

  const pickCompany = async (id: string) => {
    setBusy(true);
    try {
      const next = await selectCompany(id);
      setCtx(next);
      if (next && next.products.length === 1) {
        writePreferredProduct(next.company?.id ?? null, next.products[0]);
        navigate({ to: productLanding(next.products[0], next.access) as never });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not switch company");
    } finally {
      setBusy(false);
    }
  };

  const pickProduct = (key: ProductKey) => {
    if (!ctx?.products.includes(key)) return toast.error("That workspace is not enabled for this company");
    writePreferredProduct(ctx.company?.id ?? null, key);
    navigate({ to: productLanding(key, ctx.access) as never });
  };

  if (!ctx) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const company = ctx.company;
  const op = ctx.operational;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {ctx.email ?? "your account"}
          {ctx.access?.role_name ? ` · ${ctx.access.role_name}` : ""}
        </p>
      </header>

      {ctx.companies.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company</CardTitle>
            <CardDescription>Only companies you belong to are listed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {ctx.companies.map((c) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => void pickCompany(c.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-muted ${
                  c.id === company?.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.tradingName || c.name}</span>
                  <span className="block text-xs capitalize text-muted-foreground">{c.membership}</span>
                </span>
                {c.id === company?.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {company ? (company.tradingName || company.name) : "Workspace"}
          </CardTitle>
          <CardDescription>
            {op.branchName || op.locationName || op.registerName ? (
              <>Your assigned context: {[op.branchName, op.locationName, op.registerName].filter(Boolean).join(" · ")}</>
            ) : (
              "Workspaces enabled for this company that your role allows."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {ctx.products.length === 0 && (
            <div className="col-span-full flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                No workspace is enabled for you in this company yet. Ask an administrator to enable a
                product or grant your role the matching permission.
              </span>
            </div>
          )}
          {ctx.products.map((key) => {
            const p = productDef(key);
            return (
              <button
                key={key}
                onClick={() => pickProduct(key)}
                className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition hover:border-primary/40 hover:bg-muted"
              >
                <span className="text-lg">{p.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs leading-snug text-muted-foreground">{p.description}</span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Skip for now</Button>
      </div>
    </div>
  );
}
