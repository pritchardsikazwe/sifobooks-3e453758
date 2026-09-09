import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BriefcaseBusiness, CheckCircle2, FileText, LockKeyhole, Mail, MapPin, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/public-jobs")({
  head: () => ({ meta: [{ title: "Job Application — SifoBooks" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PublicJobsPage,
});

function PublicJobsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState("");

  if (submitted) {
    return (
      <main className="min-h-screen bg-muted/20 px-4 py-10">
        <div className="mx-auto max-w-xl">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></div>
              <h1 className="mt-5 text-2xl font-semibold">Application ready</h1>
              <p className="mt-2 text-sm text-muted-foreground">Your application has passed the public-form validation step. The secure submission endpoint will hand it to the company recruitment workspace when the public recruitment data service is enabled.</p>
              <Badge className="mt-5" variant="outline">Reference: APPLICATION-PREVIEW</Badge>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><BriefcaseBusiness className="h-4 w-4" /> SifoBooks Careers</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Senior Accounts Assistant</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Join a growing finance team and support bookkeeping, reconciliations, VAT schedules and monthly reporting.</p>
              <div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" /> Lusaka, Zambia</Badge><Badge variant="secondary">Full time</Badge><Badge variant="secondary">Finance</Badge></div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Secure application</div><div className="mt-1">Only recruitment information is requested.</div></div>
          </div>
        </header>

        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader><CardTitle>Application details</CardTitle><CardDescription>Complete the required information. Avoid including sensitive personal information that is not relevant to the role.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="firstName">First name *</Label><Input id="firstName" required autoComplete="given-name" /></div>
                <div className="space-y-2"><Label htmlFor="lastName">Last name *</Label><Input id="lastName" required autoComplete="family-name" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="email">Email *</Label><Input id="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-2"><Label htmlFor="phone">Phone *</Label><Input id="phone" type="tel" required autoComplete="tel" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="education">Highest education *</Label><Input id="education" required placeholder="e.g. Diploma in Accounting" /></div>
                <div className="space-y-2"><Label htmlFor="experience">Relevant experience *</Label><Input id="experience" required placeholder="e.g. 3 years" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="skills">Key skills *</Label><Textarea id="skills" required placeholder="Accounting packages, Excel, reconciliations, payroll, VAT..." /></div>
              <div className="space-y-2"><Label htmlFor="cover">Why are you a good fit?</Label><Textarea id="cover" placeholder="Briefly explain your relevant experience and motivation." /></div>
              <div className="space-y-2"><Label htmlFor="cv">CV / supporting document</Label><label htmlFor="cv" className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm transition hover:border-primary hover:bg-primary/5"><Upload className="h-5 w-5 text-muted-foreground" /><span className="flex-1">{fileName || "Choose a PDF, DOC or DOCX"}</span><Input id="cv" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} /></label></div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Recruiters should evaluate job-relevant information only. Protected characteristics must not be used in automated screening or scoring.</span></div>
              <Button type="submit" className="w-full sm:w-auto">Submit application</Button>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">What happens next?</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-muted-foreground"><div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span><span>Application enters the company's private recruitment workspace.</span></div><div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span><span>Recruiters review job-relevant experience, education and skills.</span></div><div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span><span>Eligible candidates can be shortlisted and invited to interview.</span></div></CardContent></Card>
            <Card><CardContent className="p-4 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><FileText className="h-4 w-4" /> Public form boundary</div><p className="mt-2">This page is deliberately separate from the authenticated company workspace. It does not expose customers, employees, payroll, accounting, inventory or other private records.</p></CardContent></Card>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" /> SifoBooks recruitment portal</div>
          </aside>
        </form>
      </div>
    </main>
  );
}
