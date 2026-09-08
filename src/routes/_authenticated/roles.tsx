import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Users, MapPin, Plus, Copy, Trash2, KeyRound, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequireModule } from "@/components/RequireModule";
import { usePermissions } from "@/hooks/usePermissions";
import { inviteStaffMember } from "@/lib/staff.functions";
import { clearAccessCache, type PermissionKey } from "@/lib/rbac";
import { getActiveCompanyId } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/roles")({
  head: () => ({ meta: [{ title: "Team & Roles — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireModule moduleKey="admin" requireManage>
      <TeamRolesPage />
    </RequireModule>
  ),
});

type Perm = { key: string; label: string; description?: string | null; perm_group: string; sort?: number };
type Role = { id: string; key: string; name: string; description: string | null; is_system: boolean; tenant_id: string | null; pos_channel: string | null };
type Staff = { id: string; user_id: string; email: string | null; full_name: string | null; role_id: string | null; branch_id: string | null; is_active: boolean };
type Branch = { id: string; name: string; code: string | null; active: boolean };

const GROUP_LABEL: Record<string, string> = {
  accounting: "Accounting", reports: "Reports", pos: "Point of Sale", shifts: "Cash Shifts", restaurant: "Restaurant",
  products: "Products & Prices", inventory: "Inventory", hr: "HR & Payroll", admin: "Administration",
};

function TeamRolesPage() {
  const { has, isStaff, refresh } = usePermissions();
  const canRoles = has("roles.manage") || !isStaff;
  const canUsers = has("users.manage") || !isStaff;

  const [perms, setPerms] = useState<Perm[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>({});
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: acc }, { data: p }, { data: r }, { data: rp }, { data: s }, { data: b }] = await Promise.all([
      supabase.rpc("my_access"),
      supabase.from("rbac_permissions").select("*").order("perm_group").order("sort"),
      supabase.from("rbac_roles").select("*").order("is_system", { ascending: false }).order("name"),
      supabase.from("rbac_role_permissions").select("role_id, permission_key"),
      supabase.from("staff_members").select("*").order("created_at"),
      supabase.from("branches").select("id,name,code,active").order("name"),
    ]);
    setTenantId(String((acc as any)?.tenant_id ?? ""));
    setPerms((p ?? []) as Perm[]);
    setRoles((r ?? []) as Role[]);
    const m: Record<string, Set<string>> = {};
    (rp ?? []).forEach((x: any) => { (m[x.role_id] ??= new Set()).add(x.permission_key); });
    setRolePerms(m);
    setStaff((s ?? []) as Staff[]);
    setBranches((b ?? []) as Branch[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const g: Record<string, Perm[]> = {};
    perms.forEach(p => { (g[p.perm_group] ??= []).push(p); });
    return g;
  }, [perms]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Team & Roles</h1>
          <p className="text-sm text-muted-foreground">Least-privilege access: each person gets only what their job needs. Enforced in the app and in the database.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { clearAccessCache(); refresh(); load(); }}>Refresh</Button>
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Team</TabsTrigger>
          <TabsTrigger value="roles"><ShieldCheck className="h-4 w-4 mr-1" /> Roles & Permissions</TabsTrigger>
          <TabsTrigger value="branches"><MapPin className="h-4 w-4 mr-1" /> Branches</TabsTrigger>
          <TabsTrigger value="matrix"><Eye className="h-4 w-4 mr-1" /> Access Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <TeamTab staff={staff} roles={roles} branches={branches} canUsers={canUsers} onChange={load} />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab roles={roles} groups={groups} rolePerms={rolePerms} tenantId={tenantId} canRoles={canRoles} onChange={load} />
        </TabsContent>
        <TabsContent value="branches" className="mt-4">
          <BranchesTab branches={branches} canUsers={canUsers} onChange={load} />
        </TabsContent>
        <TabsContent value="matrix" className="mt-4">
          <MatrixTab roles={roles} perms={perms} rolePerms={rolePerms} staff={staff} />
        </TabsContent>
      </Tabs>
      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}

/* ---------------------------------- Team ---------------------------------- */
function TeamTab({ staff, roles, branches, canUsers, onChange }: { staff: Staff[]; roles: Role[]; branches: Branch[]; canUsers: boolean; onChange: () => void }) {
  const invite = useServerFn(inviteStaffMember);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role_id: "", branch_id: "", pin: "" });
  const [busy, setBusy] = useState(false);
  const roleName = (id: string | null) => roles.find(r => r.id === id)?.name ?? "No role";
  const branchName = (id: string | null) => branches.find(b => b.id === id)?.name ?? "All branches";

  const submit = async () => {
    setBusy(true);
    try {
      const res = await invite({ data: { email: form.email, full_name: form.full_name, role_id: form.role_id, branch_id: form.branch_id || null, pin: form.pin } });
      toast.success(res.invited ? "Invitation email sent" : "Staff member added");
      setOpen(false); setForm({ email: "", full_name: "", role_id: "", branch_id: "", pin: "" }); onChange();
    } catch (e: any) { toast.error(e?.message ?? "Could not add staff member"); }
    finally { setBusy(false); }
  };
  const update = async (id: string, patch: Partial<Staff>) => {
    const { error } = await supabase.from("staff_members").update(patch as any).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); onChange(); }
  };
  const remove = async (s: Staff) => {
    if (!confirm(`Remove ${s.full_name || s.email} from your team? They will lose all access.`)) return;
    const { error } = await supabase.from("staff_members").delete().eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Removed"); onChange(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{staff.length} team member{staff.length === 1 ? "" : "s"}. Owners always have full access and are not listed.</p>
        {canUsers && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add staff</Button>}
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Branch</TableHead><TableHead>Active</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {staff.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>
                  {canUsers ? (
                    <Select value={s.role_id ?? ""} onValueChange={v => update(s.id, { role_id: v })}>
                      <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Choose role" /></SelectTrigger>
                      <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : roleName(s.role_id)}
                </TableCell>
                <TableCell>
                  {canUsers ? (
                    <Select value={s.branch_id ?? "__all"} onValueChange={v => update(s.id, { branch_id: v === "__all" ? null : v })}>
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">All branches</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : branchName(s.branch_id)}
                </TableCell>
                <TableCell><Switch checked={s.is_active} disabled={!canUsers} onCheckedChange={v => update(s.id, { is_active: v })} /></TableCell>
                <TableCell className="text-right">{canUsers && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
            {staff.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No staff yet. Add a cashier, waiter, manager or accountant.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cashier@business.com" /></div>
            <div><Label>Full name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Role</Label>
              <Select value={form.role_id} onValueChange={v => setForm({ ...form, role_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger>
                <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}{r.is_system ? "" : " (custom)"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Branch / outlet</Label>
              <Select value={form.branch_id || "__all"} onValueChange={v => setForm({ ...form, branch_id: v === "__all" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__all">All branches</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Till PIN (4–8 digits, optional)</Label><Input inputMode="numeric" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })} /><p className="text-[11px] text-muted-foreground mt-1">Managers use their PIN to authorise cashier refunds, voids and discounts.</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={busy || !form.email || !form.role_id}>{busy ? "Adding…" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------- Roles ---------------------------------- */
function RolesTab({ roles, groups, rolePerms, tenantId, canRoles, onChange }: {
  roles: Role[]; groups: Record<string, Perm[]>; rolePerms: Record<string, Set<string>>; tenantId: string; canRoles: boolean; onChange: () => void;
}) {
  const [selected, setSelected] = useState<string>(roles[0]?.id ?? "");
  useEffect(() => { if (!selected && roles[0]) setSelected(roles[0].id); }, [roles, selected]);
  const role = roles.find(r => r.id === selected);
  const editable = Boolean(role && !role.is_system && canRoles);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const toggle = async (perm: string, on: boolean) => {
    if (!role || !editable) return;
    const q = on
      ? supabase.from("rbac_role_permissions").insert({ role_id: role.id, permission_key: perm })
      : supabase.from("rbac_role_permissions").delete().eq("role_id", role.id).eq("permission_key", perm);
    const { error } = await q;
    if (error) toast.error(error.message); else onChange();
  };
  const createRole = async (cloneFrom?: Role) => {
    const name = newName.trim() || (cloneFrom ? `${cloneFrom.name} (copy)` : "");
    if (!name) { toast.error("Enter a role name"); return; }
    setCreating(true);
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("rbac_roles").insert({ key, name, tenant_id: tenantId, is_system: false, pos_channel: cloneFrom?.pos_channel ?? null, description: cloneFrom ? `Based on ${cloneFrom.name}` : null }).select("id").single();
    if (error || !data) { toast.error(error?.message ?? "Could not create role"); setCreating(false); return; }
    if (cloneFrom) {
      const src = Array.from(rolePerms[cloneFrom.id] ?? []);
      if (src.length) await supabase.from("rbac_role_permissions").insert(src.map(p => ({ role_id: data.id, permission_key: p })));
    }
    toast.success("Role created"); setNewName(""); setCreating(false); onChange(); setSelected(data.id);
  };
  const deleteRole = async () => {
    if (!role || role.is_system) return;
    if (!confirm(`Delete role "${role.name}"? Staff on this role will lose access until reassigned.`)) return;
    const { error } = await supabase.from("rbac_roles").delete().eq("id", role.id);
    if (error) toast.error(error.message); else { toast.success("Role deleted"); setSelected(""); onChange(); }
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-2">
        <div className="rounded-xl border bg-card divide-y">
          {roles.map(r => (
            <button key={r.id} onClick={() => setSelected(r.id)} className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted ${selected === r.id ? "bg-primary/10 font-semibold" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{r.name}</span>
                {r.is_system ? <Badge variant="secondary" className="text-[10px]">Template</Badge> : <Badge className="text-[10px]">Custom</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground">{(rolePerms[r.id]?.size ?? 0)} permissions{r.pos_channel ? ` · ${r.pos_channel}` : ""}</div>
            </button>
          ))}
        </div>
        {canRoles && (
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <Label className="text-xs">New custom role</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Senior Cashier" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createRole()} disabled={creating}><Plus className="h-4 w-4 mr-1" /> Create</Button>
              {role && <Button size="sm" variant="outline" onClick={() => createRole(role)} disabled={creating}><Copy className="h-4 w-4 mr-1" /> Clone selected</Button>}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {!role ? <p className="text-sm text-muted-foreground">Select a role.</p> : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{role.name}</h2>
                <p className="text-xs text-muted-foreground">{role.description || (role.is_system ? "Built-in template. Clone it to customise." : "Custom role for your business.")}</p>
              </div>
              {editable && <Button variant="outline" size="sm" className="text-destructive" onClick={deleteRole}><Trash2 className="h-4 w-4 mr-1" /> Delete role</Button>}
            </div>
            {!editable && canRoles && role.is_system && <p className="text-xs rounded-md bg-muted px-3 py-2">Templates are read-only so every business starts from a safe baseline. Use <b>Clone selected</b> to make an editable copy.</p>}
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(groups).map(([g, list]) => (
                <div key={g} className="rounded-lg border p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">{GROUP_LABEL[g] ?? g}</div>
                  <div className="space-y-2">
                    {list.map(p => {
                      const on = rolePerms[role.id]?.has(p.key) ?? false;
                      return (
                        <div key={p.key} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{p.label}</div>
                            <div className="text-[11px] text-muted-foreground"><code className="text-[10px]">{p.key}</code>{p.description ? ` — ${p.description}` : ""}</div>
                          </div>
                          <Switch checked={on} disabled={!editable} onCheckedChange={v => toggle(p.key, v)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Branches -------------------------------- */
function BranchesTab({ branches, canUsers, onChange }: { branches: Branch[]; canUsers: boolean; onChange: () => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const companyId = await getActiveCompanyId();
    if (!u.user || !companyId) { toast.error("No active company"); return; }
    const { error } = await supabase.from("branches").insert({ name: name.trim(), code: code.trim() || null, company_id: companyId, user_id: u.user.id, active: true } as any);
    if (error) toast.error(error.message); else { toast.success("Branch added"); setName(""); setCode(""); onChange(); }
  };
  const toggle = async (b: Branch, active: boolean) => {
    const { error } = await supabase.from("branches").update({ active }).eq("id", b.id);
    if (error) toast.error(error.message); else onChange();
  };
  return (
    <div className="space-y-3 max-w-3xl">
      <p className="text-sm text-muted-foreground">Assign staff to a branch/outlet and they only see that location's sales, shifts, tables, stock and reports.</p>
      {canUsers && (
        <div className="flex flex-wrap gap-2 items-end rounded-xl border bg-card p-3">
          <div className="flex-1 min-w-40"><Label className="text-xs">Branch name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Main Outlet" /></div>
          <div className="w-28"><Label className="text-xs">Code</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="LSK1" /></div>
          <Button onClick={add} disabled={!name.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      )}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {branches.map(b => (
              <TableRow key={b.id}><TableCell className="font-medium">{b.name}</TableCell><TableCell>{b.code ?? "—"}</TableCell><TableCell><Switch checked={b.active} disabled={!canUsers} onCheckedChange={v => toggle(b, v)} /></TableCell></TableRow>
            ))}
            {branches.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">No branches yet — staff see the whole business.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* --------------------------------- Matrix --------------------------------- */
function MatrixTab({ roles, perms, rolePerms, staff }: { roles: Role[]; perms: Perm[]; rolePerms: Record<string, Set<string>>; staff: Staff[] }) {
  const usedRoles = roles.filter(r => staff.some(s => s.role_id === r.id) || r.is_system);
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card">Permission</TableHead>
            {usedRoles.map(r => <TableHead key={r.id} className="text-center whitespace-nowrap">{r.name}<div className="text-[10px] font-normal text-muted-foreground">{staff.filter(s => s.role_id === r.id).length} staff</div></TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {perms.map(p => (
            <TableRow key={p.key}>
              <TableCell className="sticky left-0 bg-card"><div className="text-sm">{p.label}</div><code className="text-[10px] text-muted-foreground">{p.key as PermissionKey}</code></TableCell>
              {usedRoles.map(r => <TableCell key={r.id} className="text-center">{rolePerms[r.id]?.has(p.key) ? <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" /> : <span className="text-muted-foreground/40">·</span>}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
