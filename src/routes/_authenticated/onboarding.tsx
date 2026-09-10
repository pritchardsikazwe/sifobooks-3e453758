import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { INDUSTRY_SOLUTIONS, getSolution, applyIndustrySolution } from "@/lib/industry-solutions";
import { WORKSPACE_MODES, landingFor, type WorkspaceMode } from "@/lib/workspace";
import { activatePayrollOnly, isPayrollOnly } from "@/lib/payroll-product";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your account — SifoBooks" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const schema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(120),
  country: z.string().trim().min(1, "Country is required").max(60),
  currency: z.string().trim().min(1).max(10),
  tax_id: z.string().trim().max(40).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  team_size: z.string().min(1, "Select team size"),
  industry: z.string().min(1, "Select industry"),
});

type Form = z.infer<typeof schema>;

const COUNTRIES = ["Nigeria", "Kenya", "South Africa", "Ghana", "Zambia", "Tanzania", "Uganda", "Egypt", "Rwanda", "Ivory Coast", "Other"];
const CURRENCIES = ["USD", "NGN", "KES", "ZAR", "GHS", "ZMW", "TZS", "UGX", "EGP", "RWF", "XOF", "EUR", "GBP"];
const TEAM_SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];


function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    business_name: "", country: "Nigeria", currency: "NGN", tax_id: "", phone: "", team_size: "", industry: "",
  });
  const [mode, setMode] = useState<WorkspaceMode>("accounting");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("onboarded").eq("id", u.user.id).maybeSingle();
      if (data?.onboarded) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));

  const steps = [
    { title: "Your business", desc: "Tell us who you're invoicing under" },
    { title: "Billing basics", desc: "Currency and tax identification" },
    { title: "About your team", desc: "So we can tailor SifoBooks for you" },
  ];

  const canNext =
    (step === 0 && form.business_name.trim() && form.country) ||
    (step === 1 && form.currency) ||
    step === 2;

  const payrollOnly = isPayrollOnly(mode);

  const submit = async () => {
    setError(null);
    const parsed = schema.safeParse(payrollOnly ? { ...form, industry: form.industry || "payroll" } : form);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return setError("Not signed in"); }
    const { error } = await supabase.from("profiles").update({
      business_name: parsed.data.business_name,
      country: parsed.data.country,
      currency: parsed.data.currency,
      tax_id: parsed.data.tax_id || null,
      phone: parsed.data.phone || null,
      team_size: parsed.data.team_size,
      industry: parsed.data.industry,
      onboarded: true,
    }).eq("id", u.user.id);
    if (error) { setLoading(false); return setError(error.message); }

    // Apply the chosen industry solution to the company workspace (non-destructive).
    const sol = getSolution(parsed.data.industry);
    let landing = "/dashboard";
    try {
      const { data: c } = await supabase.from("companies").select("id").eq("user_id", u.user.id).order("created_at").limit(1);
      if (c?.[0]?.id) {
        if (payrollOnly) {
          // Payroll-only: never seed a chart of accounts or industry modules.
          await activatePayrollOnly({ companyId: c[0].id, userId: u.user.id });
        } else {
          if (sol) await applyIndustrySolution({ userId: u.user.id, companyId: c[0].id, solutionId: sol.id });
          await supabase.from("companies").update({ workspace_mode: mode }).eq("id", c[0].id);
        }
      }
      landing = landingFor(mode);
    } catch { /* workspace defaults to the dashboard */ }
    setLoading(false);
    navigate({ to: landing });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 w-10 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "Space Grotesk, sans-serif" }}>{steps[step].title}</CardTitle>
            <CardDescription>{steps[step].desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2"><Label>Business name</Label><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Acme Trading Ltd" /></div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={form.country} onValueChange={v => set("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Phone (optional)</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+234 800 000 0000" /></div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Default currency</Label>
                  <Select value={form.currency} onValueChange={v => set("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Tax ID / TIN (optional)</Label><Input value={form.tax_id} onChange={e => set("tax_id", e.target.value)} placeholder="e.g. 12345678-0001" /><p className="text-xs text-muted-foreground">Used on invoices for fiscal compliance.</p></div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>What will you primarily use SifoBooks for?</Label>
                  <p className="text-xs text-muted-foreground">This sets your home screen. Everything still posts to one accounting engine, and you can switch later.</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {WORKSPACE_MODES.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${mode === m.id ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      >
                        <div className="flex items-center gap-2"><span>{m.emoji}</span><span className="text-sm font-medium truncate">{m.label}</span></div>
                        <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{m.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Team size</Label>
                  <Select value={form.team_size} onValueChange={v => set("team_size", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{TEAM_SIZES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {payrollOnly ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">SifoPayroll only.</span> We will set up employees, pay
                    components, periods and statutory returns. Accounting, POS and inventory stay switched off — you can
                    turn them on later from Modules without losing any payroll history.
                  </div>
                ) : (
                <div className="space-y-2">
                  <Label>What type of business do you operate?</Label>
                  <p className="text-xs text-muted-foreground">SifoBooks configures your workspace from this — you never have to install modules one by one.</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {INDUSTRY_SOLUTIONS.map(s => {
                      const active = form.industry === s.id;
                      const soon = s.status === "coming_soon";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => set("industry", s.id)}
                          className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${active ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{s.emoji}</span>
                            <span className="text-sm font-medium truncate">{s.label}</span>
                          </div>
                          <div className="mt-1">
                            {soon
                              ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Clock className="h-3 w-3" /> Coming soon</span>
                              : <span className="text-[10px] uppercase tracking-wide text-emerald-600">Available</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>Next <ArrowRight className="h-4 w-4" /></Button>
              ) : (
                <Button onClick={submit} disabled={loading || !form.team_size || (!payrollOnly && !form.industry)}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Finish setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
