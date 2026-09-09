import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Company = { id: string; name: string; base_currency: string | null; country: string | null };

export function CompanySwitcher() {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    // A user can access a company either as its owner or as a member/staff user.
    // Load both sets so the workspace switcher matches the tenant context used by the sidebar.
    const [{ data: owned }, { data: memberships }] = await Promise.all([
      supabase
        .from("companies")
        .select("id,name,base_currency,country")
        .eq("user_id", u.user.id)
        .order("created_at"),
      supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", u.user.id)
        .order("created_at"),
    ]);

    const ownedCompanies = owned ?? [];
    const memberCompanyIds = (memberships ?? []).map(m => m.company_id).filter(Boolean);
    let memberCompanies: Company[] = [];

    if (memberCompanyIds.length > 0) {
      const { data } = await supabase
        .from("companies")
        .select("id,name,base_currency,country")
        .in("id", memberCompanyIds);
      memberCompanies = data ?? [];
    }

    const byId = new Map<string, Company>();
    [...ownedCompanies, ...memberCompanies].forEach(company => byId.set(company.id, company));
    const allCompanies = Array.from(byId.values());
    setCompanies(allCompanies);

    const { data: p } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", u.user.id)
      .maybeSingle();

    let active = p?.active_company_id as string | null;

    // Never retain a stale/unauthorized active company in the UI.
    if (!active || !byId.has(active)) {
      active = allCompanies[0]?.id ?? null;
      if (active) {
        await supabase.from("profiles").update({ active_company_id: active }).eq("id", u.user.id);
      }
    }

    setActiveId(active);
  };

  useEffect(() => {
    load();
  }, []);

  const switchTo = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!companies.some(company => company.id === id)) {
      toast.error("You do not have access to that company");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ active_company_id: id })
      .eq("id", u.user.id);

    if (error) return toast.error(error.message);

    setActiveId(id);
    setOpen(false);
    toast.success("Switched company");
    // Refresh app so pages re-read active company.
    setTimeout(() => window.location.reload(), 250);
  };

  const create = async () => {
    if (!newName.trim()) return toast.error("Name required");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({ user_id: u.user.id, name: newName.trim(), base_currency: "ZMW", country: "Zambia" })
      .select()
      .single();

    setBusy(false);
    if (error) return toast.error(error.message);

    setNewName("");
    setCreating(false);
    await supabase.from("profiles").update({ active_company_id: data.id }).eq("id", u.user.id);
    toast.success(`Created ${data.name}`);
    setTimeout(() => window.location.reload(), 300);
  };

  const active = companies.find(c => c.id === activeId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-2 sm:px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
        >
          <Building2 className="h-4 w-4 text-[#0f4c5c]" />
          <span className="hidden sm:inline max-w-[140px] truncate font-medium">
            {active?.name ?? "Select company"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-2 py-1">
          Your companies
        </div>
        <div className="max-h-64 overflow-y-auto">
          {companies.length === 0 && (
            <div className="p-3 text-xs text-slate-500">No companies yet.</div>
          )}
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => switchTo(c.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-100 text-left"
            >
              <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-[11px] text-slate-500">{c.country ?? "—"} · {c.base_currency ?? "ZMW"}</div>
              </div>
              {c.id === activeId && <Check className="h-4 w-4 text-emerald-600" />}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 mt-1 pt-2">
          {creating ? (
            <div className="space-y-2 px-1">
              <Input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="New company name"
                onKeyDown={e => e.key === "Enter" && create()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={create} disabled={busy} className="bg-[#0f4c5c] hover:bg-[#0c3f4c] flex-1">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-100 text-sm text-[#0f4c5c] font-medium"
            >
              <Plus className="h-4 w-4" /> Add company
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
