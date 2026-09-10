import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  KeyRound, Loader2, Search, ShieldCheck, ShieldOff, Trash2, UserPlus, MailCheck, RefreshCw, CheckCircle2, XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  adminListAccounts, adminSetPassword, adminSetDisabled, adminConfirmEmail,
  adminCreateAccount, adminSetRoleByEmail, adminDeleteAccount, type AdminAuthUser,
} from "@/lib/admin-users.functions";

const ROLES = ["super_admin", "admin", "manager", "accountant", "hr", "sales", "purchaser", "viewer"];

/**
 * Sign-in account administration for the platform super administrator.
 * Every action is executed server-side after re-checking the caller's role and
 * is written to the audit trail. No password is ever displayed or stored here.
 */
export function AccountsAdmin({ roleMap, onRolesChanged }: { roleMap: Record<string, string[]>; onRolesChanged: () => void }) {
  const listAccounts = useServerFn(adminListAccounts);
  const setPassword = useServerFn(adminSetPassword);
  const setDisabled = useServerFn(adminSetDisabled);
  const confirmEmail = useServerFn(adminConfirmEmail);
  const createAccount = useServerFn(adminCreateAccount);
  const setRoleByEmail = useServerFn(adminSetRoleByEmail);
  const deleteAccount = useServerFn(adminDeleteAccount);

  const [rows, setRows] = useState<AdminAuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [pwFor, setPwFor] = useState<AdminAuthUser | null>(null);
  const [pw, setPw] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ email: "", password: "", fullName: "", role: "viewer" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listAccounts({}));
    } catch (e: any) {
      setError(e?.message ?? "Could not load accounts");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      await load();
      onRolesChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "That did not work");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => !needle || `${r.email ?? ""} ${r.fullName ?? ""}`.toLowerCase().includes(needle));
  }, [rows, q]);

  const stats = useMemo(() => ({
    total: rows.length,
    disabled: rows.filter((r) => r.disabled).length,
    unconfirmed: rows.filter((r) => !r.emailConfirmed).length,
    active30: rows.filter((r) => r.lastSignInAt && Date.now() - new Date(r.lastSignInAt).getTime() < 30 * 864e5).length,
  }), [rows]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Sign-in accounts</h2>
          <p className="text-sm text-muted-foreground">
            Set passwords, block or restore access, confirm email addresses and grant platform roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><UserPlus className="mr-1 h-4 w-4" /> New account</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Accounts", value: stats.total },
          { label: "Signed in (30 days)", value: stats.active30 },
          { label: "Blocked", value: stats.disabled },
          { label: "Unconfirmed email", value: stats.unconfirmed },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Account</th><th>Status</th><th>Last sign-in</th><th>Platform roles</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => {
                const roles = roleMap[u.id] ?? [];
                const isSuper = roles.includes("super_admin");
                return (
                  <tr key={u.id} className="hover:bg-muted/40">
                    <td className="py-2">
                      <div className="font-medium">{u.fullName || u.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {u.disabled
                          ? <Badge className="border-rose-200 bg-rose-100 text-rose-700">Blocked</Badge>
                          : <Badge variant="outline" className="text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Active</Badge>}
                        {!u.emailConfirmed && <Badge variant="outline" className="text-amber-700"><XCircle className="mr-1 h-3 w-3" /> Unconfirmed</Badge>}
                        {isSuper && <Badge className="border-rose-200 bg-rose-100 text-rose-700">super</Badge>}
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : "Never"}
                    </td>
                    <td className="text-xs text-muted-foreground">{roles.length ? roles.join(", ") : "—"}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPwFor(u); setPw(""); }}>
                          <KeyRound className="mr-1 h-3 w-3" /> Password
                        </Button>
                        {!u.emailConfirmed && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={busy === `c-${u.id}`}
                            onClick={() => run(`c-${u.id}`, () => confirmEmail({ data: { userId: u.id } }), "Email confirmed")}>
                            <MailCheck className="mr-1 h-3 w-3" /> Confirm
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          disabled={busy === `d-${u.id}`}
                          onClick={() => run(`d-${u.id}`, () => setDisabled({ data: { userId: u.id, disabled: !u.disabled } }), u.disabled ? "Access restored" : "Access blocked")}>
                          {u.disabled ? <ShieldCheck className="mr-1 h-3 w-3" /> : <ShieldOff className="mr-1 h-3 w-3" />}
                          {u.disabled ? "Unblock" : "Block"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          disabled={busy === `s-${u.id}` || !u.email}
                          onClick={() => run(`s-${u.id}`, () => setRoleByEmail({ data: { email: u.email!, role: "super_admin", grant: !isSuper } }), isSuper ? "Super admin removed" : "Super admin granted")}>
                          {isSuper ? "Remove super" : "Make super admin"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600"
                          disabled={busy === `x-${u.id}`}
                          onClick={() => {
                            if (!confirm(`Permanently delete the sign-in account ${u.email}? Their company records stay in place.`)) return;
                            void run(`x-${u.id}`, () => deleteAccount({ data: { userId: u.id } }), "Account deleted");
                          }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td className="py-4 text-muted-foreground" colSpan={5}>No accounts match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Set password */}
      <Dialog open={Boolean(pwFor)} onOpenChange={(o) => !o && setPwFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a new password</DialogTitle>
            <DialogDescription>{pwFor?.email} will be able to sign in with this password immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwFor(null)}>Cancel</Button>
            <Button
              disabled={pw.length < 8 || busy === "pw"}
              onClick={() => {
                const id = pwFor!.id;
                void run("pw", () => setPassword({ data: { userId: id, password: pw } }), "Password updated").then(() => { setPwFor(null); setPw(""); });
              }}
            >
              {busy === "pw" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create account */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New sign-in account</DialogTitle>
            <DialogDescription>The account is created ready to use — no confirmation email needed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div><Label>Full name</Label><Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></div>
            <div><Label>Password</Label><Input value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="At least 8 characters" /></div>
            <div>
              <Label>Platform role</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!draft.email.trim() || draft.password.length < 8 || busy === "new"}
              onClick={() => void run("new", () => createAccount({ data: draft }), "Account created").then(() => {
                setCreateOpen(false);
                setDraft({ email: "", password: "", fullName: "", role: "viewer" });
              })}
            >
              {busy === "new" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
