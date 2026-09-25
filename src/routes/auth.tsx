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
import { CashierPinLogin } from "@/components/auth/CashierPinLogin";
import { landingFor, loadAccess } from "@/lib/rbac";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string; tab?: "signin" | "signup" } => {
    const n = typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined;
    const tab = s.tab === "signin" || s.tab === "signup" ? s.tab : undefined;
    return { ...(n ? { next: n } : {}), ...(tab ? { tab } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Sign in — SifoBooks" },
      { name: "description", content: "Sign in or create your SifoBooks account to manage invoices and fiscal compliance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthClientGate,
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

type LoginMode = "cashier" | "manager" | "admin";

function AuthClientGate() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">SifoBooks</CardTitle>
            <CardDescription>Starting local sign-in…</CardDescription>
          </CardHeader>
          <CardContent><div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></CardContent>
        </Card>
      </div>
    );
  }
  return <AuthPage />;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next, tab: initialTab } = Route.useSearch();
  const [mode, setMode] = useState<LoginMode | null>(initialTab ? "admin" : null);
  const [tab, setTab] = useState<"signin" | "signup" | "reset">(initialTab ?? "signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next) { window.location.href = next; return; }
        navigate({ to: "/launch" });
      }
    });
  }, [navigate, next]);

  const routeAfterAuth = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    if ((userData.user.user_metadata as any)?.must_change_password) { navigate({ to: "/reset-password", search: { forced: true } as any }); return; }
    if (next) { window.location.href = next; return; }
    // One universal entry point: /launch resolves company + product + role +
    // operational context before deciding where to go.
    navigate({ to: "/launch" });
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
                  <button type="button" onClick={() => { setTab("signin"); setError(null); setNotice(null); navigate({ to: "/auth", search: (prev: any) => ({ ...prev, tab: "signin" }) }); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</button>
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
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const { next: signupNext } = Route.useSearch();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));
  const valid = nameSchema.safeParse(f.name).success && emailSchema.safeParse(f.email).success && passwordSchema.safeParse(f.password).success;

  const finish = async () => {
    setErr(null); setGlobalError(null); setGlobalNotice(null); setSaving(true);
    try {
      const result = await Promise.race([
        supabase.auth.signUp({
          email: f.email.trim(), password: f.password,
          options: {
            emailRedirectTo: signupNext ? window.location.origin + signupNext : window.location.origin + "/launch",
            data: { full_name: f.name.trim() },
          },
        }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Registration is taking too long. Please check that SifoBooks is still running, then try again.")), 30000)),
      ]);
      const { data, error } = result;
      if (error) { setSaving(false); return setErr(error.message); }
      if (!data?.session) {
        setSaving(false);
        setGlobalNotice("Check your email to confirm your account, then sign in. Your company setup starts after registration.");
        setTab("signin");
        return;
      }
      // signUp already creates the local/cloud profile with full_name.
      // Avoid a second profile update round-trip on first registration.
      // A newly registered account has no company yet. Go directly to company
      // setup instead of sending a fresh account through /launch.
      setSaving(false);
      navigate({ to: "/setup" });
    } catch (e: any) {
      setSaving(false);
      setErr(String(e?.message || "Registration failed. Please retry."));
    }
  };

  const pw = pwStrength(f.password);
  return (
    <div className="pt-4">
      <div className="mb-5 flex items-center justify-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><User className="h-4 w-4" /></div>
        <div className="h-0.5 w-10 bg-muted" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><Building2 className="h-4 w-4" /></div>
      </div>
      <div className="mb-5 text-center">
        <div className="text-base font-semibold">Register your SifoBooks account</div>
        <div className="text-xs text-muted-foreground">After registration, SifoBooks will take you directly into the company setup screens.</div>
      </div>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Full name</Label><Input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Pritchard Sikazwe" autoComplete="name" /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="you@company.co.zm" autoComplete="email" /></div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative"><Input type={showPw ? "text" : "password"} value={f.password} onChange={e => set("password", e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" minLength={8} className="pr-10" /><button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPw ? "Hide password" : "Show password"}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          {f.password && <div className="space-y-1"><div className="flex gap-1">{[0,1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded ${i < pw.score ? pw.color : "bg-muted"}`} />)}</div><p className="text-xs text-muted-foreground">Strength: <span className="font-medium">{pw.label}</span></p></div>}
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
          <Building2 className="mr-2 inline h-4 w-4" />Business name, tax, modules, branches, accounting, backup and devices are configured in the next setup wizard — only once.
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <Button onClick={finish} disabled={saving || !valid} className="mt-5 w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Register & Continue
      </Button>
    </div>
  );
}
