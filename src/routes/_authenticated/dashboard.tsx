import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, FileText, CheckCircle2, Clock, AlertCircle, TrendingUp, Trash2, ArrowLeft, LogOut, ShieldCheck, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppNav } from "@/components/AppNav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Invoice Dashboard — Kopelacode" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type Status = "paid" | "pending" | "overdue" | "draft";
type LineItem = { description: string; qty: number; price: number; hsCode?: string; stockItemId?: string | null };
type StockPick = { id: string; name: string; sku: string | null; hs_code: string | null; vat_rate: number; sell_price: number; unit: string; quantity_on_hand: number };
type ZraInfo = {
  invoiceType: "normal" | "credit" | "debit" | "training" | "export";
  vatRate: number; // percent
  sellerTpin: string;
  buyerTpin: string;
  submittedRef?: string; // ZRA reference after mock submission
  submittedAt?: string;
};
type Invoice = {
  id: string; number: string; client: string; email: string;
  issueDate: string; dueDate: string; status: Status; items: LineItem[];
  zra?: ZraInfo;
};

const sample: Invoice[] = [
  { id: "1", number: "INV-2026-0142", client: "Zamtel Networks", email: "ap@zamtel.co.zm", issueDate: "2026-06-18", dueDate: "2026-07-18", status: "paid", items: [{ description: "Fiscal integration — Q2", qty: 1, price: 4800 }] },
  { id: "2", number: "INV-2026-0141", client: "Airtel Africa", email: "billing@airtel.africa", issueDate: "2026-06-22", dueDate: "2026-07-22", status: "pending", items: [{ description: "EdgeCore licenses", qty: 25, price: 120 }] },
  { id: "3", number: "INV-2026-0140", client: "Dharti Logistics", email: "finance@dharti.co.ke", issueDate: "2026-05-30", dueDate: "2026-06-30", status: "overdue", items: [{ description: "Compliance audit", qty: 1, price: 2400 }, { description: "Advisory hours", qty: 8, price: 150 }] },
  { id: "4", number: "INV-2026-0139", client: "Adbims Ltd", email: "hello@adbims.ng", issueDate: "2026-06-28", dueDate: "2026-07-28", status: "pending", items: [{ description: "Monthly platform fee", qty: 1, price: 899 }] },
  { id: "5", number: "INV-2026-0138", client: "SANDVIK SA", email: "za-ap@sandvik.com", issueDate: "2026-06-15", dueDate: "2026-07-15", status: "paid", items: [{ description: "Enterprise onboarding", qty: 1, price: 12000 }] },
  { id: "6", number: "INV-2026-0137", client: "Coca-Cola Beverages", email: "vendors@ccba.co.za", issueDate: "2026-07-01", dueDate: "2026-08-01", status: "draft", items: [{ description: "Custom reporting module", qty: 1, price: 6500 }] },
];

const totalOf = (inv: Invoice) => inv.items.reduce((s, i) => s + i.qty * i.price, 0);
const totalWithVat = (inv: Invoice) => {
  const sub = totalOf(inv);
  const rate = inv.zra?.vatRate ?? 0;
  return sub * (1 + rate / 100);
};

const statusStyles: Record<Status, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
};

function DashboardPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>(sample);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [businessName, setBusinessName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("onboarded, currency, business_name").eq("id", u.user.id).maybeSingle();
      if (!data?.onboarded) { navigate({ to: "/onboarding" }); return; }
      if (data.currency) setCurrency(data.currency);
      if (data.business_name) setBusinessName(data.business_name);
    })();
  }, [navigate]);

  const money = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + totalOf(i), 0);
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + totalOf(i), 0);
    const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + totalOf(i), 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + totalOf(i), 0);
    return { total, paid, pending, overdue, count: invoices.length };
  }, [invoices]);

  const filtered = invoices.filter(i => {
    const matchesQ = !q || i.client.toLowerCase().includes(q.toLowerCase()) || i.number.toLowerCase().includes(q.toLowerCase());
    const matchesF = filter === "all" || i.status === filter;
    return matchesQ && matchesF;
  });

  const addInvoice = (inv: Invoice) => setInvoices(prev => [inv, ...prev]);
  const removeInvoice = (id: string) => setInvoices(prev => prev.filter(i => i.id !== id));
  const submitToZra = (id: string) => {
    setInvoices(prev => prev.map(i => {
      if (i.id !== id || !i.zra) return i;
      const ref = `ZRA${Date.now().toString().slice(-10)}`;
      toast.success(`Submitted to ZRA Smart Invoice — Ref ${ref}`);
      return { ...i, zra: { ...i.zra, submittedRef: ref, submittedAt: new Date().toISOString() } };
    }));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                {businessName || "Invoice Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <NewInvoiceDialog open={open} setOpen={setOpen} onCreate={addInvoice} nextNumber={`INV-2026-${String(143 + (invoices.length - sample.length)).padStart(4, "0")}`} money={money} />
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Total billed" value={money(stats.total)} sub={`${stats.count} invoices`} tint="bg-primary/10 text-primary" />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Paid" value={money(stats.paid)} sub="Collected" tint="bg-emerald-100 text-emerald-700" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={money(stats.pending)} sub="Awaiting payment" tint="bg-amber-100 text-amber-700" />
          <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Overdue" value={money(stats.overdue)} sub="Needs follow-up" tint="bg-red-100 text-red-700" />
        </div>

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Invoices</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search client or number…" className="pl-8 sm:w-64" />
              </div>
              <Select value={filter} onValueChange={v => setFilter(v as Status | "all")}>
                <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ZRA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-6 font-medium">{inv.number}</TableCell>
                    <TableCell>
                      <div>{inv.client}</div>
                      <div className="text-xs text-muted-foreground">{inv.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
                    <TableCell><Badge variant="outline" className={statusStyles[inv.status]}>{inv.status}</Badge></TableCell>
                    <TableCell>
                      {inv.zra?.submittedRef ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700" title={`Submitted ${inv.zra.submittedAt}`}>
                          <QrCode className="h-3 w-3" /> {inv.zra.submittedRef}
                        </Badge>
                      ) : inv.zra ? (
                        <Button size="sm" variant="outline" onClick={() => submitToZra(inv.id)}>
                          <ShieldCheck className="h-3 w-3" /> Submit to ZRA
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{money(totalWithVat(inv))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeInvoice(inv.id)} aria-label="Delete invoice">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No invoices match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub, tint }: { icon: React.ReactNode; label: string; value: string; sub: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${tint}`}>{icon}</span>
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function NewInvoiceDialog({ open, setOpen, onCreate, nextNumber, money }: { open: boolean; setOpen: (v: boolean) => void; onCreate: (i: Invoice) => void; nextNumber: string; money: (n: number) => string }) {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(in30);
  const [status, setStatus] = useState<Status>("draft");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, price: 0, hsCode: "" }]);
  // ZRA Smart Invoice
  const [zraEnabled, setZraEnabled] = useState(true);
  const [invoiceType, setInvoiceType] = useState<ZraInfo["invoiceType"]>("normal");
  const [vatRate, setVatRate] = useState<number>(16);
  const [sellerTpin, setSellerTpin] = useState("");
  const [buyerTpin, setBuyerTpin] = useState("");

  const reset = () => {
    setClient(""); setEmail(""); setIssueDate(today); setDueDate(in30); setStatus("draft");
    setItems([{ description: "", qty: 1, price: 0, hsCode: "" }]);
    setZraEnabled(true); setInvoiceType("normal"); setVatRate(16); setSellerTpin(""); setBuyerTpin("");
  };

  const subTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const vatAmount = zraEnabled ? subTotal * (vatRate / 100) : 0;
  const total = subTotal + vatAmount;

  const submit = () => {
    if (!client.trim()) return;
    onCreate({
      id: crypto.randomUUID(), number: nextNumber, client, email, issueDate, dueDate, status,
      items: items.filter(i => i.description.trim()),
      zra: zraEnabled ? { invoiceType, vatRate, sellerTpin, buyerTpin } : undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New invoice</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create invoice <span className="ml-2 text-sm font-normal text-muted-foreground">{nextNumber}</span></DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Client name</Label><Input value={client} onChange={e => setClient(e.target.value)} placeholder="Acme Corp" /></div>
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
          </div>

          {/* ZRA Smart Invoice section */}
          <div className="rounded-lg border bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <div>
                  <div className="text-sm font-semibold">ZRA Smart Invoice</div>
                  <div className="text-xs text-muted-foreground">Zambia Revenue Authority compliance fields</div>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={zraEnabled} onChange={e => setZraEnabled(e.target.checked)} className="h-4 w-4" />
                Enable
              </label>
            </div>
            {zraEnabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label>VAT rate (%)</Label>
                  <Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} />
                </div>
                <div className="space-y-2"><Label>Seller TPIN</Label><Input value={sellerTpin} onChange={e => setSellerTpin(e.target.value)} placeholder="10 digits" maxLength={10} /></div>
                <div className="space-y-2"><Label>Buyer TPIN</Label><Input value={buyerTpin} onChange={e => setBuyerTpin(e.target.value)} placeholder="Optional" maxLength={10} /></div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items{zraEnabled && " (with HS codes)"}</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems(prev => [...prev, { description: "", qty: 1, price: 0, hsCode: "" }])}>
                <Plus className="h-3 w-3" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-5" placeholder="Description" value={item.description} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} />
                  {zraEnabled && (
                    <Input className="col-span-2" placeholder="HS code" value={item.hsCode ?? ""} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, hsCode: e.target.value } : it))} />
                  )}
                  <Input className={zraEnabled ? "col-span-1" : "col-span-2"} type="number" min={1} value={item.qty} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Number(e.target.value) } : it))} />
                  <Input className={zraEnabled ? "col-span-3" : "col-span-5"} type="number" min={0} step="0.01" value={item.price} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, price: Number(e.target.value) } : it))} />
                  <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-end gap-4"><span className="text-muted-foreground">Subtotal</span><span>{money(subTotal)}</span></div>
              {zraEnabled && <div className="flex justify-end gap-4"><span className="text-muted-foreground">VAT ({vatRate}%)</span><span>{money(vatAmount)}</span></div>}
              <div className="flex justify-end gap-4 text-base"><span className="text-muted-foreground">Total</span><span className="font-semibold">{money(total)}</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!client.trim()}>Create invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
