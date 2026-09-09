import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { INDUSTRY_SOLUTIONS, getSolution, applyIndustrySolution } from "@/lib/industry-solutions";
import { WORKSPACE_MODES, landingFor, type WorkspaceMode, setWorkspaceMode } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your account — SifoBooks" }, { name: "robots", content: "noindex" }] }),
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
  const [form, setForm] = useState<Form>({ business_name: "", country: "Zambia", currency: "ZMW", tax_id: "", phone: "", team_size: "", industry: "" });
  const [mode, setMode] = useState<WorkspaceMode>("retail_basic_accounting");

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
    { title: "Choose your workspace", desc: "SifoBooks will configure the right experience for your business" },
    { title: "Billing basics", desc: "Set your currency and tax identification" },
    { title: "Finish setup", desc: "Tell us about your team and industry" },
  ];
  const canNext =
    (step === 0 && !!form.business_name.trim() && !!form.country) ||
    (step === 1 && !!mode) ||
    (step === 2 && !!form.currency) ||
    step === 3;

  const submit = async () => {
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return setError("Not signed in"); }

    const { data: companyRows, error: companyLookupError } = await supabase
      .from("companies").select("id").eq("user_id", u.user.id).order("created_at").limit(1);
    if (companyLookupError) { setLoading(false); return setError(companyLookupError.message); }
    const companyId = companyRows?.[0]?.id;
    if (!companyId) { setLoading(false); return setError("Your company could not be found. Please return and try again."); }

    const { error: profileError } = await supabase.from("profiles").update({
      business_name: parsed.data.business_name,
      country: parsed.data.country,
      currency: parsed.data.currency,
      tax_id: parsed.data.tax_id || null,
      phone: parsed.data.phone || null,
      team_size: parsed.data.team_size,
      industry: parsed.data.industry,
      onboarded: true,
    }).eq("id", u.user.id);
    if (profileError) { setLoading(false); return setError(profileError.message); }

    try {
      await supabase.from("companies").update({
        name: parsed.data.business_name,
        country: parsed.data.country,
        base_currency: parsed.data.currency,
      }).eq("id", companyId);
      await setWorkspaceMode(mode, companyId);
      const sol = getSolution(parsed.data.industry);
      if (sol) await applyIndustrySolution({ userId: u.user.id, companyId, solutionId: sol.id });
    } catch (e: any) {
      setLoading(false);
      return setError(e?.message ?? "Could not save your workspace configuration");
    }

    setLoading(false);
    navigate({ to: landingFor(mode) });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((_, i) => <div key={i} className={`h-1.5 w-12 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs font-medium text-primary"><Sparkles className="h-3.5 w-3.5" /> SifoBooks onboarding</div>
            <CardTitle style={{ fontFamily: "Space Grotesk, sans-serif" }}>{steps[step].title}</CardTitle>
            <CardDescription>{steps[step].desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 0 && <>
              <div className="space-y-2"><Label>Business name</Label><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Acme Trading Ltd" /></div>
              <div className="space-y-2"><Label>Country</Label><Select value={form.country} onValueChange={v => set("country", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Phone (optional)</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+260 97X XXX XXX" /></div>
            </>}

            {step === 1 && <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">Choose how you want SifoBooks to feel and what it should show first. You can change this later.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WORKSPACE_MODES.map(m => {
                  const active = mode === m.id;
                  return <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`group text-left rounded-xl border p-4 transition-all ${active ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40"}`}>
                    <div className="flex items-start gap-3"><span className="text-2xl">{m.emoji}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-sm">{m.label}</span><span className="block mt-1 text-xs text-muted-foreground leading-relaxed">{m.description}</span><span className="mt-2 inline-flex rounded-full bg-background border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">{m.accounting} accounting</span></span>{active && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}</div>
                  </button>;
                })}
              </div>
            </div>}

            {step === 2 && <>
              <div className="space-y-2"><Label>Default currency</Label><Select value={form.currency} onValueChange={v => set("currency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tax ID / TIN (optional)</Label><Input value={form.tax_id} onChange={e => set("tax_id", e.target.value)} placeholder="e.g. TPIN" /><p className="text-xs text-muted-foreground">Used on invoices and compliance documents.</p></div>
            </>}

            {step === 3 && <>
              <div className="space-y-2"><Label>Team size</Label><Select value={form.team_size} onValueChange={v => set("team_size", v)}><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent>{TEAM_SIZES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>What type of business do you operate?</Label><p className="text-xs text-muted-foreground">This adds the relevant industry configuration without deleting or replacing your SifoBooks data.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">{INDUSTRY_SOLUTIONS.map(s => <button key={s.id} type="button" onClick={() => set("industry", s.id)} className={`text-left rounded-lg border px-3 py-3 transition-colors ${form.industry === s.id ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}><div className="flex items-center gap-2"><span>{s.emoji}</span><span className="text-sm font-medium truncate">{s.label}</span></div><div className="mt-1">{s.status === "coming_soon" ? <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Clock className="h-3 w-3" /> Coming soon</span> : <span className="text-[10px] uppercase tracking-wide text-emerald-600">Available</span>}</div></button>)}</div></div>
            </>}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between pt-2"><Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>{step < steps.length - 1 ? <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>Next <ArrowRight className="h-4 w-4" /></Button> : <Button onClick={submit} disabled={loading || !form.team_size || !form.industry}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Finish setup</Button>}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
