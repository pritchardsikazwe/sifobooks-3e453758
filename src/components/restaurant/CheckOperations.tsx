import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Merge, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { mergeChecks, splitCheck, transferCheck } from "@/lib/restaurant-checks";

type Line = { id: string; item_name: string; qty: number; price: number; seat_no?: number | null };
type Order = { id: string; order_no: string | null; table_id: string | null; server_name: string | null; status: string };
type TableRow = { id: string; name: string; area: string | null; status: string };

/**
 * Split, merge and transfer an open check. Existing checks and existing tables
 * are always chosen from the tenant's real records — nothing is created here
 * except the second half of a split, which the user asks for explicitly.
 */
export function CheckOperations({
  order,
  lines,
  openChecks,
  onDone,
}: {
  order: Order;
  lines: Line[];
  openChecks: Order[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [guests, setGuests] = useState("1");
  const [mergeInto, setMergeInto] = useState("");
  const [tableId, setTableId] = useState(order.table_id ?? "");
  const [server, setServer] = useState(order.server_name ?? "");
  const [tables, setTables] = useState<TableRow[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase
        .from("restaurant_tables")
        .select("id,name,area,status")
        .order("area")
        .order("name");
      setTables((data ?? []) as TableRow[]);
    })();
  }, [open]);

  const movable = useMemo(() => lines.filter((l) => picked.includes(l.id)), [lines, picked]);
  const movingTotal = movable.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0);
  const others = openChecks.filter((o) => o.id !== order.id);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setOpen(false);
      setPicked([]);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That operation could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Scissors className="mr-1 h-4 w-4" /> Split / merge / move
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check {order.order_no ?? ""}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="split">
          <TabsList className="w-full">
            <TabsTrigger value="split" className="flex-1"><Scissors className="mr-1 h-4 w-4" /> Split</TabsTrigger>
            <TabsTrigger value="merge" className="flex-1"><Merge className="mr-1 h-4 w-4" /> Merge</TabsTrigger>
            <TabsTrigger value="move" className="flex-1"><ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="split" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tick the lines that move onto a new check. At least one line must stay behind.
            </p>
            <ul className="max-h-64 space-y-1 overflow-auto">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-lg border p-2 text-sm">
                  <Checkbox
                    checked={picked.includes(l.id)}
                    onCheckedChange={(v) =>
                      setPicked((p) => (v ? [...p, l.id] : p.filter((x) => x !== l.id)))
                    }
                  />
                  <span className="flex-1">
                    {l.qty} × {l.item_name}
                    {l.seat_no ? <span className="text-muted-foreground"> · seat {l.seat_no}</span> : null}
                  </span>
                  <span className="tabular-nums">{fmtMoney(Number(l.qty) * Number(l.price))}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <Label className="text-xs">Guests</Label>
                <Input value={guests} onChange={(e) => setGuests(e.target.value)} inputMode="numeric" />
              </div>
              <div className="text-sm text-muted-foreground">
                Moving {movable.length} line(s) · <span className="tabular-nums">{fmtMoney(movingTotal)}</span>
              </div>
              <Button
                className="ml-auto"
                disabled={busy || movable.length === 0}
                onClick={() => run(() => splitCheck(order.id, picked, Number(guests) || 1), "Check split")}
              >
                Split check
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="merge" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Move every line from this check onto another open check. This check is then closed as merged.
            </p>
            <div>
              <Label className="text-xs">Merge into</Label>
              <Select value={mergeInto} onValueChange={setMergeInto}>
                <SelectTrigger><SelectValue placeholder="Choose an open check…" /></SelectTrigger>
                <SelectContent>
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_no ?? o.id.slice(0, 8)} · {o.server_name ?? "unassigned"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {others.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">No other open check to merge into.</p>
              )}
            </div>
            <Button
              disabled={busy || !mergeInto}
              onClick={() => run(() => mergeChecks(order.id, mergeInto), "Checks merged")}
            >
              Merge check
            </Button>
          </TabsContent>

          <TabsContent value="move" className="space-y-3">
            <p className="text-sm text-muted-foreground">Move this check to another table or hand it to another server.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Table</Label>
                <Select value={tableId} onValueChange={setTableId}>
                  <SelectTrigger><SelectValue placeholder="Choose a table…" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.area ? ` · ${t.area}` : ""} · {t.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Server</Label>
                <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Server name" />
              </div>
            </div>
            <Button
              disabled={busy || (!tableId && !server.trim())}
              onClick={() => run(() => transferCheck(order.id, tableId || null, server), "Check transferred")}
            >
              Transfer check
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
