import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/posting-failures")({
  head: () => ({ meta: [{ title: "Posting Failure Queue — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PostingFailures,
});

type Failure = { id:string; source_module:string; source_type:string|null; source_reference:string|null; operation:string; error_code:string|null; error_message:string; status:string; attempts:number; last_attempt_at:string|null; created_at:string };

function PostingFailures() {
  const [rows,setRows]=useState<Failure[]>([]); const [loading,setLoading]=useState(true); const [q,setQ]=useState("");
  async function load(){ setLoading(true); const {data,error}=await supabase.rpc("posting_failure_queue" as any); if(error) toast.error(error.message); setRows((data??[]) as Failure[]); setLoading(false); }
  useEffect(()=>{void load()},[]);
  const filtered=rows.filter(r=>[r.source_module,r.source_type,r.source_reference,r.error_code,r.error_message].join(" ").toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-6 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><AlertTriangle className="h-6 w-6 text-amber-600"/> Posting Failure Queue</h1><p className="mt-1 text-sm text-muted-foreground">Failed accounting postings that require investigation before they can enter the ledger.</p></div><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?"animate-spin":""}`}/> Refresh</Button></header>
    <div className="flex items-center gap-2 max-w-xl"><Search className="h-4 w-4 text-muted-foreground"/><Input placeholder="Search source, reference or error…" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <Card><CardHeader><CardTitle className="text-base">Open failures <Badge variant="secondary" className="ml-2">{filtered.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{filtered.length===0?<p className="py-8 text-center text-sm text-muted-foreground">{loading?"Loading…":"No open posting failures."}</p>:filtered.map(r=><div key={r.id} className="rounded-xl border p-4 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">{r.source_reference||r.source_type||r.source_module}</div><div className="flex gap-2"><Badge variant="outline">{r.source_module}</Badge><Badge variant="secondary">{r.status}</Badge></div></div><p className="text-sm text-destructive">{r.error_message}</p><div className="text-xs text-muted-foreground">Operation: {r.operation} · Attempts: {r.attempts} · Created: {new Date(r.created_at).toLocaleString()}{r.error_code?` · Code: ${r.error_code}`:""}</div></div>)}</CardContent></Card>
  </div>;
}
