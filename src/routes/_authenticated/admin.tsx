import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCog, ShieldCheck, Bell, Building2, Users2, Sparkles, Trash2, UserPlus, Loader2, Wifi, UtensilsCrossed, Printer, Boxes, LayoutDashboard, KeyRound, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;

function AdminPage() {
  const [company, setCompany] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [inviting, setInviting] = useState(false);
  const [userId, setUserId] = useState("");
  const [cashierCount, setCashierCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [forceChange, setForceChange] = useState(true);
  const [resetReason, setResetReason] = useState("Administrator password reset");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const { data: prof } = await supabase.from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
    let c: any = null;
    if (prof?.active_company_id) {
      const { data } = await supabase.from("companies").select("*").eq("id", prof.active_company_id).maybeSingle();
      c = data;
    }
    if (!c) {
      const { data } = await supabase.from("companies").select("*").eq("user_id", u.user.id).order("created_at").limit(1).maybeSingle();
      c = data;
    }
    setCompany(c ?? null);
    if (c) {
      const { data: m } = await supabase.from("company_members")
        .select("*, profiles:user_id(email, full_name)")
        .eq("company_id", c.id).order("created_at");
      setMembers(m ?? []);
      const [cashiers, stock] = await Promise.all([
        supabase.from("employee_pos_permissions").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).eq("is_active", true),
        supabase.from("stock_items").select("id", { count: "exact", head: true }).eq("user_id", u.user.id),
      ]);
      setCashierCount(cashiers.count ?? 0);
      setInventoryCount(stock.count ?? 0);
      // Ensure owner row exists
      if (!(m ?? []).some((row: any) => row.user_id === u.user.id)) {
        await supabase.from("company_members").insert({
          company_id: c.id, user_id: u.user.id, role: "owner", created_by: u.user.id,
        });
        const { data: m2 } = await supabase.from("company_members")
          .select("*, profiles:user_id(email, full_name)")
          .eq("company_id", c.id).order("created_at");
        setMembers(m2 ?? []);
      }
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!company) return toast.error("Set up your company first");
    if (!email.trim()) return toast.error("Email required");
    setInviting(true);
    // Look up profile by email
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!prof) {
      setInviting(false);
      return toast.error("No user with that email — ask them to sign up first, then invite.");
    }
    const { error } = await supabase.from("company_members").insert({
      company_id: company.id, user_id: prof.id, role: role as any, created_by: userId, invited_email: email.trim(),
    });
    setInviting(false);
    if (error) return toast.error(error.message);
    toast.success(`Added ${email} as ${role}`);
    setEmail(""); load();
  };

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from("company_members").update({ role: newRole as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("company_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const generateTemporaryPassword = () => {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const generated = Array.from(bytes, b => chars[b % chars.length]).join("");
    setResetPassword(generated);
    setResetConfirm(generated);
  };

  const openReset = (member: any) => {
    setResetTarget(member); setResetPassword(""); setResetConfirm(""); setForceChange(true); setResetReason("Administrator password reset");
  };

  const resetMemberPassword = async () => {
    if (!resetTarget) return;
    if (resetPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (resetPassword !== resetConfirm) return toast.error("Passwords do not match");
    setResetting(true);
    const result = await supabase.auth.adminResetPassword(resetTarget.user_id, resetPassword, forceChange, resetReason);
    setResetting(false);
    if (result?.error) return toast.error(result.error.message || "Password reset failed");
    toast.success(`Password reset for ${resetTarget.profiles?.full_name || resetTarget.profiles?.email || "user"}`);
    setResetTarget(null); setResetPassword(""); setResetConfirm("");
  };

  const shortcuts = [
    { title: "Company Setup", desc: "Profile, logo, branches, tax settings", icon: Building2, to: "/setup" },
    { title: "Company Management", desc: "Archive, restore or remove companies", icon: Building2, to: "/companies" },
    { title: "Employees", desc: "HR master data", icon: Users2, to: "/employees" },
    { title: "Subscription", desc: "Plans & billing", icon: Sparkles, to: "/subscription" },
    { title: "Audit Logs", desc: "All system activity", icon: ShieldCheck, to: "/audit-logs" },
    { title: "Notifications", desc: "System notices", icon: Bell, to: "/notifications" },
    { title: "Compliance", desc: "ZRA, NAPSA, NHIMA obligations", icon: ShieldCheck, to: "/compliance" },
    { title: "Network & POS Setup", desc: "Server, POS stations, cashiers and ZRA/VSDC device configuration", icon: Wifi, to: "/network-setup" },
  ];

  return (
    <div className="sifobooks-2026-page max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-[#0f4c5c]" />
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-sm text-muted-foreground">Full control over {company?.name ?? "your company"} — members, roles, and modules.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Team members", members.length, Users2, "/admin"],
          ["POS cashiers", cashierCount, UtensilsCrossed, "/manager/cashiers"],
          ["Stock items", inventoryCount, Boxes, "/stock"],
          ["Printing", "Ready", Printer, "/printing-settings"],
        ].map(([label, value, Icon, to]: any) => (
          <Link key={String(label)} to={to as never} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}<Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-black tabular-nums">{value}</div>
          </Link>
        ))}
      </div>

      <Card className="rounded-2xl border-[#cfe0db] bg-gradient-to-r from-[#f7fbf9] to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <div className="flex items-center gap-2 font-bold"><LayoutDashboard className="h-4 w-4 text-primary" /> Operations command centre</div>
            <p className="mt-1 text-sm text-muted-foreground">Restaurant administration, cashier access, inventory, printing and daily close are available directly from this screen.</p>
          </div>
          <Link to="/restaurant" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><UtensilsCrossed className="h-4 w-4" /> Restaurant</Link>
          <Link to="/manager/cashiers" className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><UserPlus className="h-4 w-4" /> Add cashier</Link>
          <Link to="/printing-settings" className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><Printer className="h-4 w-4" /> Printers</Link>
        </div>
      </Card>

      {/* Members */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="font-semibold flex items-center gap-2"><Users2 className="h-4 w-4 text-[#0f4c5c]" /> Company Members</div>
            <div className="text-xs text-muted-foreground mt-0.5">Give teammates access with a specific role. Owner & Admin can manage members and settings.</div>
          </div>
        </div>

        {loading ? (
          <div className="py-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end mb-4">
              <div className="space-y-1"><Label className="text-xs">Invite by email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.filter(r => r !== "owner").map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={invite} disabled={inviting} className="bg-[#0f4c5c] hover:bg-[#0c3f4c] gap-2">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left font-medium py-2">Name</th>
                    <th className="text-left font-medium py-2">Email</th>
                    <th className="text-left font-medium py-2">Role</th>
                    <th className="text-right font-medium py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No members yet.</td></tr>
                  ) : members.map(m => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{m.profiles?.full_name ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{m.profiles?.email ?? m.invited_email ?? "—"}</td>
                      <td className="py-2">
                        <Select value={m.role} onValueChange={v => updateRole(m.id, v)} disabled={m.role === "owner"}>
                          <SelectTrigger className="h-7 w-28 text-xs capitalize"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize" disabled={r === "owner" && m.role !== "owner"}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Reset password" onClick={() => openReset(m)} disabled={m.role === "owner" && !members.some((x: any) => x.user_id === userId && x.role === "owner")}><KeyRound className="h-4 w-4 text-amber-600" /></Button><Button size="icon" variant="ghost" title="Remove member" onClick={() => remove(m.id)} disabled={m.role === "owner"}><Trash2 className="h-4 w-4" /></Button></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-600" /> Reset user password</DialogTitle>
            <DialogDescription>Set a new password for {resetTarget?.profiles?.full_name || resetTarget?.profiles?.email || "this user"}. Existing sessions are invalidated immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2"><Label>New password</Label><div className="flex gap-2"><Input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} autoComplete="new-password" /><Button type="button" variant="outline" onClick={generateTemporaryPassword}><RefreshCw className="mr-2 h-4 w-4" />Generate</Button></div></div>
            <div className="grid gap-2"><Label>Confirm password</Label><Input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} autoComplete="new-password" /></div>
            <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer"><input type="checkbox" checked={forceChange} onChange={e => setForceChange(e.target.checked)} className="mt-1" /><span><span className="block text-sm font-semibold">Force password change at next sign-in</span><span className="block text-xs text-muted-foreground">The user must choose their own password after signing in with the temporary password.</span></span></label>
            <div className="grid gap-2"><Label>Reason / audit note</Label><Input value={resetReason} onChange={e => setResetReason(e.target.value)} /></div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900"><ShieldCheck className="inline h-4 w-4 mr-1" />Only company Owner/Admin can perform resets. Admins cannot reset the Owner account.</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button><Button onClick={resetMemberPassword} disabled={resetting || resetPassword.length < 8 || resetPassword !== resetConfirm} className="bg-emerald-800 hover:bg-emerald-900">{resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />} Reset password</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin shortcuts */}
      <div>
        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Modules</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shortcuts.map(x => (
            <Link key={x.title} to={x.to as any} className="block">
              <Card className="p-5 hover:shadow-md hover:border-[#0f4c5c] transition-all cursor-pointer h-full">
                <x.icon className="h-8 w-8 text-[#0f4c5c] mb-3" />
                <div className="font-semibold">{x.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{x.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
