import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INDUSTRIES, getIndustry } from "@/lib/industries";
import { installIndustry, listInstalledModules } from "@/lib/install-industry";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/industry")({
  head: () => ({ meta: [{ title: "Industry & Modules — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: IndustryPage,
});

function IndustryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("general");
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: c } = await supabase.from("companies").select("id, industry").eq("user_id", u.user.id).maybeSingle();
      if (c) {
        setCompanyId(c.id);
        setCompanyIndustry(c.industry ?? null);
        if (c.industry) setSelectedId(c.industry);
        const inst = await listInstalledModules(c.id);
        setInstalled(new Set(inst));
        setSelectedModules(new Set(inst));
      }
      setLoading(false);
    })();
  }, []);

  const industry = useMemo(() => getIndustry(selectedId) ?? INDUSTRIES[0], [selectedId]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return INDUSTRIES;
    return INDUSTRIES.filter(i => i.label.toLowerCase().includes(s) || i.tagline.toLowerCase().includes(s));
  }, [q]);

  const toggleModule = (k: string) => {
    setSelectedModules(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const selectAll = () => setSelectedModules(new Set(industry.modules.map(m => m.key)));
  const clearAll = () => setSelectedModules(new Set());

  const install = async () => {
    if (!companyId || !userId) return;
    setSaving(true);
    try {
      const res = await installIndustry({
        userId, companyId,
        industryId: industry.id,
        moduleKeys: Array.from(selectedModules),
      });
      setCompanyIndustry(industry.id);
      const inst = await listInstalledModules(companyId);
      setInstalled(new Set(inst));
      toast.success(`${industry.label} installed`, {
        description: `${res.modules_installed} module(s) enabled · ${res.coa_added} account(s) added to your Chart of Accounts.`,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Install failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading industries…</div>;
  }

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Industry & Modules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick your industry and turn on the modules you need. The core accounting engine (GL, invoicing, banking, reports, AFS) is always on — this just adds industry-specific screens, chart-of-accounts and workflows.
          </p>
          {companyIndustry && (
            <div className="mt-2 text-xs text-slate-500">
              Current industry: <Badge variant="secondary" className="ml-1">{getIndustry(companyIndustry)?.label ?? companyIndustry}</Badge>
            </div>
          )}
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/setup">Back to Setup</Link></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Choose your industry</CardTitle>
                <CardDescription>{INDUSTRIES.length} presets available. You can switch or add more later.</CardDescription>
              </div>
              <div className="relative w-56">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search industries…" className="pl-8 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[560px] overflow-auto pr-1">
              {filtered.map(i => {
                const active = selectedId === i.id;
                const current = companyIndustry === i.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => { setSelectedId(i.id); setSelectedModules(new Set(installed)); }}
                    className={`text-left rounded-lg border p-3 transition ${active ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{i.emoji}</span>
                      <span className="font-semibold text-sm text-slate-900">{i.label}</span>
                      {current && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{i.tagline}</div>
                    <div className="mt-2 text-[10px] text-slate-400">{i.modules.length} modules · {i.coa.length} accounts</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><span className="text-xl">{industry.emoji}</span> {industry.label}</CardTitle>
            <CardDescription>{industry.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modules</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>Select all</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>Clear</Button>
              </div>
            </div>
            {industry.modules.length === 0 ? (
              <div className="text-sm text-slate-500 py-4">No optional modules — core accounting only.</div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                {industry.modules.map(m => {
                  const on = selectedModules.has(m.key);
                  const already = installed.has(m.key);
                  return (
                    <label key={m.key} className={`flex items-start gap-3 rounded-md border p-2.5 cursor-pointer ${on ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                      <Checkbox checked={on} onCheckedChange={() => toggleModule(m.key)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-slate-900">{m.label}</div>
                          {already && <Badge variant="secondary" className="text-[10px] h-4">installed</Badge>}
                        </div>
                        <div className="text-xs text-slate-500">{m.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {industry.coa.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Chart of Accounts added</div>
                <div className="rounded-md border bg-slate-50 p-2 text-xs text-slate-600 max-h-40 overflow-auto">
                  {industry.coa.map(a => (
                    <div key={a.account_code} className="flex justify-between py-0.5">
                      <span><span className="font-mono text-slate-500 mr-2">{a.account_code}</span>{a.account_name}</span>
                      <span className="text-slate-400 capitalize">{a.account_type}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Existing accounts with the same code are kept unchanged.</div>
              </div>
            )}

            <Button onClick={install} disabled={saving || !companyId} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {companyIndustry === industry.id ? "Update modules" : `Install ${industry.label}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
