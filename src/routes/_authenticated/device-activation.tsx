// @ts-nocheck -- uses the loosely typed data client; see AGENTS.md
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, MinusCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getDeviceId, registerTerminal, saveTerminalInfo } from "@/services/printTerminal";
import { getActivation, runStartupChecks, saveActivation, type StartupReport } from "@/lib/platform/startup-checks";

/**
 * Select company + branch and authorise this device. Reuses the existing
 * device registry (print_devices, unique per user+device) — it never creates
 * a company, so the same company can be used from many devices.
 */
export const Route = createFileRoute("/_authenticated/device-activation")({
  head: () => ({
    meta: [
      { title: "Activate this device — SifoBooks" },
      { name: "description", content: "Choose your company and branch and authorise this device for SifoBooks." },
      { property: "og:title", content: "Activate this device — SifoBooks" },
      { property: "og:description", content: "Choose company and branch for this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeviceActivation,
});

function DeviceActivation() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<StartupReport | null>(null);
  const current = getActivation();

  useEffect(() => {
    void supabase.from("companies").select("id,name").order("created_at").then(({ data }) => {
      setCompanies(data ?? []);
      const pre = current?.companyId ?? data?.[0]?.id ?? "";
      setCompanyId(pre);
    });
    void runStartupChecks().then(setReport);
  }, []);

  useEffect(() => {
    if (!companyId) { setBranches([]); return; }
    void supabase.from("branches").select("id,name").eq("company_id", companyId).order("name").then(({ data }) => {
      setBranches(data ?? []);
      setBranchId(current?.companyId === companyId ? current?.branchId ?? "" : data?.[0]?.id ?? "");
    });
  }, [companyId]);

  async function activate() {
    setBusy(true);
    try {
      const c = companies.find((x) => x.id === companyId);
      const b = branches.find((x) => x.id === branchId);
      saveTerminalInfo({ company_id: companyId, company_name: c?.name, branch_id: branchId || null, branch_name: b?.name });
      await registerTerminal();
      const { data } = await supabase.from("print_devices").select("id").eq("device_id", getDeviceId()).maybeSingle();
      if (!data) throw new Error("Device not registered — check your connection and try again.");
      saveActivation({ deviceId: getDeviceId(), companyId, branchId: branchId || null, activatedAt: new Date().toISOString() });
      toast.success("Device activated");
      navigate({ to: "/launch" as never });
    } catch (e: any) {
      toast.error(e?.message ?? "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold">Activate this device</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Device ID <span className="font-mono">{getDeviceId().slice(0, 8)}…</span>. Choose the company and branch it belongs to.
      </p>

      {companies.length === 0 ? (
        <div className="mt-6 rounded-md border p-4 text-sm">
          No company found for your account.
          <Button className="mt-3 w-full" onClick={() => navigate({ to: "/onboarding" })}>Create company</Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm">Company
            <select aria-label="Company" className="h-9 rounded-md border bg-background px-2" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Branch
            <select aria-label="Branch" className="h-9 rounded-md border bg-background px-2" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Main / no branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <Button disabled={busy || !companyId} onClick={activate}>{busy ? "Activating…" : "Activate device"}</Button>
        </div>
      )}

      {report && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Startup checks · mode: {report.mode}</h2>
          <ul className="mt-2 divide-y rounded-md border text-sm">
            {report.checks.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="flex items-center gap-2">
                  {c.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : c.status === "fail" ? <XCircle className="h-4 w-4 text-destructive" /> : c.status === "warn" ? <AlertTriangle className="h-4 w-4 text-muted-foreground" /> : <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                  {c.label}
                </span>
                <span className="text-xs text-muted-foreground">{c.detail ?? c.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
