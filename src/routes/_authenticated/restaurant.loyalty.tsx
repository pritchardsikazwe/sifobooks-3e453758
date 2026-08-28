import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { loyaltyTier, redeemGiftCard } from "@/lib/restaurant-rewards";
import { cn } from "@/lib/utils";
import { Gift, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/loyalty")({
  head: () => ({
    meta: [
      { title: "Loyalty & Gift Cards — SifoBooks Restaurant" },
      { name: "description", content: "Manage restaurant loyalty members, points and tiers, and issue or redeem gift cards against real order data." },
      { property: "og:title", content: "Loyalty & Gift Cards — SifoBooks Restaurant" },
      { property: "og:description", content: "Members, points, tiers, gift card issuing and redemption." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Loyalty,
});

const db: any = supabase;
const randomCode = () => `GC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function Loyalty() {
  const [members, setMembers] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [member, setMember] = useState({ member_name: "", phone: "", points: 0 });
  const [card, setCard] = useState({ code: randomCode(), initial_value: 200, expires_on: "" });
  const [redeem, setRedeem] = useState({ code: "", amount: 0 });
  const [adjust, setAdjust] = useState<Record<string, number>>({});

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [m, c] = await Promise.all([
      db.from("restaurant_loyalty_accounts").select("*").eq("user_id", u).order("lifetime_spend", { ascending: false }),
      db.from("restaurant_gift_cards").select("*").eq("user_id", u).order("created_at", { ascending: false }),
    ]);
    setMembers(m.data ?? []); setCards(c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!member.phone.trim()) return toast.error("Phone number is required");
    const u = await uid();
    const { error } = await db.from("restaurant_loyalty_accounts").insert({
      user_id: u, member_name: member.member_name || null, phone: member.phone.trim(),
      points: Number(member.points || 0), lifetime_spend: 0, tier: loyaltyTier(0),
    });
    if (error) return toast.error(error.message);
    setMember({ member_name: "", phone: "", points: 0 });
    toast.success("Member enrolled"); load();
  };

  const adjustPoints = async (m: any) => {
    const delta = Number(adjust[m.id] ?? 0);
    if (!delta) return toast.error("Enter points to add or subtract");
    const next = Math.max(0, Number(m.points || 0) + delta);
    const { error } = await db.from("restaurant_loyalty_accounts").update({ points: next }).eq("id", m.id);
    if (error) return toast.error(error.message);
    setAdjust({ ...adjust, [m.id]: 0 });
    toast.success(`Points ${delta > 0 ? "added" : "redeemed"}`); load();
  };

  const issueCard = async () => {
    const u = await uid();
    const { error } = await db.from("restaurant_gift_cards").insert({
      user_id: u, code: card.code.trim().toUpperCase(), initial_value: Number(card.initial_value || 0),
      balance: Number(card.initial_value || 0), status: "active", expires_on: card.expires_on || null,
    });
    if (error) return toast.error(error.message);
    setCard({ code: randomCode(), initial_value: 200, expires_on: "" });
    toast.success("Gift card issued"); load();
  };

  const doRedeem = async () => {
    try {
      const bal = await redeemGiftCard(redeem.code, Number(redeem.amount || 0));
      toast.success(`Redeemed — remaining balance ${fmtMoney(bal)}`);
      setRedeem({ code: "", amount: 0 }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const voidCard = async (c: any) => {
    await db.from("restaurant_gift_cards").update({ status: "void" }).eq("id", c.id);
    toast.success("Gift card voided"); load();
  };

  const Pill = ({ s }: { s: string }) => (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] capitalize", toneClass[statusTone(s)])}>{s}</span>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Loyalty & gift cards</h1>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="cards">Gift cards ({cards.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card className="p-4 grid gap-2 sm:grid-cols-4">
            <Input placeholder="Member name" value={member.member_name} onChange={(e) => setMember({ ...member, member_name: e.target.value })} />
            <Input placeholder="Phone" value={member.phone} onChange={(e) => setMember({ ...member, phone: e.target.value })} />
            <Input type="number" placeholder="Opening points" value={member.points} onChange={(e) => setMember({ ...member, points: Number(e.target.value) })} />
            <Button onClick={addMember}>Enrol member</Button>
          </Card>

          <div className="flex justify-end">
            <ExportMenu filename={`loyalty-members-${today()}`} title="Loyalty members" rows={members.map((m) => ({
              Member: m.member_name ?? "—", Phone: m.phone ?? "—", Tier: m.tier, Points: Number(m.points), "Lifetime spend": Number(m.lifetime_spend),
            }))} />
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr>
                <th className="p-3">Member</th><th className="p-3">Phone</th><th className="p-3">Tier</th>
                <th className="p-3 text-right">Points</th><th className="p-3 text-right">Lifetime spend</th><th className="p-3">Adjust</th>
              </tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{m.member_name ?? "—"}</td>
                    <td className="p-3">{m.phone ?? "—"}</td>
                    <td className="p-3"><Pill s={m.tier} /></td>
                    <td className="p-3 text-right font-medium">{Number(m.points)}</td>
                    <td className="p-3 text-right">{fmtMoney(Number(m.lifetime_spend))}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Input className="h-8 w-24" type="number" value={adjust[m.id] ?? 0} onChange={(e) => setAdjust({ ...adjust, [m.id]: Number(e.target.value) })} />
                        <Button size="sm" variant="outline" onClick={() => adjustPoints(m)}>Apply</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!members.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No members yet — enrol one above or settle a check with a phone number.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Issue gift card</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Code" value={card.code} onChange={(e) => setCard({ ...card, code: e.target.value })} />
                <Input type="number" placeholder="Value" value={card.initial_value} onChange={(e) => setCard({ ...card, initial_value: Number(e.target.value) })} />
                <Input type="date" value={card.expires_on} onChange={(e) => setCard({ ...card, expires_on: e.target.value })} />
              </div>
              <Button onClick={issueCard}>Issue card</Button>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Redeem against a check</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Card code" value={redeem.code} onChange={(e) => setRedeem({ ...redeem, code: e.target.value })} />
                <Input type="number" placeholder="Amount" value={redeem.amount} onChange={(e) => setRedeem({ ...redeem, amount: Number(e.target.value) })} />
              </div>
              <Button variant="outline" onClick={doRedeem}>Redeem</Button>
            </Card>
          </div>

          <div className="flex justify-end">
            <ExportMenu filename={`gift-cards-${today()}`} title="Gift cards" rows={cards.map((c) => ({
              Code: c.code, Status: c.status, Issued: Number(c.initial_value), Balance: Number(c.balance), Expires: c.expires_on ?? "—",
            }))} />
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr>
                <th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3 text-right">Issued</th>
                <th className="p-3 text-right">Balance</th><th className="p-3">Expires</th><th className="p-3" />
              </tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-mono">{c.code}</td>
                    <td className="p-3"><Pill s={c.status} /></td>
                    <td className="p-3 text-right">{fmtMoney(Number(c.initial_value))}</td>
                    <td className="p-3 text-right font-medium">{fmtMoney(Number(c.balance))}</td>
                    <td className="p-3">{c.expires_on ?? "—"}</td>
                    <td className="p-3 text-right">
                      {c.status === "active" && <Button size="sm" variant="ghost" onClick={() => voidCard(c)}>Void</Button>}
                    </td>
                  </tr>
                ))}
                {!cards.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No gift cards issued yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
