import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Info, Plus, ScrollText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { fmtMoney } from "@/lib/format";
import { BUILT_IN_RULES, loadStatutoryRules, rulesSummary, type StatutoryRules } from "@/lib/payroll-rules";

export const Route = createFileRoute("/_authenticated/payroll-rules")({
  head: () => ({
    meta: [
      { title: "Statutory Rates — SifoBooks" },
      { name: "description", content: "Keep PAYE bands, NAPSA, NHIMA, WCF and SDL rates versioned by effective date so payroll uses the rules that applied in each period." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollRules,
});

const db = supabase as any;

type Version = {
  id: string; effective_from: string; paye_bands: unknown; napsa_rate: number; napsa_employer_rate: number;
  napsa_cap: number; nhima_rate: number; nhima_employer_rate: number; wcf_rate: number; sdl_rate: number;
  source_note: string | null; verified_by: string | null; verified_on: string | null; is_active: boolean;
};

const pct = (v: number) => `${(Number(v) * 100).toFixed(2).replace(/\.00$/, "")}%`;

function PayrollRules() {
  const [userId, setUserId] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [inForce, setInForce] = useState<StatutoryRules | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    effective_from: new Date().toISOString().slice(0, 10),
    bands: BUILT_IN_RULES.payeBands.map((b) => `${b.upTo ?? ""}:${b.rate}`).join(", "),
    napsa_rate: String(BUILT_IN_RULES.napsaRate),
    napsa_employer_rate: String(BUILT_IN_RULES.napsaEmployerRate),
    napsa_cap: String(BUILT_IN_RULES.napsaCap),
    nhima_rate: String(BUILT_IN_RULES.nhimaRate),
    nhima_employer_rate: String(BUILT_IN_RULES.nhimaEmployerRate),
    wcf_rate: String(BUILT_IN_RULES.wcfRate),
    sdl_rate: String(BUILT_IN_RULES.sdlRate),
    source_note: "",
    verified_by: "",
  });

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const { data } = await db.from("payroll_statutory_rules").select("*")
      .eq("user_id", u.user.id).order("effective_from", { ascending: false });
    setVersions((data ?? []) as Version[]);
    setInForce(await loadStatutoryRules(u.user.id, new Date().toISOString().slice(0, 10)));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!userId) return;
    const bands = form.bands.split(",").map((part) => {
      const [upTo, rate] = part.split(":").map((s) => s.trim());
      return { upTo: upTo ? Number(upTo) : null, rate: Number(rate) };
    });
    if (bands.some((b) => !Number.isFinite(b.rate) || b.rate < 0 || b.rate > 1)) {
      return toast.error("Each PAYE band needs a rate between 0 and 1, e.g. 5100:0, 7100:0.2");
    }
    if (bands.filter((b) => b.upTo === null).length !== 1 || bands[bands.length - 1]!.upTo !== null) {
      return toast.error("The last band must be open ended — leave its ceiling blank, e.g. :0.37");
    }
    setBusy(true);
    const { error } = await db.from("payroll_statutory_rules").insert({
      user_id: userId,
      effective_from: form.effective_from,
      paye_bands: bands,
      napsa_rate: Number(form.napsa_rate),
      napsa_employer_rate: Number(form.napsa_employer_rate),
      napsa_cap: Number(form.napsa_cap),
      nhima_rate: Number(form.nhima_rate),
      nhima_employer_rate: Number(form.nhima_employer_rate),
      wcf_rate: Number(form.wcf_rate),
      sdl_rate: Number(form.sdl_rate),
      source_note: form.source_note.trim() || null,
      verified_by: form.verified_by.trim() || null,
      verified_on: form.verified_by.trim() ? new Date().toISOString().slice(0, 10) : null,
      is_active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    await db.from("audit_logs").insert({
      user_id: userId, action: "payroll.statutory_rules.created", entity_type: "payroll_statutory_rules",
      details: { effective_from: form.effective_from, napsa_cap: form.napsa_cap },
    });
    setOpen(false);
    toast.success("Rates saved. Payroll periods from that date use this version.");
    void load();
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-5xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ScrollText className="h-6 w-6 text-emerald-600" /> Statutory rates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            PAYE bands, NAPSA, NHIMA, WCF and SDL held by the date they take effect, so an old period keeps the rates that applied then.
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}><Plus className="mr-1 h-4 w-4" /> New version</Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> In force today</CardTitle>
          <CardDescription>{inForce ? rulesSummary(inForce) : "Loading…"}</CardDescription>
        </CardHeader>
        {inForce && (
          <CardContent className="grid gap-3 text-sm md:grid-cols-4">
            <Fact label="NAPSA employee" value={pct(inForce.napsaRate)} />
            <Fact label="NAPSA employer" value={pct(inForce.napsaEmployerRate)} />
            <Fact label="NAPSA monthly cap" value={fmtMoney(inForce.napsaCap)} />
            <Fact label="NHIMA" value={`${pct(inForce.nhimaRate)} + ${pct(inForce.nhimaEmployerRate)}`} />
            <Fact label="WCF" value={pct(inForce.wcfRate)} />
            <Fact label="SDL" value={pct(inForce.sdlRate)} />
            <Fact label="PAYE bands" value={inForce.payeBands.map((b) => `${b.upTo ?? "over"} @ ${pct(b.rate)}`).join(" · ")} wide />
            {inForce.origin === "built-in" && (
              <p className="md:col-span-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                These are unverified starting figures shipped with SifoBooks. Confirm the current ZRA, NAPSA and NHIMA rates and save your own version so payroll is defensible.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {open && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New rate version</CardTitle>
            <CardDescription>Rates are decimals (0.05 = 5%). PAYE bands are written as ceiling:rate pairs, last one open ended — e.g. 5100:0, 7100:0.2, 9200:0.3, :0.37</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Field label="Effective from"><Input type="date" value={form.effective_from} onChange={set("effective_from")} /></Field>
            <Field label="PAYE bands" wide><Input value={form.bands} onChange={set("bands")} /></Field>
            <Field label="NAPSA employee"><Input value={form.napsa_rate} onChange={set("napsa_rate")} /></Field>
            <Field label="NAPSA employer"><Input value={form.napsa_employer_rate} onChange={set("napsa_employer_rate")} /></Field>
            <Field label="NAPSA monthly cap (per side)"><Input value={form.napsa_cap} onChange={set("napsa_cap")} /></Field>
            <Field label="NHIMA employee"><Input value={form.nhima_rate} onChange={set("nhima_rate")} /></Field>
            <Field label="NHIMA employer"><Input value={form.nhima_employer_rate} onChange={set("nhima_employer_rate")} /></Field>
            <Field label="WCF"><Input value={form.wcf_rate} onChange={set("wcf_rate")} /></Field>
            <Field label="SDL"><Input value={form.sdl_rate} onChange={set("sdl_rate")} /></Field>
            <Field label="Confirmed by"><Input value={form.verified_by} onChange={set("verified_by")} placeholder="Who checked the official rates" /></Field>
            <Field label="Source" wide>
              <Textarea rows={2} value={form.source_note} onChange={set("source_note")} placeholder="Where these figures came from, e.g. the official circular and its date" />
            </Field>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={busy} onClick={() => void save()}>Save version</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-base">Versions</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective from</TableHead>
                <TableHead>NAPSA</TableHead>
                <TableHead>Cap</TableHead>
                <TableHead>NHIMA</TableHead>
                <TableHead>WCF / SDL</TableHead>
                <TableHead>Confirmed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.effective_from}</TableCell>
                  <TableCell>{pct(v.napsa_rate)} + {pct(v.napsa_employer_rate)}</TableCell>
                  <TableCell className="tabular-nums">{fmtMoney(Number(v.napsa_cap))}</TableCell>
                  <TableCell>{pct(v.nhima_rate)} + {pct(v.nhima_employer_rate)}</TableCell>
                  <TableCell>{pct(v.wcf_rate)} / {pct(v.sdl_rate)}</TableCell>
                  <TableCell>
                    {v.verified_by
                      ? <Badge variant="secondary">{v.verified_by}{v.verified_on ? ` · ${v.verified_on}` : ""}</Badge>
                      : <Badge variant="outline">not confirmed</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {versions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No saved version yet — payroll is using the unverified built-in figures.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border bg-background p-3 ${wide ? "md:col-span-4" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
