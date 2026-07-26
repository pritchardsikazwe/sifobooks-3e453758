import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, TrendingUp, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { icon: TrendingUp, text: "How did revenue trend this month?" },
  { icon: Wallet, text: "What's my current cash position?" },
  { icon: AlertCircle, text: "Any unusual expense patterns?" },
];

export function SifoAssistantButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Sifo AI</span>
      </Button>
      <SifoPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SifoPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      // Gather quick accounting context
      const [{ data: tx }, { data: inv }, { data: bills }] = await Promise.all([
        supabase.from("bank_transactions").select("txn_date, amount, description, category").order("txn_date", { ascending: false }).limit(200),
        supabase.from("invoices").select("total, balance_due, status"),
        supabase.from("bills").select("total, balance_due, status"),
      ]);
      const context = {
        recent_transactions: tx?.slice(0, 50) ?? [],
        receivables: (inv ?? []).reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0),
        payables: (bills ?? []).reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0),
        cash_position: (tx ?? []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      };
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            { role: "system", content: "You are Sifo AI, an accounting assistant for a Zambian ERP. Answer concisely using the JSON context provided. Use ZMW. Be practical and highlight anomalies." },
            ...next.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: `Context JSON:\n${JSON.stringify(context)}` },
          ],
        },
      });
      if (error) throw error;
      const reply = (data as any)?.content || (data as any)?.reply || "I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: String(reply) }]);
    } catch (e: any) {
      // Graceful local fallback so the panel is useful even without an AI edge function
      const cash = messages.length; // dummy to avoid unused
      void cash;
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "I couldn't reach the AI service right now. Based on your ledger you can quickly check: cash position via Banking, unpaid invoices via Reports → Aged Receivables, and expense trends via the Dashboard chart.",
        },
      ]);
      toast.error(e.message || "AI unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 h-screen w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shadow-md">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Sifo AI</div>
                  <div className="text-[11px] text-slate-500">Accounting insights on demand</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Ask about revenue, cash flow, receivables, or anomalies.</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="w-full flex items-center gap-2 text-left text-sm p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition"
                    >
                      <s.icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-slate-700">{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}
                >
                  {m.content}
                </motion.div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sifo is thinking…
                </div>
              )}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Sifo AI…"
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
              <Button type="submit" disabled={busy || !input.trim()} className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
