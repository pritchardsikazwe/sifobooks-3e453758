import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Kopelacode" },
      { name: "description", content: "Sign in or create your Kopelacode account to manage invoices and fiscal compliance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(100);

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "reset">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const routeAfterAuth = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", userData.user.id)
      .maybeSingle();
    navigate({ to: profile?.onboarded ? "/dashboard" : "/onboarding" });
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

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setNotice(null);
    const fd = new FormData(e.currentTarget);
    const name = nameSchema.safeParse(fd.get("name"));
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    if (!name.success) return setError(name.error.issues[0].message);
    if (!email.success) return setError(email.error.issues[0].message);
    if (!password.success) return setError(password.error.issues[0].message);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name.data },
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (!data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
      setTab("signin");
      return;
    }
    await routeAfterAuth();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to Kopelacode
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Welcome to Kopelacode</CardTitle>
            <CardDescription>Manage invoices and stay fiscally compliant</CardDescription>
          </CardHeader>
          <CardContent>
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
                <form onSubmit={onSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2"><Label htmlFor="su-name">Full name</Label><Input id="su-name" name="name" type="text" autoComplete="name" required /></div>
                  <div className="space-y-2"><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" autoComplete="email" required /></div>
                  <div className="space-y-2"><Label htmlFor="su-pw">Password</Label><Input id="su-pw" name="password" type="password" autoComplete="new-password" required minLength={8} /><p className="text-xs text-muted-foreground">At least 8 characters</p></div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account</Button>
                </form>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
