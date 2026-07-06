import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Send, FileText, Receipt as ReceiptIcon, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = useParams({ from: "/_authenticated/customers/$id" });
  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [channel, setChannel] = useState("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const [{ data: c }, { data: invs }, { data: rcs }, { data: cm }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("invoices").select("*").eq("customer_id", id).order("issue_date", { ascending: false }),
      supabase.from("receipts").select("*").eq("customer_id", id).order("receipt_date", { ascending: false }),
      supabase.from("customer_communications").select("*").eq("customer_id", id).order("occurred_at", { ascending: false }),
    ]);
    setCustomer(c); setInvoices(invs ?? []); setReceipts(rcs ?? []); setComms(cm ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const totals = invoices.reduce((a, i) => {
    a.total += Number(i.total || 0); a.paid += Number(i.amount_paid || 0); a.balance += Number(i.balance_due || 0);
    const today = new Date().toISOString().slice(0, 10);
    if (i.balance_due > 0 && i.due_date && i.due_date < today) a.overdue += Number(i.balance_due || 0);
    return a;
  }, { total: 0, paid: 0, balance: 0, overdue: 0 });

  const logComm = async () => {
    if (!body.trim()) { toast.error("Message body required"); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("customer_communications").insert({
      user_id: u.user.id, customer_id: id, channel, subject: subject || null, body,
    });
    if (error) return toast.error(error.message);
    toast.success("Logged");
    setSubject(""); setBody("");
    load();
  };

  if (!customer) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to customers</Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
            {customer.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>}
            {customer.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</span>}
            {customer.tpin && <span>TPIN {customer.tpin}</span>}
            <span>Terms: {customer.payment_terms_days}d</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Invoiced</div><div className="text-xl font-semibold">{fmtMoney(totals.total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Received</div><div className="text-xl font-semibold text-emerald-600">{fmtMoney(totals.paid)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Balance due</div><div className="text-xl font-semibold">{fmtMoney(totals.balance)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Overdue</div><div className="text-xl font-semibold text-red-600">{fmtMoney(totals.overdue)}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Invoices</CardTitle><Button asChild size="sm" variant="outline"><Link to="/invoices/new" search={{ customer: id } as any}>New</Link></Button></CardHeader>
          <CardContent>{invoices.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No invoices yet.</div> :
            <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{invoices.map(i => (<TableRow key={i.id}><TableCell className="font-mono text-xs">{i.number}</TableCell><TableCell className="text-xs">{i.issue_date}</TableCell><TableCell className="text-right">{fmtMoney(i.total)}</TableCell><TableCell className="text-right">{fmtMoney(i.balance_due)}</TableCell><TableCell><StatusBadge s={i.status} /></TableCell></TableRow>))}</TableBody>
            </Table>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ReceiptIcon className="h-4 w-4" /> Receipts</CardTitle></CardHeader>
          <CardContent>{receipts.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No payments received yet.</div> :
            <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{receipts.map(r => (<TableRow key={r.id}><TableCell className="font-mono text-xs">{r.number}</TableCell><TableCell className="text-xs">{r.receipt_date}</TableCell><TableCell className="text-xs capitalize">{r.method.replace("_", " ")}</TableCell><TableCell className="text-right">{fmtMoney(r.amount)}</TableCell></TableRow>))}</TableBody>
            </Table>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Communication history</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
            <Button onClick={logComm}><Send className="h-4 w-4 mr-1" /> Log</Button>
            <textarea className="sm:col-span-3 w-full min-h-20 rounded-md border bg-background p-2 text-sm" placeholder="What happened, what was discussed…" value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div className="space-y-2">
            {comms.length === 0 ? <div className="text-sm text-muted-foreground py-4 text-center">No history yet — log the first interaction above.</div> :
              comms.map(c => (
                <div key={c.id} className="border rounded-md p-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Badge variant="outline" className="capitalize">{c.channel}</Badge>
                    <span>{new Date(c.occurred_at).toLocaleString()}</span>
                    {c.subject && <span className="font-medium text-foreground">· {c.subject}</span>}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700", partial: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700", sent: "bg-blue-100 text-blue-700",
    draft: "bg-slate-100 text-slate-700", cancelled: "bg-slate-100 text-slate-500",
  };
  return <span className={`px-2 py-0.5 rounded text-xs capitalize ${map[s] ?? "bg-slate-100"}`}>{s}</span>;
}
