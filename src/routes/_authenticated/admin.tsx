import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCog, ShieldCheck, Bell, Building2, Users2, Sparkles, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const { data: c } = await supabase.from("companies").select("*").eq("user_id", u.user.id).maybeSingle();
    setCompany(c ?? null);
    if (c) {
      const { data: m } = await supabase.from("company_members")
        .select("*, profiles:user_id(email, full_name)")
        .eq("company_id", c.id).order("created_at");
      setMembers(m ?? []);
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

  const shortcuts = [
    { title: "Company Setup", desc: "Profile, logo, branches, tax settings", icon: Building2, to: "/setup" },
    { title: "Employees", desc: "HR master data", icon: Users2, to: "/employees" },
    { title: "Subscription", desc: "Plans & billing", icon: Sparkles, to: "/subscription" },
    { title: "Audit Logs", desc: "All system activity", icon: ShieldCheck, to: "/audit-logs" },
    { title: "Notifications", desc: "System notices", icon: Bell, to: "/notifications" },
    { title: "Compliance", desc: "ZRA, NAPSA, NHIMA obligations", icon: ShieldCheck, to: "/compliance" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-[#0f4c5c]" />
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-sm text-muted-foreground">Full control over {company?.name ?? "your company"} — members, roles, and modules.</p>
        </div>
      </div>

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
                        <Button size="icon" variant="ghost" onClick={() => remove(m.id)} disabled={m.role === "owner"}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

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
