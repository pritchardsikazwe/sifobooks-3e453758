import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, CATEGORY_ORDER } from "@/lib/modules";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: RolesPage,
});

const ROLES: { key: string; label: string }[] = [
  { key: "super_admin", label: "Super Admin" },
  { key: "admin", label: "Admin" },
  { key: "manager", label: "Manager" },
  { key: "accountant", label: "Accountant" },
  { key: "sales", label: "Sales" },
  { key: "purchaser", label: "Purchaser" },
  { key: "hr", label: "HR" },
  { key: "viewer", label: "Viewer (read-only)" },
];

type PermKey = string; // `${role}:${module}`
type PermRow = { role: string; module_key: string; can_view: boolean; can_manage: boolean };

function RolesPage() {
  const [rows, setRows] = useState<Map<PermKey, PermRow>>(new Map());
  const [dirty, setDirty] = useState<Set<PermKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState<string>("admin");

  const modules = useMemo(() => {
    const list: { key: string; label: string; category: string }[] = [];
    for (const cat of CATEGORY_ORDER) {
      for (const m of MODULES) if (m.category === cat) list.push({ key: m.key, label: m.label, category: cat });
    }
    return list;
  }, []);

  const load = async () => {
    const { data } = await supabase.from("role_module_permissions").select("role,module_key,can_view,can_manage");
    const map = new Map<PermKey, PermRow>();
    (data ?? []).forEach((r: any) => map.set(`${r.role}:${r.module_key}`, r));
    setRows(map);
    setDirty(new Set());
  };
  useEffect(() => { load(); }, []);

  const get = (role: string, mod: string): PermRow => {
    return rows.get(`${role}:${mod}`) ?? { role, module_key: mod, can_view: false, can_manage: false };
  };

  const toggle = (role: string, mod: string, field: "can_view" | "can_manage") => {
    const key = `${role}:${mod}`;
    const cur = get(role, mod);
    const next: PermRow = { ...cur, [field]: !cur[field] };
    // manage implies view
    if (field === "can_manage" && next.can_manage) next.can_view = true;
    if (field === "can_view" && !next.can_view) next.can_manage = false;
    const map = new Map(rows); map.set(key, next); setRows(map);
    const d = new Set(dirty); d.add(key); setDirty(d);
  };

  const save = async () => {
    if (dirty.size === 0) { toast.info("No changes"); return; }
    setSaving(true);
    const payload = Array.from(dirty).map(k => {
      const r = rows.get(k)!;
      return { role: r.role, module_key: r.module_key, can_view: r.can_view, can_manage: r.can_manage };
    });
    const { error } = await supabase.from("role_module_permissions")
      .upsert(payload as any, { onConflict: "role,module_key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Saved ${payload.length} permission${payload.length===1?"":"s"}`);
    await load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        </div>
        <Button variant="save" onClick={save} disabled={saving || dirty.size === 0} >
          <Save className="h-4 w-4 mr-1" /> Save {dirty.size > 0 ? `(${dirty.size})` : ""}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Grant each role view or manage access per module. <strong>View</strong> shows the module in the sidebar
        and lets the user read data. <strong>Manage</strong> also lets them create, edit and delete records.
        Super Admins always have full access.
      </p>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {ROLES.map(r => (
          <Button key={r.key} variant={activeRole === r.key ? "default" : "outline"} size="sm"
            onClick={() => setActiveRole(r.key)}
            className={activeRole === r.key ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
            {r.label}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Module</th>
              <th className="text-left px-4 py-2 w-32">Category</th>
              <th className="text-center px-4 py-2 w-24">View</th>
              <th className="text-center px-4 py-2 w-24">Manage</th>
            </tr>
          </thead>
          <tbody>
            {modules.map(m => {
              const p = get(activeRole, m.key);
              return (
                <tr key={m.key} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{m.label}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.category}</td>
                  <td className="px-4 py-2 text-center">
                    <Checkbox checked={p.can_view} onCheckedChange={() => toggle(activeRole, m.key, "can_view")} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Checkbox checked={p.can_manage} onCheckedChange={() => toggle(activeRole, m.key, "can_manage")} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
