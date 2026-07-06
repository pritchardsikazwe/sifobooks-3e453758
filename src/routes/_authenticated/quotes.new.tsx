import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import type { LineItem, Quote } from "@/lib/invoice-types";
import { PENDING_QUOTE_KEY } from "@/lib/invoice-types";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  head: () => ({ meta: [{ title: "New quotation — Kopelacode" }, { name: "robots", content: "noindex" }] }),
  component: NewQuotePage,
});

function NewQuotePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const nextNumber = `QT-2026-${String(100 + Math.floor(Math.random() * 900)).padStart(4, "0")}`;

  const [currency, setCurrency] = useState("USD");
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [validUntil, setValidUntil] = useState(in14);
  const [status, setStatus] = useState<Quote["status"]>("draft");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, price: 0 }]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("currency").limit(1).maybeSingle().then(({ data }) => {
      if (data?.currency) setCurrency(data.currency);
    });
  }, []);

  const money = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const submit = () => {
    if (!client.trim()) { toast.error("Client name is required"); return; }
    const q: Quote = {
      id: crypto.randomUUID(), number: nextNumber, client, email, issueDate, validUntil, status,
      items: items.filter(i => i.description.trim()), notes,
    };
    try { sessionStorage.setItem(PENDING_QUOTE_KEY, JSON.stringify(q)); } catch { /* noop */ }
    toast.success(`Quotation ${nextNumber} created`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <AppNav />
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">Draft · {nextNumber}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <FileText className="h-6 w-6 text-primary" /> Create quotation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Send a proposal to a client with pricing valid for a set period.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Client & validity</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Client name *</Label><Input value={client} onChange={e => setClient(e.target.value)} placeholder="Acme Corp" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@acme.com" /></div>
            <div className="space-y-2"><Label>Issue date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Valid until</Label><Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as Quote["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { description: "", qty: 1, price: 0 }])}>
              <Plus className="h-3 w-3" /> Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <Input className="col-span-12 sm:col-span-6" placeholder="Description" value={item.description} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} />
                <Input className="col-span-4 sm:col-span-2" type="number" min={1} value={item.qty} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) } : it))} />
                <Input className="col-span-7 sm:col-span-3" type="number" min={0} step="0.01" value={item.price} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, price: Number(e.target.value) } : it))} />
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="space-y-2">
              <Label>Notes / terms</Label>
              <textarea className="w-full min-h-24 rounded-md border bg-background p-2 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, delivery timeline, assumptions…" />
            </div>
            <div className="flex justify-end gap-4 text-base border-t pt-3">
              <span className="text-muted-foreground">Total</span><span className="font-semibold">{money(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
          <Button onClick={submit} disabled={!client.trim()}>Save quotation</Button>
        </div>
      </main>
    </div>
  );
}
