import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { postSpendMoney } from "@/lib/bank-posting";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

type Alloc = { accountId: string; amount: number; side: "DR" | "CR"; description?: string };

const METHODS = ["Manual", "EFT", "Cheque", "Cash", "Mobile Money", "Card"];

export function SpendMoneyDialog({
  open,
  onOpenChange,
  defaultBankAccountId,
  onRecorded,
  mode = "spend",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBankAccountId?: string;
  onRecorded?: () => void;
  mode?: "spend" | "receive";
}) {
  const isSpend = mode === "spend";
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankBalances, setBankBalances] = useState<Record<string, number>>({});
  const [coas, setCoas] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bankAccountId, setBankAccountId] = useState(defaultBankAccountId ?? "");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Manual");
  const [reference, setReference] = useState(`PMT-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState(isSpend ? "Payment" : "Receipt");
  const [allocations, setAllocations] = useState<Alloc[]>([
    { accountId: "", amount: 0, side: isSpend ? "DR" : "CR", description: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: ba }, { data: rb }, { data: acc }, { data: sup }] = await Promise.all([
        supabase.from("bank_accounts" as any).select("*").eq("is_active", true).order("name"),
        supabase.from("bank_running_balance" as any).select("*"),
        supabase.from("chart_of_accounts").select("id, account_code, account_name, account_type")
          .eq("is_active", true).neq("account_code", "1000").order("account_code"),
        supabase.from("suppliers").select("id, name").order("name").limit(200),
      ]);
      setBankAccounts((ba ?? []) as any);
      const bmap: Record<string, number> = {};
      (rb ?? []).forEach((r: any) => { bmap[r.bank_account_id] = Number(r.balance ?? 0); });
      setBankBalances(bmap);
      setCoas((acc ?? []) as any);
      setSuppliers((sup ?? []) as any);
      if (!bankAccountId && ba && ba.length) setBankAccountId((ba as any)[0].id);
    })();
    // eslint-disable-next-line
  }, [open]);

  const totalAlloc = useMemo(
    () => allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0),
    [allocations],
  );
  const amt = Number(amount) || 0;
  const remaining = amt - totalAlloc;

  const addLine = () =>
    setAllocations([...allocations, { accountId: "", amount: Math.max(0, remaining), side: isSpend ? "DR" : "CR", description: "" }]);
  const removeLine = (i: number) => setAllocations(allocations.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<Alloc>) =>
    setAllocations(allocations.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const aiEntry = () => {
    if (!coas.length || !amt) return;
    const wantType = isSpend ? "expense" : "revenue";
    const pick = coas.find(a => a.account_type === wantType) ?? coas[0];
    setAllocations([{ accountId: pick.id, amount: amt, side: isSpend ? "DR" : "CR", description: memo }]);
    toast.success("Suggested entry filled");
  };

  async function record() {
    if (!bankAccountId) return toast.error("Pick a bank account");
    if (!amt) return toast.error("Enter an amount");
    if (Math.abs(remaining) > 0.01) return toast.error(`Allocations must equal ${amt.toFixed(2)}`);
    if (allocations.some(a => !a.accountId)) return toast.error("Pick an account for every allocation line");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const res = await postSpendMoney({
      userId: u.user.id,
      bankAccountId,
      txnDate,
      amount: isSpend ? amt : -amt,
      supplierName: supplierName || undefined,
      paymentMethod,
      reference,
      memo,
      allocations: allocations.map(a => ({ ...a, amount: Number(a.amount) })),
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success(isSpend ? "Payment recorded" : "Receipt recorded");
    onOpenChange(false);
    onRecorded?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{isSpend ? "Spend Money" : "Receive Money"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {isSpend
              ? "Enter a payment or purchase transaction and allocate the amount to one or more accounts."
              : "Record a customer payment or other inflow and allocate to one or more accounts."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-slate-300">Account {isSpend ? "Paid From" : "Received Into"}</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className="border-white/10 bg-slate-800/60"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({fmtMoney(bankBalances[b.id] ?? 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Transaction Date</Label>
              <Input type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} className="border-white/10 bg-slate-800/60" />
            </div>
            <div>
              <Label className="text-slate-300">Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="border-white/10 bg-slate-800/60 text-lg font-semibold" />
            </div>
            <div>
              <Label className="text-slate-300">{isSpend ? "Supplier" : "Customer"} <span className="text-xs text-slate-500">(optional)</span></Label>
              <Input list="party-list" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Optional" className="border-white/10 bg-slate-800/60" />
              <datalist id="party-list">{suppliers.map(s => <option key={s.id} value={s.name} />)}</datalist>
            </div>
            <div>
              <Label className="text-slate-300">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-white/10 bg-slate-800/60"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Reference Number</Label>
              <Input value={reference} onChange={e => setReference(e.target.value)} className="border-white/10 bg-slate-800/60 font-mono text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Journal Memo</Label>
            <Textarea rows={2} value={memo} onChange={e => setMemo(e.target.value)} className="border-white/10 bg-slate-800/60" />
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-200">Account Allocation</span>
              <span className={`text-xs ${Math.abs(remaining) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>
                Remaining: {fmtMoney(remaining)}
              </span>
            </div>
            <div className="space-y-2">
              {allocations.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_80px_auto] gap-2">
                  <Select value={a.accountId} onValueChange={v => updateLine(i, { accountId: v })}>
                    <SelectTrigger className="border-white/10 bg-slate-900/60"><SelectValue placeholder="Choose account" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {coas.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.account_code} — {c.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.01" value={a.amount || ""} onChange={e => updateLine(i, { amount: Number(e.target.value) })} placeholder="0.00" className="border-white/10 bg-slate-900/60 text-right" />
                  <Select value={a.side} onValueChange={(v: any) => updateLine(i, { side: v })}>
                    <SelectTrigger className="border-white/10 bg-slate-900/60"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="DR">DR</SelectItem><SelectItem value="CR">CR</SelectItem></SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={allocations.length === 1}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={addLine} className="text-slate-300 hover:text-white">
                <Plus className="mr-1 h-3 w-3" /> Add line
              </Button>
              <Button variant="ghost" size="sm" onClick={aiEntry} className="text-slate-300 hover:text-white">
                <Sparkles className="mr-1 h-3 w-3" /> AI Entry
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-300">Cancel</Button>
          <Button onClick={record} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
