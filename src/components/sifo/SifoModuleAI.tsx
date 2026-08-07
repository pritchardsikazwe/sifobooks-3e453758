import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { moduleTheme, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const MODULE_PROMPTS: Record<ModuleKey, string[]> = {
  accounting: ["Is my trial balance in balance?", "Which accounts moved the most this month?", "Suggest a journal for this accrual"],
  sales: ["Who are my slowest paying customers?", "How much is overdue right now?", "What is my average invoice value?"],
  purchases: ["Which suppliers do I owe the most?", "Any duplicate bills this month?", "What are my top expense categories?"],
  inventory: ["Which items should I reorder?", "What is my stock valuation?", "Which items are slow moving?"],
  banking: ["What is my cash position?", "Which transactions are still unallocated?", "Summarise this month's bank movement"],
  payroll: ["What is this month's PAYE liability?", "Summarise NAPSA and NHIMA totals", "Which employees have pending leave?"],
  tax: ["What VAT do I owe this period?", "When is my next ZRA filing due?", "Explain turnover tax for my business"],
  reports: ["Summarise my profit and loss", "How is my cash flow trending?", "What should I show my accountant?"],
};

/**
 * Module-scoped AI helper. Same assistant brain as the global panel, but the
 * prompts and the colour identity follow the module you are working in.
 */
export function SifoModuleAI({ module, className }: { module: ModuleKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const theme = moduleTheme(module);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("h-9 gap-1.5 font-semibold", theme.text, className)}
        title={`Ask AI about ${theme.label}`}
      >
        <Bot className="h-4 w-4" />
        <span className="hidden sm:inline">Ask AI</span>
      </Button>
      <ModulePanel module={module} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ModulePanel({ module, open, onClose }: { module: ModuleKey; open: boolean; onClose: () => void }) {
  const theme = moduleTheme(module);
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
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "system",
              content:
                `You are Sifo AI helping inside the ${theme.label} module of a Zambian ERP. ` +
                `Answer concisely, use ZMW, reference Zambian rules (ZRA, NAPSA, NHIMA) when relevant.`,
            },
            ...next.map(m => ({ role: m.role, content: m.content })),
          ],
        },
      });
      if (error) throw error;
      const reply = (data as any)?.content || (data as any)?.reply || "I couldn't generate a response.";
      setMessages([...next, { role: "assistant", content: String(reply) }]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `I can't reach the AI service right now. Meanwhile, the ${theme.label} reports under Reports Centre cover most of this.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[400px]"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className={cn("flex items-center justify-between border-b border-border p-4", theme.soft)}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", theme.chip)}>
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{theme.label} assistant</div>
                  <div className="truncate text-[11px] text-muted-foreground">Answers scoped to this module</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" aria-label="Close assistant">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  {MODULE_PROMPTS[module].map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className={cn(
                        "w-full rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted/50",
                        theme.hoverBorder,
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 border-t border-border bg-muted/30 p-3"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask about ${theme.label.toLowerCase()}…`}
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" size="icon" className="h-10 w-10" disabled={busy || !input.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
