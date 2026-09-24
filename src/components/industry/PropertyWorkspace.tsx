import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { RequireModule } from "@/components/RequireModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, Users, Wallet, Plus } from "lucide-react";
import { toast } from "sonner";

type Property={id:string;code:string;name:string;property_type:string;address:string|null;city:string|null};
type Unit={id:string;property_id:string;unit_code:string;unit_type:string;monthly_rent:number;daily_rate:number;status:string};
type Tenant={id:string;tenant_no:string;full_name:string;phone:string|null};
type Lease={id:string;lease_no:string;unit_id:string;tenant_id:string;lease_type:string;rent_amount:number;status:string};
type Charge={id:string;lease_id:string;description:string;amount:number;paid_amount:number;due_date:string;status:string};
type Payment={id:string;payment_no:string;tenant_id:string|null;amount:number;method:string;payment_date:string};

export function PropertyWorkspace(){
 const [tab,setTab]=useState("dashboard"); const [loading,setLoading]=useState(true);
 const [uid,setUid]=useState(""); const [companyId,setCompanyId]=useState("");
 const [properties,setProperties]=useState<Property[]>([]); const [units,setUnits]=useState<Unit[]>([]);
 const [tenants,setTenants]=useState<Tenant[]>([]); const [leases,setLeases]=useState<Lease[]>([]);
 const [charges,setCharges]=useState<Charge[]>([]); const [payments,setPayments]=useState<Payment[]>([]); const [maintenance,setMaintenance]=useState<any[]>([]); const [meters,setMeters]=useState<any[]>([]);
 const [form,setForm]=useState<any>({}); const [show,setShow]=useState<string|null>(null); const [billing,setBilling]=useState(false);
 const load=async()=>{
  setLoading(true); const {data:u}=await supabase.auth.getUser(); if(!u.user){setLoading(false);return} setUid(u.user.id);
  const {data:p}=await supabase.from("profiles").select("active_company_id").eq("id",u.user.id).maybeSingle(); const cid=p?.active_company_id; setCompanyId(cid||"");
  if(!cid){setLoading(false);return}
  const [a,b,c,d,e,f,g,h]=await Promise.all([
   supabase.from("property_assets").select("*").eq("company_id",cid).order("name"),
   supabase.from("property_units").select("*").eq("company_id",cid).order("unit_code"),
   supabase.from("property_tenants").select("*").eq("company_id",cid).order("full_name"),
   supabase.from("property_leases").select("*").eq("company_id",cid).order("created_at",{ascending:false}),
   supabase.from("property_charges").select("*").eq("company_id",cid).order("due_date"),
   supabase.from("property_payments").select("*").eq("company_id",cid).order("payment_date",{ascending:false}),
   supabase.from("property_maintenance").select("*").eq("company_id",cid).order("created_at",{ascending:false}),
   supabase.from("property_meter_readings").select("*").eq("company_id",cid).order("reading_date",{ascending:false}),
  ]);
  setProperties((a.data??[]) as any); setUnits((b.data??[]) as any); setTenants((c.data??[]) as any); setLeases((d.data??[]) as any); setCharges((e.data??[]) as any); setPayments((f.data??[]) as any); setMaintenance((g.data??[]) as any); setMeters((h.data??[]) as any); setLoading(false);
 };
 useEffect(()=>{void load()},[]);
 const occupied=units.filter(x=>x.status==="occupied").length;
 const outstanding=charges.reduce((s,x)=>s+Math.max(0,Number(x.amount)-Number(x.paid_amount)),0);
 const received=payments.reduce((s,x)=>s+Number(x.amount),0);
 const arrearsRows=charges.filter(x=>Math.max(0,Number(x.amount)-Number(x.paid_amount))>0).sort((a,b)=>new Date(a.due_date).getTime()-new Date(b.due_date).getTime());
 const currentPeriod=new Date().toISOString().slice(0,7);
 const generateMonthlyRent=async()=>{
  if(!companyId||!uid)return;
  setBilling(true);
  try{
   const active=leases.filter(x=>x.status==="active" && ["monthly","boarding"].includes(String(x.lease_type).toLowerCase()));
   let created=0;
   for(const l of active){
    const {error}=await supabase.from("property_charges").insert({
      company_id:companyId,user_id:uid,lease_id:l.id,charge_date:new Date().toISOString().slice(0,10),
      due_date:new Date().toISOString().slice(0,10),charge_type:"rent",
      description:"Rent - "+currentPeriod,amount:Number(l.rent_amount||0),paid_amount:0,status:"open",
      billing_period:currentPeriod,charge_source:"recurring"
    });
    if(!error)created++;
   }
   toast.success(created+" rental charge(s) generated for "+currentPeriod);
   await load();
  }catch(e:any){toast.error(e?.message??"Could not generate rent")}
  finally{setBilling(false)}
 };

 const save=async(kind:string)=>{
  try{
   if(kind==="property"){const {error}=await supabase.from("property_assets").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="unit"){const {error}=await supabase.from("property_units").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="tenant"){const {error}=await supabase.from("property_tenants").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="lease"){const {error}=await supabase.from("property_leases").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="charge"){const {error}=await supabase.from("property_charges").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="payment"){const {error}=await supabase.from("property_payments").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="maintenance"){const {error}=await supabase.from("property_maintenance").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="meter"){const {error}=await supabase.from("property_meter_readings").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   if(kind==="booking"){const {error}=await supabase.from("property_bookings").insert({...form,user_id:uid,company_id:companyId});if(error)throw error}
   toast.success("Saved"); setShow(null); setForm({}); await load();
  }catch(e:any){toast.error(e?.message??"Could not save")}
 };
 const propertyName=(id:string)=>properties.find(x=>x.id===id)?.name??"—";
 const unitName=(id:string)=>units.find(x=>x.id===id)?.unit_code??"—";
 const tenantName=(id:string|null)=>tenants.find(x=>x.id===id)?.full_name??"—";
 if(loading)return <div className="p-8 text-muted-foreground">Loading property management…</div>;
 return <RequireModule moduleKey="property_management"><div className="sifobooks-2026-industry space-y-5 rounded-[28px] bg-[#F5FAF8]/70 p-1">
  <div className="rounded-[26px] border border-[#D7E6E1] bg-gradient-to-br from-white via-[#F6FBF9] to-[#EEF7F3] p-6 shadow-[0_12px_34px_rgba(23,59,58,.07)]">
   <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-2xl font-bold">SifoProperty</div><div className="text-muted-foreground">Apartments · houses · complexes · boarding houses · monthly rentals · daily rentals · BnB</div></div><div className="flex flex-wrap gap-2">
 <Button variant="outline" disabled={billing} onClick={generateMonthlyRent}>{billing?"Generating…":"Generate monthly rent"}</Button>
 <Button onClick={()=>{setForm({});setShow("property")}}><Plus className="mr-2 h-4 w-4"/>Add property</Button>
</div></div>
  </div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
   <Metric icon={Building2} label="Properties" value={properties.length}/><Metric icon={Home} label="Units / rooms" value={units.length}/><Metric icon={Users} label="Tenants" value={tenants.length}/><Metric icon={Wallet} label="Outstanding" value={fmtMoney(outstanding)}/><Metric icon={Wallet} label="Collected" value={fmtMoney(received)}/>
  </div>
  <Tabs value={tab} onValueChange={setTab}><TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border p-1 lg:grid-cols-11"><TabsTrigger value="dashboard">Dashboard</TabsTrigger><TabsTrigger value="properties">Properties</TabsTrigger><TabsTrigger value="units">Units</TabsTrigger><TabsTrigger value="tenants">Tenants</TabsTrigger><TabsTrigger value="leases">Leases</TabsTrigger><TabsTrigger value="collections">Collections</TabsTrigger><TabsTrigger value="bnb">Daily / BnB</TabsTrigger><TabsTrigger value="maintenance">Maintenance</TabsTrigger><TabsTrigger value="utilities">Utilities</TabsTrigger><TabsTrigger value="arrears">Arrears</TabsTrigger><TabsTrigger value="statements">Statements</TabsTrigger></TabsList>
   <TabsContent value="dashboard"><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Occupancy</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{occupied}/{units.length}</div><p className="text-sm text-muted-foreground">occupied units / rooms</p></CardContent></Card><Card><CardHeader><CardTitle>Rent roll</CardTitle></CardHeader><CardContent>{leases.filter(x=>x.status==="active").slice(0,8).map(x=><div key={x.id} className="flex justify-between border-b py-2"><span>{tenantName(x.tenant_id)} · {unitName(x.unit_id)}</span><b>{fmtMoney(x.rent_amount)}</b></div>)}</CardContent></Card></div></TabsContent>
   <TabsContent value="properties"><List title="Properties" rows={properties.map(x=>[x.code,x.name,x.property_type,x.city??"—"])} action={()=>{setForm({});setShow("property")}}/></TabsContent>
   <TabsContent value="units"><List title="Units / rooms / beds" rows={units.map(x=>[propertyName(x.property_id),x.unit_code,x.unit_type,x.status,fmtMoney(x.monthly_rent),fmtMoney(x.daily_rate)])} action={()=>setShow("unit")}/></TabsContent>
   <TabsContent value="tenants"><List title="Tenants" rows={tenants.map(x=>[x.tenant_no,x.full_name,x.phone??"—"])} action={()=>setShow("tenant")}/></TabsContent>
   <TabsContent value="leases"><List title="Leases & occupancy" rows={leases.map(x=>[x.lease_no,tenantName(x.tenant_id),unitName(x.unit_id),x.lease_type,fmtMoney(x.rent_amount),x.status])} action={()=>setShow("lease")}/></TabsContent>
   <TabsContent value="collections"><div className="grid gap-4 lg:grid-cols-2"><List title="Charges / rent roll" rows={charges.map(x=>[x.description,x.due_date,fmtMoney(x.amount),fmtMoney(x.paid_amount),x.status])} action={()=>setShow("charge")}/><List title="Payments" rows={payments.map(x=>[x.payment_no,tenantName(x.tenant_id),x.payment_date,fmtMoney(x.amount),x.method])} action={()=>setShow("payment")}/></div></TabsContent>
   <TabsContent value="arrears"><Card><CardHeader><CardTitle>Rent arrears & ageing</CardTitle></CardHeader><CardContent><div className="space-y-2">{arrearsRows.map(x=><div key={x.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="font-medium">{tenantName(leases.find(l=>l.id===x.lease_id)?.tenant_id??null)}</div><div className="text-xs text-muted-foreground">{x.description} · due {x.due_date}</div></div><b className="text-amber-600">{fmtMoney(Math.max(0,Number(x.amount)-Number(x.paid_amount)))}</b></div>)}{!arrearsRows.length&&<div className="p-6 text-center text-muted-foreground">No rent arrears.</div>}</div></CardContent></Card></TabsContent>
   <TabsContent value="statements"><Card><CardHeader><CardTitle>Tenant statements</CardTitle></CardHeader><CardContent><div className="space-y-2">{tenants.map(t=>{const ls=leases.filter(l=>l.tenant_id===t.id);const billed=charges.filter(c=>ls.some(l=>l.id===c.lease_id)).reduce((n,c)=>n+Number(c.amount||0),0);const paid=payments.filter(p=>p.tenant_id===t.id).reduce((n,p)=>n+Number(p.amount||0),0);return <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="font-medium">{t.full_name}</div><div className="text-xs text-muted-foreground">{t.tenant_no} · {t.phone??"—"}</div></div><span>Billed {fmtMoney(billed)}</span><span>Paid {fmtMoney(paid)}</span><b>Balance {fmtMoney(Math.max(0,billed-paid))}</b></div>})}{!tenants.length&&<div className="p-6 text-center text-muted-foreground">No tenants yet.</div>}</div></CardContent></Card></TabsContent>
   <TabsContent value="maintenance"><List title="Maintenance & repairs" rows={maintenance.map(x=>[x.title,unitName(x.unit_id),x.priority,x.status,fmtMoney(x.actual_cost)])} action={()=>setShow("maintenance")}/></TabsContent><TabsContent value="utilities"><List title="Meter readings" rows={meters.map(x=>[unitName(x.unit_id),x.meter_type,x.reading_date,x.reading])} action={()=>setShow("meter")}/></TabsContent><TabsContent value="bnb"><Card><CardHeader><CardTitle>Daily & BnB operations</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground mb-4">Use unit type BnB and lease type daily/BnB for short stays. Daily rates, booking dates, guest details, deposits and checkout can be tracked here.</p><Button onClick={()=>setShow("booking")}>Create daily booking</Button></CardContent></Card></TabsContent>
  </Tabs>
  {show&&<Editor kind={show} form={form} setForm={setForm} properties={properties} units={units} tenants={tenants} onClose={()=>setShow(null)} onSave={save}/>}
 </div></RequireModule>
}
function Metric({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <Card><CardContent className="p-4"><Icon className="h-5 w-5 text-primary"/><div className="mt-2 text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></CardContent></Card>}
function List({title,rows,action}:{title:string;rows:any[][];action:()=>void}){return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{title}</CardTitle><Button size="sm" onClick={action}>+ Add</Button></CardHeader><CardContent><div className="overflow-auto"><table className="w-full text-sm"><tbody>{rows.slice(0,100).map((r,i)=><tr key={i} className="border-b">{r.map((v,j)=><td key={j} className="p-2">{v}</td>)}</tr>)}{!rows.length&&<tr><td className="p-6 text-muted-foreground">No records yet.</td></tr>}</tbody></table></div></CardContent></Card>}
function Editor({kind,form,setForm,properties,units,tenants,onClose,onSave}:any){
 const set=(k:string,v:any)=>setForm((x:any)=>({...x,[k]:v}));
 const common=(children:any)=><div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><Card className="max-h-[90vh] w-full max-w-2xl overflow-auto"><CardHeader><CardTitle>{kind==="property"?"Add property":kind==="unit"?"Add unit / room":kind==="tenant"?"Add tenant":kind==="lease"?"Create lease":kind==="charge"?"Create rent charge":"Record payment"}</CardTitle></CardHeader><CardContent className="space-y-3">{children}<div className="flex gap-2"><Button onClick={()=>onSave(kind)}>Save</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div></CardContent></Card></div>;
 if(kind==="property")return common(<><Field l="Code" v={form.code} set={v=>set("code",v)}/><Field l="Property name" v={form.name} set={v=>set("name",v)}/><Field l="Type" v={form.property_type??"apartment_block"} set={v=>set("property_type",v)}/><Field l="Address" v={form.address} set={v=>set("address",v)}/><Field l="City" v={form.city} set={v=>set("city",v)}/></>);
 if(kind==="unit")return common(<><SelectField l="Property" v={form.property_id} set={v=>set("property_id",v)} opts={properties.map((x:any)=>[x.id,x.name])}/><Field l="Unit / room code" v={form.unit_code} set={v=>set("unit_code",v)}/><Field l="Type: apartment, house, room, bed, BnB" v={form.unit_type??"apartment"} set={v=>set("unit_type",v)}/><Field l="Monthly rent" v={form.monthly_rent} set={v=>set("monthly_rent",Number(v)||0)}/><Field l="Daily rate" v={form.daily_rate} set={v=>set("daily_rate",Number(v)||0)}/></>);
 if(kind==="tenant")return common(<><Field l="Tenant number" v={form.tenant_no} set={v=>set("tenant_no",v)}/><Field l="Full name" v={form.full_name} set={v=>set("full_name",v)}/><Field l="Phone" v={form.phone} set={v=>set("phone",v)}/><Field l="Email (optional)" v={form.email} set={v=>set("email",v)}/><Field l="ID number" v={form.id_number} set={v=>set("id_number",v)}/></>);
 if(kind==="lease")return common(<><Field l="Lease number" v={form.lease_no} set={v=>set("lease_no",v)}/><SelectField l="Unit" v={form.unit_id} set={v=>set("unit_id",v)} opts={units.map((x:any)=>[x.id,x.unit_code])}/><SelectField l="Tenant" v={form.tenant_id} set={v=>set("tenant_id",v)} opts={tenants.map((x:any)=>[x.id,x.full_name])}/><Field l="Type: monthly/daily/BnB/boarding" v={form.lease_type??"monthly"} set={v=>set("lease_type",v)}/><Field l="Start date" v={form.start_date} set={v=>set("start_date",v)} type="date"/><Field l="Rent amount" v={form.rent_amount} set={v=>set("rent_amount",Number(v)||0)}/></>);
 if(kind==="charge")return common(<><Field l="Lease ID" v={form.lease_id} set={v=>set("lease_id",v)}/><Field l="Description" v={form.description} set={v=>set("description",v)}/><Field l="Amount" v={form.amount} set={v=>set("amount",Number(v)||0)}/><Field l="Due date" v={form.due_date} set={v=>set("due_date",v)} type="date"/></>);
 if(kind==="booking")return common(<><SelectField l="Unit / BnB room" v={form.unit_id} set={v=>set("unit_id",v)} opts={units.map((x:any)=>[x.id,x.unit_code])}/><Field l="Guest name" v={form.guest_name} set={v=>set("guest_name",v)}/><Field l="Phone" v={form.phone} set={v=>set("phone",v)}/><Field l="Check in" v={form.check_in} set={v=>set("check_in",v)} type="date"/><Field l="Check out" v={form.check_out} set={v=>set("check_out",v)} type="date"/><Field l="Nightly rate" v={form.nightly_rate} set={v=>set("nightly_rate",Number(v)||0)}/></>);
 if(kind==="maintenance")return common(<><Field l="Title" v={form.title} set={v=>set("title",v)}/><Field l="Unit ID (optional)" v={form.unit_id} set={v=>set("unit_id",v)}/><Field l="Priority" v={form.priority??"medium"} set={v=>set("priority",v)}/><Field l="Description" v={form.description} set={v=>set("description",v)}/><Field l="Estimated cost" v={form.estimated_cost} set={v=>set("estimated_cost",Number(v)||0)}/></>);
 if(kind==="meter")return common(<><SelectField l="Unit" v={form.unit_id} set={v=>set("unit_id",v)} opts={units.map((x:any)=>[x.id,x.unit_code])}/><Field l="Meter type" v={form.meter_type??"water"} set={v=>set("meter_type",v)}/><Field l="Reading date" v={form.reading_date} set={v=>set("reading_date",v)} type="date"/><Field l="Reading" v={form.reading} set={v=>set("reading",Number(v)||0)}/></>);
 return common(<><Field l="Payment number" v={form.payment_no} set={v=>set("payment_no",v)}/><Field l="Tenant ID (optional)" v={form.tenant_id} set={v=>set("tenant_id",v)}/><Field l="Amount" v={form.amount} set={v=>set("amount",Number(v)||0)}/><Field l="Method: cash/card/MoMo/bank" v={form.method??"cash"} set={v=>set("method",v)}/><Field l="Reference" v={form.reference} set={v=>set("reference",v)}/></>);
}
function Field({l,v,set,type="text"}:{l:string;v:any;set:(v:any)=>void;type?:string}){return <div className="space-y-1"><Label>{l}</Label><Input type={type} value={v??""} onChange={e=>set(e.target.value)}/></div>}
function SelectField({l,v,set,opts}:{l:string;v:any;set:(v:any)=>void;opts:any[][]}){return <div className="space-y-1"><Label>{l}</Label><select className="w-full rounded-md border bg-background p-2" value={v??""} onChange={e=>set(e.target.value)}><option value="">Select…</option>{opts.map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>}
