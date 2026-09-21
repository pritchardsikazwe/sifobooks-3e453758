import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, FolderOpen, CalendarDays, ShieldCheck, Plus, Save, Printer, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const contractTypes=[["permanent","Permanent"],["contract","Fixed Term"],["casual","Casual"],["intern","Intern"]];
const docTypes=["nrc","contract","qualification","bank_details","napsa","nhima","medical","training","disciplinary","policy","termination","other"];

export const Route=createFileRoute("/_authenticated/employees/$employeeId")({
 head:()=>({meta:[{title:"Employee 360 — SifoBooks"},{name:"robots",content:"noindex"}]}),
 component:Employee360Page,
});

function Employee360Page(){
 const {employeeId}=Route.useParams();
 const [employee,setEmployee]=useState<any>(null),[contracts,setContracts]=useState<any[]>([]),[docs,setDocs]=useState<any[]>([]),[leaves,setLeaves]=useState<any[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [contract,setContract]=useState({contract_number:"",contract_type:"permanent",start_date:new Date().toISOString().slice(0,10),end_date:"",document_text:""});
 const [doc,setDoc]=useState({document_type:"nrc",document_name:"",document_url:"",issue_date:"",expiry_date:""});
 const load=async()=>{
  setLoading(true);
  const [{data:e,error},{data:c},{data:d},{data:l}]=await Promise.all([
   supabase.from("employees").select("*").eq("id",employeeId).maybeSingle(),
   supabase.from("hr_employee_contracts").select("*").eq("employee_id",employeeId).order("start_date",{ascending:false}),
   supabase.from("hr_documents").select("*").eq("employee_id",employeeId).order("expiry_date",{ascending:true}),
   supabase.from("leave_requests").select("*").eq("employee_id",employeeId).order("start_date",{ascending:false}).limit(20)
  ]);
  if(error){toast.error(error.message);setLoading(false);return}
  setEmployee(e);setContracts(c??[]);setDocs(d??[]);setLeaves(l??[]);setLoading(false);
 };
 useEffect(()=>{load()},[employeeId]);
 const activeContract=contracts.find(c=>c.status==="active")??contracts[0];
 const expiring=docs.filter(d=>d.expiry_date && new Date(d.expiry_date).getTime()-Date.now()<60*86400000 && new Date(d.expiry_date).getTime()>=Date.now());
 const merge=(s:string)=>s.replace(/{{\\s*([A-Za-z0-9_.-]+)\\s*}}/g,(_:string,k:string)=>String(({employee_name:`${employee?.first_name??""} ${employee?.last_name??""}`,employee_code:employee?.employee_code,position:employee?.job_description,contract_start:contract.start_date,contract_end:contract.end_date,basic_salary:employee?.basic_salary} as any)[k]??""));
 const createContract=async()=>{
  if(!contract.contract_number||!contract.start_date)return toast.error("Contract number and start date are required");
  setSaving(true);
  const body=contract.document_text||`EMPLOYMENT CONTRACT\\n\\nEmployee: {{employee_name}}\\nEmployee No: {{employee_code}}\\nPosition: {{position}}\\nStart date: {{contract_start}}\\nEnd date: {{contract_end}}\\nBasic salary: {{basic_salary}}\\n\\nThe employer and employee agree to the terms in this contract and the applicable laws of Zambia. The final document must contain the statutory particulars applicable to the engagement.`;
  const {error}=await supabase.from("hr_employee_contracts").insert({employee_id:employeeId,contract_number:contract.contract_number,contract_type:contract.contract_type,start_date:contract.start_date,end_date:contract.end_date,status:"draft",document_text:merge(body)});
  setSaving(false); if(error)toast.error(error.message);else{toast.success("Contract created");setContract({...contract,contract_number:"",document_text:""});load()}
 };
 const addDoc=async()=>{
  if(!doc.document_name)return toast.error("Document name is required");
  const {error}=await supabase.from("hr_documents").insert({...doc,employee_id:employeeId,status:"active"});
  if(error)toast.error(error.message);else{toast.success("Employee document recorded");setDoc({...doc,document_name:"",document_url:""});load()}
 };
 const printContract=(c:any)=>{
  const w=window.open("","_blank"); if(!w)return;
  w.document.write(`<html><head><title>${c.contract_number}</title><style>body{font-family:Arial;max-width:800px;margin:40px auto;line-height:1.6}h1{text-align:center}pre{white-space:pre-wrap;font-family:Arial}</style></head><body><h1>Employment Contract</h1><p><b>Contract:</b> ${c.contract_number}</p><pre>${String(c.document_text??"").replace(/</g,"&lt;")}</pre><hr/><p>Employer signature: ____________________</p><p>Employee signature: ____________________</p></body></html>`);
  w.document.close();w.print();
 };
 if(loading)return <div className="p-6 text-sm text-muted-foreground">Loading employee 360…</div>;
 if(!employee)return <div className="p-6">Employee not found.</div>;
 return <div className="min-h-full bg-slate-50/70 p-4 sm:p-6"><div className="mx-auto max-w-[1440px] space-y-5">
  <div className="flex items-center gap-3"><Link to="/employees" className="rounded-xl border bg-white p-2"><ArrowLeft className="h-4 w-4"/></Link><div><div className="text-xs text-slate-500">People / Employee 360</div><h1 className="text-2xl font-semibold text-slate-900">{employee.first_name} {employee.last_name}</h1><p className="text-xs text-slate-500">{employee.employee_code??"No employee code"} · {employee.employment_type??"—"} · {employee.status??"—"}</p></div></div>
  <div className="grid gap-4 md:grid-cols-4">{[[`Contract`,activeContract?"Active":"Missing"],[`Documents`,String(docs.length)],[`Leave requests`,String(leaves.length)],[`Attention`,String(expiring.length)]].map(([a,b])=><Card key={a}><CardContent className="p-5"><div className="text-xs text-slate-500">{a}</div><div className="mt-2 text-2xl font-semibold">{b}</div></CardContent></Card>)}</div>
  <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
   <Card><CardHeader><CardTitle>Employee record</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">{[["Employee No",employee.employee_code],["NRC",employee.national_id],["TPIN",employee.tpin],["NAPSA",employee.napsa_number],["NHIMA",employee.nhima_number],["Phone",employee.phone],["Email",employee.email],["Salary",employee.basic_salary],["Hire date",employee.hire_date]].map(([a,b])=><div className="flex justify-between gap-4 border-b py-2" key={a}><span className="text-slate-500">{a}</span><span className="font-medium text-right">{b??"—"}</span></div>)}</CardContent></Card>
   <div className="space-y-5">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4"/> Contract management</CardTitle></CardHeader><CardContent className="space-y-4">
     <div className="grid gap-3 md:grid-cols-2"><Input placeholder="Contract number" value={contract.contract_number} onChange={e=>setContract({...contract,contract_number:e.target.value})}/><Select value={contract.contract_type} onValueChange={v=>setContract({...contract,contract_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{contractTypes.map(([v,l])=><SelectItem value={v} key={v}>{l}</SelectItem>)}</SelectContent></Select><Input type="date" value={contract.start_date} onChange={e=>setContract({...contract,start_date:e.target.value})}/><Input type="date" value={contract.end_date} onChange={e=>setContract({...contract,end_date:e.target.value})}/></div>
     <Textarea rows={7} placeholder="Optional contract body. Use {{employee_name}}, {{employee_code}}, {{position}}, {{contract_start}}, {{contract_end}}, {{basic_salary}}" value={contract.document_text} onChange={e=>setContract({...contract,document_text:e.target.value})}/><Button onClick={createContract} disabled={saving}><Save className="mr-2 h-4 w-4"/>Create contract</Button>
     <div className="space-y-2">{contracts.map(c=><div key={c.id} className="flex items-center justify-between rounded-xl border p-3"><div><div className="text-sm font-medium">{c.contract_number}</div><div className="text-xs text-slate-500">{c.contract_type} · {c.start_date}{c.end_date?` → ${c.end_date}`:""} · {c.status}</div></div><Button variant="outline" size="sm" onClick={()=>printContract(c)}><Printer className="mr-1 h-3.5 w-3.5"/>Print</Button></div>)}</div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FolderOpen className="h-4 w-4"/> Employee document vault</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Select value={doc.document_type} onValueChange={v=>setDoc({...doc,document_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{docTypes.map(v=><SelectItem value={v} key={v}>{v.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select><Input placeholder="Document name" value={doc.document_name} onChange={e=>setDoc({...doc,document_name:e.target.value})}/><Input placeholder="Document URL / storage reference" value={doc.document_url} onChange={e=>setDoc({...doc,document_url:e.target.value})}/><Input type="date" value={doc.expiry_date} onChange={e=>setDoc({...doc,expiry_date:e.target.value})}/></div><Button onClick={addDoc}><Plus className="mr-2 h-4 w-4"/>Add document</Button><div className="space-y-2">{docs.map(d=><div key={d.id} className="flex items-center justify-between rounded-xl border p-3"><div><div className="text-sm font-medium">{d.document_name}</div><div className="text-xs text-slate-500">{d.document_type} · expires {d.expiry_date??"—"}</div></div>{d.expiry_date&&new Date(d.expiry_date)<new Date()?<Badge variant="destructive">Expired</Badge>:expiring.some(x=>x.id===d.id)?<Badge variant="secondary">Expiring</Badge>:<Badge>Current</Badge>}</div>)}</div></CardContent></Card>
   </div>
  </div>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Leave history</CardTitle></CardHeader><CardContent>{leaves.length===0?<div className="text-sm text-slate-500">No leave requests.</div>:<div className="space-y-2">{leaves.map(l=><div key={l.id} className="flex justify-between rounded-xl border p-3 text-sm"><span>{l.leave_type} · {l.start_date} → {l.end_date}</span><Badge variant="outline">{l.status}</Badge></div>)}</div>}</CardContent></Card>
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><div className="flex gap-2"><AlertTriangle className="h-4 w-4"/><span>Legal and HR documents should be reviewed against the current applicable Zambian law and company policy before signing or filing.</span></div></div>
 </div></div>
}