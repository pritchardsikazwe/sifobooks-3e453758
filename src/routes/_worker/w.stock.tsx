import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can, canFully } from "@/lib/pos-permissions";

export const Route = createFileRoute("/_worker/w/stock")({
  head: () => ({
    meta: [
      { title: "Stock & Transfers — SifoBooks POS" },
      { name: "description", content: "Warehouse to store, kitchen, bar and POS stock levels with location transfers." },
      { property: "og:title", content: "Stock & Transfers — SifoBooks POS" },
      { property: "og:description", content: "Move stock down the chain — every transfer creates an inventory transaction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerStock,
});

const LOCATION_TYPES = ["warehouse", "store", "kitchen", "bar", "pos"];

function WorkerStock() {
  const ctx = usePosContext();
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [form, setForm] = useState({ from: "", to: "", item: "", qty: "" });

  const load = async () => {
    if (!ctx?.tenantId) return;
    const [{ data: loc }, { data: it }, { data: tr }] = await Promise.all([
      supabase.from("inventory_locations").select("*").eq("user_id", ctx.tenantId).order("location_type"),
      supabase.from("stock_items").select("id,name,sku,quantity_on_hand,unit,cost_price").eq("user_id", ctx.tenantId).order("name").limit(500),
      supabase.from("inventory_transfers").select("*,inventory_transfer_items(id,description,quantity)").eq("user_id", ctx.tenantId).order("created_at", { ascending: false }).limit(50),
    ]);
    setLocations(loc ?? []); setItems(it ?? []); setTransfers(tr ?? []);
  };
  useEffect(() => { load(); }, [ctx?.tenantId]);

  if (!can(ctx, "stock_view")) return <div className="p-10 text-center text-slate-400">Stock is not available for your role.</div>;

  const seedLocations = async () => {
    const rows = LOCATION_TYPES.map((t) => ({
      user_id: ctx!.tenantId, name: t === "pos" ? "POS" : t[0].toUpperCase() + t.slice(1),
      location_type: t, code: t.toUpperCase(),
    }));
    const { error } = await supabase.from("inventory_locations").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Locations created"); load();
  };

  const createTransfer = async () => {
    if (!canFully(ctx, "stock_transfer")) return toast.error("Your role cannot transfer stock");
    const item = items.find((i) => i.id === form.item);
    const { data, error } = await supabase.from("inventory_transfers").insert({
      user_id: ctx!.tenantId, from_location_id: form.from || null, to_location_id: form.to || null,
      reference: `TR-${Date.now().toString().slice(-6)}`, status: "sent",
    }).select("id").single();
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase.from("inventory_transfer_items").insert({
      transfer_id: data.id, item_id: form.item || null, description: item?.name ?? null,
      quantity: Number(form.qty || 0), unit_cost: item?.cost_price ?? 0,
    });
    if (e2) return toast.error(e2.message);
    toast.success("Transfer recorded"); setForm({ from: "", to: "", item: "", qty: "" }); load();
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Stock &amp; transfers</h1>
        {!locations.length && canFully(ctx, "stock_transfer") && (
          <Button className="ml-auto bg-emerald-500 text-slate-950" onClick={seedLocations}>Create locations</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {locations.map((l) => (
          <div key={l.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs uppercase text-slate-400">{l.location_type}</div>
            <div className="font-semibold">{l.name}</div>
          </div>
        ))}
        {!locations.length && <div className="col-span-full text-slate-500 text-sm">Warehouse → Store → Kitchen → Bar → POS locations are not set up yet.</div>}
      </div>

      {canFully(ctx, "stock_transfer") && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="font-semibold">New transfer</div>
          <div className="grid sm:grid-cols-4 gap-2">
            <select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2">
              <option value="">From…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2">
              <option value="">To…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2">
              <option value="">Item…</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} type="number" placeholder="Qty"
              className="rounded-lg bg-slate-800 px-3 py-2" />
          </div>
          <Button className="bg-emerald-500 text-slate-950" onClick={createTransfer}>Transfer stock</Button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>{["Reference", "Date", "Items", "Status"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-semibold">{t.reference}</td>
                <td className="px-3 py-2">{t.transfer_date}</td>
                <td className="px-3 py-2">{(t.inventory_transfer_items ?? []).map((i: any) => `${i.quantity} × ${i.description ?? "item"}`).join(", ") || "—"}</td>
                <td className="px-3 py-2 capitalize">{t.status}</td>
              </tr>
            ))}
            {!transfers.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No transfers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>{["Item", "SKU", "On hand", "Unit"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.slice(0, 100).map((i) => (
              <tr key={i.id} className="border-t border-slate-800">
                <td className="px-3 py-2">{i.name}</td>
                <td className="px-3 py-2 text-slate-400">{i.sku ?? "—"}</td>
                <td className="px-3 py-2">{i.quantity_on_hand}</td>
                <td className="px-3 py-2 text-slate-400">{i.unit ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
