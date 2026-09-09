import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getActiveCompany, getModeMeta, setWorkspaceMode, WORKSPACE_MODES, type WorkspaceMode } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({ meta: [{ title: "Choose Workspace — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: WorkspacePage,
});

const recommended: Record<WorkspaceMode, string[]> = {
  general_pos: ["POS", "Sales", "Inventory", "Reports"],
  retail_basic_accounting: ["POS", "Sales", "Purchases", "Inventory", "Cashbook", "Reports"],
  retail_full_accounting: ["POS", "Sales", "Purchases", "Inventory", "Finance", "Banking", "Payroll", "Reports"],
  restaurant: ["Restaurant POS", "Tables", "Kitchen", "Inventory", "Sales", "Reports"],
  hotel: ["Hotel operations", "Restaurant/POS", "Inventory", "Finance", "Banking", "Payroll", "Reports"],
  ngo_donor: ["Donors", "Grants", "Funds", "Projects", "Finance", "Budgets", "Reports"],
  accounting: ["General Ledger", "Banking", "Sales", "Purchases", "Assets", "Payroll", "Reports"],
  pos_accounting: ["POS", "Sales", "Purchases", "Inventory", "Full Accounting", "Reports"],
};

function WorkspacePage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Your company");
  const [current, setCurrent] = useState<WorkspaceMode>("accounting");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<WorkspaceMode | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const company = await getActiveCompany();
        if (company) {
          setCompanyName(company.name || "Your company");
          setCurrent(getModeMeta(company.workspace_mode).id);
        }
      } catch (e: any) {
        toast.error(e.message ?? "Could not load workspace");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const choose = async (mode: WorkspaceMode) => {
    setSaving(mode);
    try {
      await setWorkspaceMode(mode);
      setCurrent(mode);
      const meta = getModeMeta(mode);
      toast.success(`${meta.label} selected`, { description: "Your existing data is preserved." });
      setTimeout(() => navigate({ to: meta.landing }), 250);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save workspace");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading workspace options…</div>;

  const visibleModes = WORKSPACE_MODES.filter(m => !["pos_accounting", "accounting"].includes(m.id));
  const legacyModes = WORKSPACE_MODES.filter(m => ["pos_accounting", "accounting"].includes(m.id));

  return (
    <div className="min-h-full px-6 py-8 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto space-y-7">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-sm font-medium text-primary mb-2">SifoBooks Workspace Setup</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">How do you want to run {companyName}?</h1>
          <p className="mt-3 text-muted-foreground">Choose the business experience that fits your company. SifoBooks keeps one shared accounting engine underneath every workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleModes.map(mode => {
            const active = current === mode.id;
            const meta = getModeMeta(mode.id);
            return (
              <Card key={mode.id} className={`relative overflow-hidden transition-all ${active ? "ring-2 ring-primary shadow-md" : "hover:shadow-md hover:-translate-y-0.5"}`}>
                {active && <div className="absolute top-3 right-3"><Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge></div>}
                <CardHeader>
                  <div className="text-3xl mb-1">{meta.emoji}</div>
                  <CardTitle className="text-lg pr-14">{meta.label}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {recommended[mode.id].map(item => <span key={item} className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs">{item}</span>)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{meta.accounting === "full" ? "Full accounting" : "Essential accounting"}</span>
                    <span className="capitalize">{meta.channel}</span>
                  </div>
                  <Button className="w-full" variant={active ? "outline" : "default"} disabled={saving !== null} onClick={() => choose(mode.id)}>
                    {saving === mode.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    {active ? "Keep this workspace" : "Use this workspace"}
                    {!active && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader className="pb-3"><CardTitle className="text-base">Existing configurations</CardTitle><CardDescription>Older SifoBooks companies can continue using their existing workspace settings.</CardDescription></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {legacyModes.map(mode => {
              const active = current === mode.id;
              return <Button key={mode.id} variant={active ? "secondary" : "outline"} className="justify-between h-auto py-3" disabled={saving !== null} onClick={() => choose(mode.id)}><span>{getModeMeta(mode.id).emoji} {getModeMeta(mode.id).label}</span><ArrowRight className="h-4 w-4" /></Button>;
            })}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">You can change this later from Company Setup. Switching workspace does not delete transactions, customers, inventory or accounting data.</p>
      </div>
    </div>
  );
}
