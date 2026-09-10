import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { invitePosWorker } from "@/lib/pos-workers.functions";
import { POS_ROLES, POS_FEATURES, POS_MATRIX, type PosRole } from "@/lib/pos-permissions";

export const Route = createFileRoute("/_authenticated/pos-workers")({
  head: () => ({
    meta: [
      { title: "POS Worker Access & Roles — SifoBooks" },
      { name: "description", content: "Assign cashier, waiter, supervisor, manager and kitchen roles to staff logins and control what each may do at the till." },
      { property: "og:title", content: "POS Worker Access & Roles — SifoBooks" },
      { property: "og:description", content: "Role permission matrix enforced in the database, not just hidden buttons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PosWorkers,
});

function PosWorkers() {
  const [rows, setRows] = useState<any[]>([]);
  const [resets, setResets] = useState<any[]>([]);
  const [mode, setMode] = useState<"email" | "id">("email");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({ full_name: "", email: "", worker_user_id: "", pos_role: "cashier" as PosRole, pin: "" });
  const invite = useServerFn(invitePosWorker);

  const load = async () => {
    const [{ data }, { data: rs }] = await Promise.all([
      supabase.from("employee_pos_permissions").select("id,user_id,worker_user_id,employee_id,company_id,full_name,pos_role,allow,deny,is_active,created_at,updated_at,email,pin_locked,pin_set_at,branch_id,location_id,register_id,drawer_name,failed_pin_attempts,pin_locked_until,last_pin_login_at,pin_disabled").order("created_at", { ascending: false }),
      supabase.from("pos_pin_resets").select("*").in("status", ["pending", "approved"]).order("created_at", { ascending: false }),
    ]);
    setRows(data ?? []);
    setResets(rs ?? []);
  };
  useEffect(() => { load(); }, []);

  const approveReset = async (id: string) => {
    const newPin = window.prompt("Issue a new PIN for this worker (4-8 digits)") ?? "";
    if (!newPin) return;
    if (!/^\d{4,8}$/.test(newPin)) return toast.error("PIN must be 4-8 digits");
    const { error } = await supabase.rpc("approve_pos_pin_reset", { _reset_id: id, _new_pin: newPin });
    if (error) return toast.error(error.message);
    toast.success("New PIN issued — the worker must confirm it on the terminal"); load();
  };

  const denyReset = async (id: string) => {
    const reason = window.prompt("Reason for declining (optional)") ?? "";
    const { error } = await supabase.rpc("deny_pos_pin_reset", { _reset_id: id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Request declined — terminal stays locked"); load();
  };


  const reset = () => setForm({ full_name: "", email: "", worker_user_id: "", pos_role: "cashier", pin: "" });

  const add = async () => {
    if (form.pin && !/^\d{4,8}$/.test(form.pin)) return toast.error("PIN must be 4-8 digits");
    setBusy(true);
    try {
      if (mode === "email") {
        const res = await invite({ data: { email: form.email, full_name: form.full_name, pos_role: form.pos_role, pin: form.pin } });
        toast.success(res.invited ? `Invite sent to ${res.email}` : `${res.email} linked to the POS terminal`);
      } else {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        if (!form.worker_user_id) return toast.error("Paste the staff member's user ID");
        const { error } = await supabase.from("employee_pos_permissions").insert({
          user_id: auth.user.id, worker_user_id: form.worker_user_id, full_name: form.full_name || null,
          pos_role: form.pos_role, pin: form.pin || null,
        });
        if (error) throw new Error(error.message);
        toast.success("Worker access granted");
      }
      reset(); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not grant access");
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (id: string, pos_role: string) => {
    const { error } = await supabase.from("employee_pos_permissions").update({ pos_role }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const setPin = async (id: string) => {
    const pin = window.prompt("Terminal PIN (4-8 digits)") ?? "";
    if (!pin) return;
    if (!/^\d{4,8}$/.test(pin)) return toast.error("PIN must be 4-8 digits");
    const { data, error } = await supabase.rpc("set_cashier_pin", { _permission_id: id, _pin: pin });
    if (error) return toast.error(error.message);
    if (!(data as any)?.ok) return toast.error("Could not update that PIN");
    toast.success("PIN updated"); load();
  };

  const unlockPin = async (id: string) => {
    const { error } = await supabase.rpc("set_cashier_pin_state", { _permission_id: id, _disabled: false, _unlock: true });
    if (error) return toast.error(error.message);
    toast.success("Terminal unlocked"); load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("employee_pos_permissions").update({ is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(is_active ? "Worker enabled" : "Worker disabled");
    load();
  };

  const removeWorker = async (row: any) => {
    const who = row.full_name || row.email || "this worker";
    if (!window.confirm(`Remove ${who} from the till? Their sales history stays intact, but they can no longer sign in.`)) return;
    const { error } = await supabase.from("employee_pos_permissions").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`${who} removed`); load();
  };

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r: any) => {
    if (filter === "active" && !r.is_active) return false;
    if (filter === "inactive" && r.is_active) return false;
    if (!q) return true;
    return `${r.full_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POS worker access &amp; roles</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Workers sign in to the separate POS shell at <code>/w</code> — they never see the accounting sidebar. Permissions are enforced by database rules.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-semibold">Grant access</div>
          <div className="flex rounded-lg border p-0.5 text-xs">
            {(["email", "id"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {m === "email" ? "Invite by email" : "By user ID"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Full name"
            value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          {mode === "email" ? (
            <input type="email" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="staff@company.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          ) : (
            <input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Staff auth user ID"
              value={form.worker_user_id} onChange={(e) => setForm({ ...form, worker_user_id: e.target.value })} />
          )}
          <select className="rounded-lg border bg-background px-3 py-2 text-sm"
            value={form.pos_role} onChange={(e) => setForm({ ...form, pos_role: e.target.value as PosRole })}>
            {POS_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <input inputMode="numeric" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Terminal PIN (4-8 digits)"
            value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "email"
            ? "If the email has no SifoBooks login yet, an invite is emailed automatically. The PIN unlocks the POS terminal on shared devices."
            : "Use this when the staff member already signed in and you have their user ID."}
        </p>
        <Button onClick={add} disabled={busy}>{busy ? "Working…" : mode === "email" ? "Invite worker" : "Grant access"}</Button>
      </div>


      {resets.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 font-semibold border-b flex items-center gap-2">
            PIN reset requests
            <span className="rounded-full bg-amber-500/15 text-amber-600 text-xs px-2 py-0.5">{resets.length}</span>
          </div>
          <div className="divide-y">
            {resets.map((r) => {
              const w = rows.find((x) => x.id === r.permission_id);
              return (
                <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{w?.full_name ?? w?.email ?? "Worker"}</div>
                    <div className="text-muted-foreground">
                      {r.status === "pending"
                        ? `Requested ${new Date(r.created_at).toLocaleString()} — old PIN already disabled`
                        : `New PIN issued — waiting for the worker to confirm on the terminal (${r.attempts}/5 attempts used)`}
                      {r.reason ? ` · "${r.reason}"` : ""}
                    </div>
                  </div>
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveReset(r.id)}>Approve &amp; issue PIN</Button>
                      <Button size="sm" variant="outline" onClick={() => denyReset(r.id)}>Decline</Button>
                    </div>
                  ) : (
                    <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-600 px-3 py-1">Awaiting confirmation</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2 justify-between">
          <div className="font-semibold">
            Till workers <span className="text-muted-foreground font-normal text-sm">({visible.length} of {rows.length})</span>
          </div>
          <div className="flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email"
              className="rounded-lg border bg-background px-3 py-1.5 text-sm w-52" />
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-lg border bg-background px-2 py-1.5 text-sm">
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Disabled only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Name", "Email", "Role", "PIN", "Status", "Last till sign-in", ""].map((h) => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const duplicate = r.email && rows.filter((x) => (x.email ?? "").toLowerCase() === String(r.email).toLowerCase()).length > 1;
                const locked = r.pin_locked || (r.pin_locked_until && new Date(r.pin_locked_until) > new Date());
                return (
                  <tr key={r.id} className="border-t align-middle">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.full_name ?? r.worker_user_id ?? "—"}</div>
                      {duplicate && <div className="text-xs text-amber-600">Duplicate entry for this email</div>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.email ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select value={r.pos_role} onChange={(e) => setRole(r.id, e.target.value)} className="rounded border bg-background px-2 py-1">
                        {POS_ROLES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button className="underline underline-offset-2" onClick={() => setPin(r.id)}>
                        {r.pin_set_at ? "Change PIN" : "Set PIN"}
                      </button>
                      {r.pin_disabled && <span className="ml-2 text-xs text-amber-600">disabled</span>}
                      {locked && (
                        <button className="ml-2 text-xs text-destructive underline" onClick={() => unlockPin(r.id)}>locked — unlock</button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${r.is_active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        {r.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {r.last_pin_login_at ? new Date(r.last_pin_login_at).toLocaleString() : "Never"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => toggle(r.id, !r.is_active)}>{r.is_active ? "Disable" : "Enable"}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeWorker(r)}>Remove</Button>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {rows.length ? "No workers match that search." : "No POS workers yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border overflow-x-auto">
        <div className="px-3 py-2 font-semibold bg-muted/50">Permission matrix</div>
        <table className="w-full text-xs">
          <thead>
            <tr><th className="px-3 py-2 text-left">Feature</th>
              {POS_ROLES.map((r) => <th key={r.key} className="px-3 py-2">{r.label}</th>)}</tr>
          </thead>
          <tbody>
            {POS_FEATURES.map((f) => (
              <tr key={f.key} className="border-t">
                <td className="px-3 py-1.5">{f.label}</td>
                {POS_ROLES.map((r) => {
                  const lvl = POS_MATRIX[r.key][f.key];
                  return <td key={r.key} className="px-3 py-1.5 text-center">
                    {lvl === "full" ? "✅" : lvl === "limited" ? "Limited" : "—"}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
