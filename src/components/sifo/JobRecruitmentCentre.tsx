import { useMemo, useState } from "react";
import { BriefcaseBusiness, Link2, Sparkles, Users, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Candidate = { name: string; role: string; experience: number; education: number; skills: number; completeness: number; score: number; reason: string };
const candidates: Candidate[] = [
  { name: "Candidate A", role: "Accounts Assistant", experience: 4, education: 5, skills: 5, completeness: 5, score: 92, reason: "Strong accounting experience, relevant skills and complete application." },
  { name: "Candidate B", role: "Accounts Assistant", experience: 5, education: 4, skills: 4, completeness: 5, score: 88, reason: "Excellent experience with a small gap in the requested software skills." },
  { name: "Candidate C", role: "Accounts Assistant", experience: 3, education: 5, skills: 4, completeness: 4, score: 78, reason: "Good education and relevant skills; less practical experience." },
];

export function JobRecruitmentCentre() {
  const [jobUrl, setJobUrl] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const filtered = useMemo(() => candidates.filter(c => `${c.name} ${c.role}`.toLowerCase().includes(candidateSearch.toLowerCase())), [candidateSearch]);

  return <div className="space-y-6">
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5" /> Publish a job opportunity</CardTitle></CardHeader><CardContent className="space-y-4">
        <div><label className="text-sm font-medium">Public application link</label><div className="mt-2 flex gap-2"><Input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="https://sifobooks.com/jobs/your-company-role" /><Button variant="outline"><Link2 className="h-4 w-4" /> Copy</Button></div></div>
        <div className="rounded-lg border p-4 text-sm"><div className="font-medium">Public → Private workflow</div><div className="mt-1 text-muted-foreground">Share a SifoBooks application link publicly. Applications enter the company's private recruitment workspace for screening, interview scheduling and audit-controlled decisions.</div></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Recruitment controls</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Company-scoped candidates</div><div className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-600" /> Role-based reviewer access</div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-600" /> Explainable scoring</div></CardContent></Card>
    </div>

    <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Candidate screening</CardTitle><Input className="max-w-xs" value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} placeholder="Search candidates" /></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Candidate</th><th className="p-3">Role</th><th className="p-3 text-right">Experience</th><th className="p-3 text-right">Education</th><th className="p-3 text-right">Skills</th><th className="p-3 text-right">Score</th><th className="p-3">Why</th></tr></thead><tbody>{filtered.map(c => <tr key={c.name} className="border-b"><td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.role}</td><td className="p-3 text-right">{c.experience}/5</td><td className="p-3 text-right">{c.education}/5</td><td className="p-3 text-right">{c.skills}/5</td><td className="p-3 text-right"><Badge variant="outline">{c.score}%</Badge></td><td className="p-3 max-w-sm text-muted-foreground">{c.reason}</td></tr>)}</tbody></table></CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Interview recommendation</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Recommended</div><div className="mt-1 font-semibold">Interview highest-scoring candidates</div><p className="mt-2 text-xs text-muted-foreground">Use the score as decision support, not an automatic hiring decision.</p></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Explainability</div><div className="mt-1 font-semibold">Show evidence for every score</div><p className="mt-2 text-xs text-muted-foreground">Skills, experience, education and application completeness should be visible to reviewers.</p></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Fairness</div><div className="mt-1 font-semibold">No protected-attribute scoring</div><p className="mt-2 text-xs text-muted-foreground">Do not score candidates on race, religion, health, gender, age or other protected characteristics.</p></div></CardContent></Card>
  </div>;
}
