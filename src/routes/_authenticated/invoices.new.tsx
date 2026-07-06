import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, ReceiptText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({ meta: [{ title: "New invoice — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: NewInvoicePage,
});

type Line = { description: string; qty: number; price: number; vatRate: number; hsCode?: string; stockItemId?: string | null };

function NewInvoicePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  const [customers, setCustomers] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [currency, setCurrency] = useState("ZMW");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(in30);
  const [status, setStatus] = useState("sent");
  const [items, setItems] = useState<Line[]>([{ description: "", qty: 1, price: 0, vatRate: 16 }]);
  const [notes, setNotes] = useState("");
  const [zraOn, setZraOn] = useState(true);
  const [sellerTpin, setSellerTpin] = useState("");
  const [buyerTpin, setBuyerTpin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: si }, { data: co }] = await Promise.all([
        supabase.from("customers").select("id, name, tpin, payment_terms_days").eq("active", true).order("name"),
        supabase.from("stock_items").select("id, name, sku, hs_code, vat_rate, sell_price"),
        supabase.from("companies").select("base_currency, tpin").maybeSingle(),
      ]);
      setCustomers(cs ?? []); setStock(si ?? []);
      if (co?.base_currency) setCurrency(co.base_currency);
      if ((co as any)?.tpin) setSellerTpin((co as any).tpin);
    })();
  }, []);

  useEffect(() => {
    const c = customers.find(x => x.id === customerId);
    if (c) {
      if (c.tpin) setBuyerTpin(c.tpin);
      if (c.payment_terms_days) setDueDate(new Date(Date.now() + c.payment_terms_days * 864e5).toISOString().slice(0, 10));
    }
  }, [customerId, customers]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);
  const vat = useMemo(() => zraOn ? items.reduce((s, i) => s + i.qty * i.price * (i.vatRate / 100), 0) : 0, [items, zraOn]);
  const total = subtotal + vat;

  const pickStock = (idx: number, stockId: string) => {
    const s = stock.find(x => x.id === stockId);
    if (!s) return;
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, stockItemId: s.id, description: s.name, price: Number(s.sell_price), vatRate: Number(s.vat_rate), hsCode: s.hs_code ?? undefined } : it));
  };

  const submit = async () => {
    if (!customerId) return toast.error("Select a customer");
    const valid = items.filter(i => i.description.trim() && i.qty > 0);
    if (valid.length === 0) return toast.error("Add at least one line item");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const number = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const { data: inv, error } = await supabase.from("invoices").insert({
      user_id: u.user.id, customer_id: customerId, number,
      issue_date: issueDate, due_date: dueDate, status, currency,
      subtotal, vat_amount: vat, total, notes,
      seller_tpin: zraOn ? sellerTpin || null : null, buyer_tpin: zraOn ? buyerTpin || null : null,
    }).select().single();
    if (error || !inv) { setSaving(false); return toast.error(error?.message ?? "Failed"); }
    const { error: ie } = await supabase.from("invoice_items").insert(valid.map(i => ({
      user_id: u.user.id, invoice_id: inv.id, stock_item_id: i.stockItemId ?? null,
      description: i.description, hs_code: i.hsCode ?? null,
      quantity: i.qty, unit_price: i.price, vat_rate: zraOn ? i.vatRate : 0,
      line_total: i.qty * i.price * (1 + (zraOn ? i.vatRate : 0) / 100),
    })));
    // deduct stock
    for (const i of valid) {
      if (i.stockItemId) {
        await supabase.from("stock_movements").insert({
          user_id: u.user.id, item_id: i.stockItemId, movement_type: "out",
          quantity: i.qty, reference: number, note: `Invoice ${number}`,
        });
      }
    }
    setSaving(false);
    if (ie) return toast.error(ie.message);
    toast.success(`Invoice ${number} saved`);
    navigate({ to: "/invoices" });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <Link to="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div><h1 className="text-2xl font-semibold flex items-center gap-2"><ReceiptText className="h-6 w-6 text-emerald-600" /> New invoice</h1></div>

      <Card><CardHeader><CardTitle className="text-base">Customer & dates</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Issue date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Currency</Label><Input value={currency} onChange={e => setCurrency(e.target.value)} /></div>
          <div className="space-y-2"><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["draft", "sent"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> ZRA / VAT</CardTitle>
          <div className="flex items-center gap-2 text-sm"><Switch checked={zraOn} onCheckedChange={setZraOn} /> {zraOn ? "Enabled" : "Disabled"}</div>
        </CardHeader>
        {zraOn && <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Seller TPIN</Label><Input value={sellerTpin} onChange={e => setSellerTpin(e.target.value)} placeholder="1000000000" /></div>
          <div className="space-y-2"><Label>Buyer TPIN</Label><Input value={buyerTpin} onChange={e => setBuyerTpin(e.target.value)} placeholder="1000000000" /></div>
        </CardContent>}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Line items</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setItems(p => [...p, { description: "", qty: 1, price: 0, vatRate: 16 }])}><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 sm:col-span-5 space-y-1">
                <Select value={it.stockItemId ?? ""} onValueChange={v => pickStock(idx, v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick from stock (optional)" /></SelectTrigger>
                  <SelectContent>{stock.map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.sku ? `(${s.sku})` : ""}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Description" value={it.description} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
              </div>
              <Input className="col-span-3 sm:col-span-2" type="number" step="0.001" placeholder="Qty" value={it.qty} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))} />
              <Input className="col-span-4 sm:col-span-2" type="number" step="0.01" placeholder="Price" value={it.price} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) } : x))} />
              <Input className="col-span-3 sm:col-span-2" type="number" step="0.1" placeholder="VAT %" value={it.vatRate} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, vatRate: Number(e.target.value) } : x))} disabled={!zraOn} />
              <Button variant="ghost" size="icon" className="col-span-2 sm:col-span-1" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <div className="border-t pt-3 space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>{fmtMoney(vat, currency)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Total</span><span>{fmtMoney(total, currency)}</span></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><textarea className="w-full min-h-20 rounded-md border bg-background p-2 text-sm" value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/invoices" })}>Cancel</Button>
        <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Saving…" : "Save invoice"}</Button>
      </div>
    </div>
  );
}
