import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Delete, ArrowLeft, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cashierPinLogin } from "@/lib/cashier-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROSTER_KEY = "sifobooks.terminal.roster";

type RosterEntry = { email: string; name: string };

function readRoster(): RosterEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "[]") as RosterEntry[];
  } catch {
    return [];
  }
}

function rememberCashier(entry: RosterEntry) {
  const list = readRoster().filter((r) => r.email !== entry.email);
  localStorage.setItem(ROSTER_KEY, JSON.stringify([entry, ...list].slice(0, 8)));
}

/**
 * Quick terminal sign-in. The PIN is checked on the server (hashed, rate
 * limited, audited) — this screen never compares it locally.
 */
export function CashierPinLogin({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const login = useServerFn(cashierPinLogin);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setRoster(readRoster()), []);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError("Choose or type the cashier's email");
    if (pin.length < 4) return setError("Enter your PIN");
    setBusy(true);
    try {
      const res = await login({ data: { email: email.trim().toLowerCase(), pin } });
      if (!res.ok) {
        setPin("");
        setBusy(false);
        return setError(res.error);
      }
      const { error: otpErr } = await supabase.auth.verifyOtp({ type: "email", token_hash: res.token_hash });
      if (otpErr) {
        setBusy(false);
        setPin("");
        return setError("Could not start your session. Ask your manager.");
      }
      rememberCashier({ email: email.trim().toLowerCase(), name: res.full_name || email });
      // Let the central resolver decide the workspace (company + product +
      // role + assigned till) — a PIN sign-in is not a product choice.
      navigate({ to: "/launch" });
    } catch (e) {
      setBusy(false);
      setPin("");
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
  };

  const key = (k: string) => {
    if (k === "C") return setPin("");
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    if (k === "OK") return void submit();
    setPin((p) => (p + k).slice(0, 8));
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {roster.length > 0 && (
        <div className="space-y-2">
          <Label>Select cashier</Label>
          <div className="grid grid-cols-2 gap-2">
            {roster.map((r) => (
              <button
                key={r.email}
                onClick={() => { setEmail(r.email); setPin(""); setError(null); }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                  email === r.email ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <UserRound className="h-4 w-4 shrink-0" />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cashier-email">Cashier email</Label>
        <Input
          id="cashier-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cashier@business.co.zm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cashier-pin">PIN</Label>
        <Input
          id="cashier-pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          className="text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => key(k)}
            className="rounded-xl border bg-muted/50 py-4 text-lg font-semibold active:bg-primary active:text-primary-foreground"
          >
            {k === "⌫" ? <Delete className="mx-auto h-5 w-5" /> : k}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full" size="lg" disabled={busy} onClick={() => void submit()}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Open my till
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Forgot your PIN? Ask your manager to reset it — it can never be read back.
      </p>
    </div>
  );
}
