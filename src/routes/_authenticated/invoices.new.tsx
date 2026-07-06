import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { PENDING_INVOICE_KEY, type Invoice, type LineItem, type Status, type StockPick, type ZraInfo } from "@/lib/invoice-types";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({ meta: [{ title: "New invoice — Kopelacode" }, { name: "robots", content: "noindex" }] }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const nextNumber = `INV-2026-${String(200 + Math.floor(Math.random() * 800)).padStart(4, "0")}`;

  const [currency, setCurrency] = useState("USD");
  const [stock, setStock] = useState<StockPick[]>([]);
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(in30);
  const [status, setStatus] = useState<Status>("draft");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, price: 0, hsCode: "" }]);
  const [zraEnabled, setZraEnabled] = useState(true);
  const [invoiceType, setInvoiceType] = useState<ZraInfo["invoiceType"]>("normal");
  const [vatRate, setVatRate] = useState<number>(16);
  const [sellerTpin, setSellerTpin] = useState("");
  const [buyerTpin, setBuyerTpin] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("currency, tpin").eq("id", u.user.id).maybeSingle();
      if (prof?.currency) setCurrency(prof.currency);
      if ((prof as any)?.tpin) setSellerTpin((prof as any).tpin);
      const { data } = await supabase.from("stock_items").select("id, name, sku, hs_code, vat_rate, sell_price, unit, quantity_on_hand");
      setStock((data ?? []) as StockPick[]);
    })();
  }, []);

  const money = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const subTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const vatAmount = zraEnabled ? subTotal * (vatRate / 100) : 0;
  const total = subTotal + vatAmount;

  const submit = () => {
    if (!client.trim()) { toast.error("Client name is required"); return; }
    const inv: Invoice = {
      id: crypto.randomUUID(), number: nextNumber, client, email, issueDate, dueDate, status,
      items: items.filter(i => i.description.trim()),
      zra: zraEnabled ? { invoiceType, vatRate, sellerTpin, buyerTpin } : undefined,
    };
    try { sessionStorage.setItem(PENDING_INVOICE_KEY, JSON.stringify(inv)); } catch { /* noop */ }
    toast.success(`Invoice ${nextNumber} created`);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <AppNav />
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to invoices
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">Draft · {nextNumber}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Create invoice</h1>
          <p className="text-sm text-muted-foreground mt-1">Fill in client, line items, and ZRA Smart Invoice details, then save.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Client & dates</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Client name *</Label><Input value={client} onChange={e => setClient(e.target.value)} placeholder="Acme Corp" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="billing@acme.com" /></div>
            <div className="space-y-2"><Label>Issue date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" /> ZRA Smart Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="inline-flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={zraEnabled} onChange={e => setZraEnabled(e.target.checked)} className="h-4 w-4" />
              Enable ZRA compliance fields
            </label>
            {zraEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Invoice type</Label>
                  <Select value={invoiceType} onValueChange={v => setInvoiceType(v as ZraInfo["invoiceType"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal sale</SelectItem>
                      <SelectItem value="credit">Credit note</SelectItem>
                      <SelectItem value="debit">Debit note</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="export">Export (zero-rated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>VAT rate (%)</Label><Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Seller TPIN</Label><Input value={sellerTpin} onChange={e => setSellerTpin(e.target.value)} placeholder="10 digits" maxLength={10} /></div>
                <div className="space-y-2"><Label>Buyer TPIN</Label><Input value={buyerTpin} onChange={e => setBuyerTpin(e.target.value)} placeholder="Optional" maxLength={10} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { description: "", qty: 1, price: 0, hsCode: "" }])}>
              <Plus className="h-3 w-3" /> Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => {
              const pickStock = (id: string) => {
                const s = stock.find(x => x.id === id);
                setItems(prev => prev.map((it, i) => i === idx ? {
                  ...it, stockItemId: id, description: s?.name ?? it.description,
                  hsCode: s?.hs_code ?? it.hsCode, price: Number(s?.sell_price ?? it.price),
                } : it));
              };
              return (
                <div key={idx} className="space-y-2 rounded-md border p-3">
                  {stock.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <Select value={item.stockItemId ?? ""} onValueChange={pickStock}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick from stock (optional)" /></SelectTrigger>
                        <SelectContent>
                          {stock.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}{s.sku ? ` · ${s.sku}` : ""} — {money(Number(s.sell_price))} · {Number(s.quantity_on_hand)} {s.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-12 gap-2">
                    <Input className="col-span-12 sm:col-span-5" placeholder="Description" value={item.description} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} />
                    {zraEnabled && (
                      <Input className="col-span-4 sm:col-span-2" placeholder="HS code" value={item.hsCode ?? ""} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, hsCode: e.target.value } : it))} />
                    )}
                    <Input className={zraEnabled ? "col-span-3 sm:col-span-1" : "col-span-4 sm:col-span-2"} type="number" min={1} value={item.qty} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) } : it))} />
                    <Input className={zraEnabled ? "col-span-4 sm:col-span-3" : "col-span-7 sm:col-span-4"} type="number" min={0} step="0.01" value={item.price} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, price: Number(e.target.value) } : it))} />
                    <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-end gap-4"><span className="text-muted-foreground">Subtotal</span><span>{money(subTotal)}</span></div>
              {zraEnabled && <div className="flex justify-end gap-4"><span className="text-muted-foreground">VAT ({vatRate}%)</span><span>{money(vatAmount)}</span></div>}
              <div className="flex justify-end gap-4 text-base"><span className="text-muted-foreground">Total</span><span className="font-semibold">{money(total)}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
          <Button onClick={submit} disabled={!client.trim()}>Save invoice</Button>
        </div>
      </main>
    </div>
  );
}
