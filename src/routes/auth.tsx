import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Building2, User, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SifoBooks" },
      { name: "description", content: "Sign in or create your SifoBooks account to manage invoices and fiscal compliance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(100);

const COUNTRIES = ["Zambia", "Nigeria", "Kenya", "South Africa", "Ghana", "Tanzania", "Uganda", "Egypt", "Rwanda", "Ivory Coast", "Other"];

function pwStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", color: "bg-red-500" },
    { label: "Weak", color: "bg-red-400" },
    { label: "Fair", color: "bg-amber-400" },
    { label: "Good", color: "bg-emerald-400" },
    { label: "Strong", color: "bg-emerald-600" },
  ] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
}

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "reset">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/launch" });
    });
  }, [navigate]);

  const routeAfterAuth = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", userData.user.id).maybeSingle();
    navigate({ to: profile?.onboarded ? "/launch" : "/onboarding" });
  };

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setNotice(null);
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    if (!email.success) return setError(email.error.issues[0].message);
    if (!password.success) return setError(password.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
    setLoading(false);
    if (error) return setError(error.message);
    await routeAfterAuth();
  };

  const onReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setNotice(null);
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    if (!email.success) return setError(email.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setNotice("Check your email for a password reset link.");
  };

  if (mode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground">
            ← Back to SifoBooks
          </Link>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>SifoBooks</CardTitle>
              <CardDescription>How are you signing in today?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { key: "cashier", label: "Log in as Cashier", hint: "Till PIN — opens your cashier workspace", icon: User },
                { key: "manager", label: "Log in as Manager", hint: "Branch operations, approvals and reports", icon: ShieldCheck },
                { key: "admin", label: "Log in as Admin", hint: "Full accounting and system administration", icon: Building2 },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  onClick={() => { setMode(o.key); setError(null); setNotice(null); }}
                  className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"
                >
                  <o.icon className="h-5 w-5 text-primary" />
                  <span className="flex-1">
                    <span className="block font-semibold">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              <button
                onClick={() => setMode("admin")}
                className="w-full pt-2 text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Or continue with the normal sign-in
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to SifoBooks
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              {mode === "cashier" ? "Cashier sign-in" : mode === "manager" ? "Manager sign-in" : "Welcome to SifoBooks"}
            </CardTitle>
            <CardDescription>
              {mode === "cashier" ? "Enter your till PIN to open your workspace" : "Manage invoices and stay fiscally compliant"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "cashier" ? (
              <CashierPinLogin onBack={() => setMode(null)} />
            ) : (
            <>
            <button onClick={() => setMode(null)} className="mb-3 text-sm text-muted-foreground hover:text-foreground">← Choose a different login</button>

            <Tabs value={tab} onValueChange={v => { setTab(v as "signin" | "signup" | "reset"); setError(null); setNotice(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2"><Label htmlFor="si-email">Email</Label><Input id="si-email" name="email" type="email" autoComplete="email" required /></div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-pw">Password</Label>
                      <button type="button" onClick={() => { setTab("reset"); setError(null); setNotice(null); }} className="text-xs text-primary hover:underline">Forgot password?</button>
                    </div>
                    <Input id="si-pw" name="password" type="password" autoComplete="current-password" required />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <SignupWizard onDone={routeAfterAuth} setGlobalError={setError} setGlobalNotice={setNotice} setTab={setTab} />
                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
              </TabsContent>

              <TabsContent value="reset">
                <form onSubmit={onReset} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="rp-email">Email</Label>
                    <Input id="rp-email" name="email" type="email" autoComplete="email" required />
                    <p className="text-xs text-muted-foreground">We'll email you a secure link to reset your password.</p>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link</Button>
                  <button type="button" onClick={() => { setTab("signin"); setError(null); setNotice(null); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</button>
                </form>
              </TabsContent>
            </Tabs>
            </>
            )}
          </CardContent>

        </Card>
      </div>
    </div>
  );
}

function SignupWizard({ onDone, setGlobalError, setGlobalNotice, setTab }: {
  onDone: () => Promise<void>;
  setGlobalError: (v: string | null) => void;
  setGlobalNotice: (v: string | null) => void;
  setTab: (v: "signin" | "signup" | "reset") => void;
}) {
  const [step, setStep] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "", email: "", password: "",
    business_name: "", country: "Zambia",
    tpin: "", vat_registered: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));

  const steps = [
    { title: "Create your account", desc: "Your login details", icon: User },
    { title: "Your business", desc: "So invoices carry your name", icon: Building2 },
    { title: "ZRA compliance", desc: "TPIN and VAT status (optional)", icon: ShieldCheck },
  ];

  const canNext =
    (step === 0 && nameSchema.safeParse(f.name).success && emailSchema.safeParse(f.email).success && passwordSchema.safeParse(f.password).success) ||
    (step === 1 && f.business_name.trim().length > 0 && f.country.length > 0) ||
    step === 2;

  const finish = async () => {
    setErr(null); setGlobalError(null); setGlobalNotice(null);
    setSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: f.name.trim() },
      },
    });
    if (error) { setSaving(false); return setErr(error.message); }
    if (!data.session) {
      // Email confirmation required — store business fields locally for onboarding after sign-in.
      setSaving(false);
      setGlobalNotice("Check your email to confirm your account, then sign in.");
      setTab("signin");
      return;
    }
    // Session available — write business + ZRA details into profile immediately.
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("profiles").update({
        full_name: f.name.trim(),
        business_name: f.business_name.trim(),
        country: f.country,
        tpin: f.tpin.trim() || null,
        vat_registered: f.vat_registered,
      }).eq("id", uid);
    }
    setSaving(false);
    await onDone();
  };

  const pw = pwStrength(f.password);

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary/15 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 w-6 ${done ? "bg-primary" : "bg-muted"}`} />}
            </div>
          );
        })}
      </div>

      <div className="mb-4 text-center">
        <div className="text-sm font-semibold">{steps[step].title}</div>
        <div className="text-xs text-muted-foreground">{steps[step].desc}</div>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <div className="space-y-2"><Label>Full name</Label><Input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Chanda Mwansa" autoComplete="name" /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="you@company.co.zm" autoComplete="email" /></div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={f.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" autoComplete="new-password" minLength={8} className="pr-10" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {f.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded ${i < pw.score ? pw.color : "bg-muted"}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Strength: <span className="font-medium">{pw.label}</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-2"><Label>Business name</Label><Input value={f.business_name} onChange={e => set("business_name", e.target.value)} placeholder="SifoBooks Trading Ltd" /></div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={f.country} onValueChange={v => set("country", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">You'll finish setup (currency, team, industry) after signup.</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>ZRA TPIN <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input value={f.tpin} onChange={e => set("tpin", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit taxpayer number" inputMode="numeric" />
            <p className="text-xs text-muted-foreground">Pre-fills as seller TPIN on ZRA Smart Invoices.</p>
          </div>
          <label className="flex items-start gap-3 rounded-lg border bg-emerald-50/40 p-3 cursor-pointer">
            <input type="checkbox" checked={f.vat_registered} onChange={e => set("vat_registered", e.target.checked)} className="mt-1 h-4 w-4" />
            <div>
              <div className="text-sm font-medium">I am VAT-registered</div>
              <div className="text-xs text-muted-foreground">Enables standard 16% VAT by default on new invoices and stock items.</div>
            </div>
          </label>
        </div>
      )}

      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>Next <ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={finish} disabled={saving || !canNext}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Create account
          </Button>
        )}
      </div>
    </div>
  );
}
