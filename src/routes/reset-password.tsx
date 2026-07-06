import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — SifoBooks" },
      { name: "description", content: "Set a new password for your SifoBooks account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Supabase auto-parses the recovery token in the URL hash and fires PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If user already has a recovery session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setNotice(null);
    const fd = new FormData(e.currentTarget);
    const password = passwordSchema.safeParse(fd.get("password"));
    const confirm = String(fd.get("confirm") ?? "");
    if (!password.success) return setError(password.error.issues[0].message);
    if (password.data !== confirm) return setError("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password.data });
    setLoading(false);
    if (error) return setError(error.message);
    setNotice("Password updated. Redirecting…");
    setTimeout(() => navigate({ to: "/dashboard" }), 900);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-sm text-muted-foreground hover:text-foreground">← Back to SifoBooks</Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Set a new password</CardTitle>
            <CardDescription>Choose a strong password you haven't used before</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Open this page from the reset link in your email to continue.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="pw">New password</Label><Input id="pw" name="password" type="password" autoComplete="new-password" required minLength={8} /></div>
                <div className="space-y-2"><Label htmlFor="pw2">Confirm password</Label><Input id="pw2" name="confirm" type="password" autoComplete="new-password" required minLength={8} /></div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
