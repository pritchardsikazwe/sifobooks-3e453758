import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { kw, monthlyHistory } from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_authenticated/manager/cashiers")({
  head: () => ({
    meta: [
      { title: "Cashiers & History — SifoBooks Manager" },
      { name: "description", content: "Assign cashiers to a branch, store, till station and cash drawer, manage their PINs, and open each cashier's month-by-month history." },
      { property: "og:title", content: "Cashiers & History — SifoBooks Manager" },
      { property: "og:description", content: "Cashier assignments, PIN control and monthly performance history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManagerCashiers,
});

function ManagerCashiers() {
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [pinFor, setPinFor] = useState<any | null>(null);
  const [pin, setPin] = useState("");
  const [history, setHistory] = useState<{ name: string; rows: Awaited<ReturnType<typeof monthlyHistory>>; records: any[] } | null>(null);

  const load = async () => {
    const [p, b, l, r] = await Promise.all([
      supabase.from("employee_pos_permissions").select("*").order("full_name"),
      supabase.from("branches").select("id,name").eq("active", true).order("name"),
      supabase.from("inventory_locations").select("id,name").eq("is_active", true).order("name"),
      supabase.from("pos_registers").select("id,name").eq("is_active", true).order("name"),
    ]);
    setRows((p.data ?? []) as any[]);
    setBranches((b.data ?? []) as any[]);
    setLocations((l.data ?? []) as any[]);
    setRegisters((r.data ?? []) as any[]);
  };
  useEffect(() => { void load(); }, []);

  const saveAssignment = async () => {
    const { error } = await supabase
      .from("employee_pos_permissions")
      .update({
        branch_id: edit.branch_id || null,
        location_id: edit.location_id || null,
        register_id: edit.register_id || null,
        drawer_name: edit.drawer_name || null,
      } as never)
      .eq("id", edit.id);
    if (error) return toast.error(error.message);
    toast.success("Assignment saved");
    setEdit(null);
    await load();
  };

  const savePin = async () => {
    const { data, error } = await supabase.rpc("set_cashier_pin" as never, { _permission_id: pinFor.id, _pin: pin } as never);
    if (error) return toast.error(error.message);
    const res = data as unknown as { ok: boolean; error?: string };
    if (!res?.ok) return toast.error(res?.error ?? "Could not set the PIN");
    toast.success("PIN set — it can never be read back, only replaced");
    setPin(""); setPinFor(null); await load();
  };

  const pinState = async (row: any, disabled: boolean, unlock = false) => {
    const { data, error } = await supabase.rpc("set_cashier_pin_state" as never, {
      _permission_id: row.id, _disabled: disabled, _unlock: unlock,
    } as never);
    if (error) return toast.error(error.message);
    const res = data as unknown as { ok: boolean; error?: string };
    if (!res?.ok) return toast.error(res?.error ?? "Could not update");
    toast.success("Updated");
    await load();
  };

  const openHistory = async (row: any) => {
    const hist = await monthlyHistory(row.user_id, row.worker_user_id);
    const { data: records } = await supabase
      .from("cashier_records")
      .select("*")
      .eq("cashier_user_id", row.worker_user_id)
      .order("period_start", { ascending: false });
    setHistory({ name: row.full_name ?? row.email, rows: hist, records: (records ?? []) as any[] });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Cashier</th><th className="p-2">Role</th><th className="p-2">Branch</th>
              <th className="p-2">Store</th><th className="p-2">Station / drawer</th><th className="p-2">PIN</th><th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{r.full_name ?? r.email}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </td>
                <td className="p-2 capitalize">{r.pos_role}</td>
                <td className="p-2">{branches.find((b) => b.id === r.branch_id)?.name ?? "—"}</td>
                <td className="p-2">{locations.find((l) => l.id === r.location_id)?.name ?? "—"}</td>
                <td className="p-2">
                  {registers.find((x) => x.id === r.register_id)?.name ?? "—"}
                  {r.drawer_name ? ` · ${r.drawer_name}` : ""}
                </td>
                <td className="p-2">
                  {r.pin_disabled ? <span className="text-destructive">Disabled</span>
                    : r.pin_hash ? <span className="text-emerald-600">Set</span>
                    : <span className="text-muted-foreground">Not set</span>}
                  {r.pin_locked_until && new Date(r.pin_locked_until) > new Date() && <div className="text-xs text-amber-600">Locked out</div>}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEdit({ ...r })}>Assign</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setPinFor(r); setPin(""); }}>Set PIN</Button>
                    <Button size="sm" variant="ghost" onClick={() => void pinState(r, !r.pin_disabled, true)}>
                      {r.pin_disabled ? "Enable" : "Disable"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void pinState(r, false, true)}>Unlock</Button>
                    <Button size="sm" variant="outline" onClick={() => void openHistory(r)}>History</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No cashiers yet — add them under POS workers.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign {edit?.full_name ?? edit?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Picker label="Branch" value={edit?.branch_id} options={branches} onChange={(v) => setEdit({ ...edit, branch_id: v })} />
            <Picker label="Store / stock location" value={edit?.location_id} options={locations} onChange={(v) => setEdit({ ...edit, location_id: v })} />
            <Picker label="POS station" value={edit?.register_id} options={registers} onChange={(v) => setEdit({ ...edit, register_id: v })} />
            <div className="space-y-1">
              <Label>Cash drawer</Label>
              <Input value={edit?.drawer_name ?? ""} onChange={(e) => setEdit({ ...edit, drawer_name: e.target.value })} placeholder="Drawer-01" />
            </div>
            <Button className="w-full" onClick={() => void saveAssignment()}>Save assignment</Button>
            <p className="text-xs text-muted-foreground">Sales rung up by this cashier always reduce the store selected here — never the warehouse.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set PIN for {pinFor?.full_name ?? pinFor?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              placeholder="4-8 digits"
              className="text-center text-xl tracking-[0.4em]"
            />
            <Button className="w-full" onClick={() => void savePin()}>Save PIN</Button>
            <p className="text-xs text-muted-foreground">Stored hashed. Nobody — including you — can read it back afterwards.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{history?.name} — history</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-auto">
            <div>
              <h3 className="mb-1 text-sm font-semibold">System shifts by month</h3>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2">Month</th><th className="p-2 text-right">Shifts</th><th className="p-2 text-right">Sales</th><th className="p-2 text-right">Cash variance</th><th className="p-2">Approvals</th></tr>
                </thead>
                <tbody>
                  {(history?.rows ?? []).map((m) => (
                    <tr key={m.month} className="border-t">
                      <td className="p-2">{new Date(`${m.month}-01`).toLocaleDateString("en-ZM", { month: "long", year: "numeric" })}</td>
                      <td className="p-2 text-right">{m.shifts}</td>
                      <td className="p-2 text-right">{kw(m.sales)}</td>
                      <td className="p-2 text-right">{kw(m.variance)}</td>
                      <td className="p-2">{m.approved} approved{m.pending ? ` · ${m.pending} pending` : ""}</td>
                    </tr>
                  ))}
                  {!history?.rows.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No system shifts yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">Historical / manual records</h3>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2">Period</th><th className="p-2">Source</th><th className="p-2 text-right">Delivered</th><th className="p-2 text-right">Sold</th><th className="p-2 text-right">Remaining</th><th className="p-2 text-right">Sales value</th><th className="p-2">Verified</th></tr>
                </thead>
                <tbody>
                  {(history?.records ?? []).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.period_start} → {r.period_end}</td>
                      <td className="p-2 uppercase text-xs">{r.source_type ?? "historical"}</td>
                      <td className="p-2 text-right">{r.delivered_qty}</td>
                      <td className="p-2 text-right">{r.sold_qty}</td>
                      <td className="p-2 text-right">{r.remaining_qty}</td>
                      <td className="p-2 text-right">{kw(Number(r.sales_value ?? 0))}</td>
                      <td className="p-2">{r.verified ? "Verified" : "Unverified"}</td>
                    </tr>
                  ))}
                  {!history?.records.length && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No handwritten records captured for this cashier.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Picker({ label, value, options, onChange }: { label: string; value: string | null; options: any[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Choose ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
