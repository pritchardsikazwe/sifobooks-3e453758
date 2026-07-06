import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

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
const INDUSTRIES = ["Retail", "Hospitality", "Manufacturing", "Professional services", "Logistics", "Telecom", "Agriculture", "Technology", "Other"];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    business_name: "", country: "Nigeria", currency: "NGN", tax_id: "", phone: "", team_size: "", industry: "",
  });

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

  const submit = async () => {
    setError(null);
    const parsed = schema.safeParse(form);
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
    setLoading(false);
    if (error) return setError(error.message);
    navigate({ to: "/dashboard" });
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
                  <Label>Team size</Label>
                  <Select value={form.team_size} onValueChange={v => set("team_size", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{TEAM_SIZES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={form.industry} onValueChange={v => set("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
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
                <Button onClick={submit} disabled={loading || !form.team_size || !form.industry}>
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
