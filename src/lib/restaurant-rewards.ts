import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

/** Points earned per unit of currency spent. 1 point per ZMW 10. */
export const POINTS_PER_CURRENCY = 0.1;

export const loyaltyTier = (lifetimeSpend: number) =>
  lifetimeSpend >= 20000 ? "platinum" : lifetimeSpend >= 8000 ? "gold" : lifetimeSpend >= 2000 ? "silver" : "bronze";

/**
 * Accrue loyalty points for a settled order. Silently no-ops when the order has
 * no phone number attached (walk-in checks).
 */
export async function accrueLoyaltyForOrder(orderId: string) {
  const { data: order } = await db
    .from("restaurant_orders")
    .select("id, user_id, total, customer_phone, customer_name, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order?.customer_phone) return null;

  const spend = Number(order.total || 0);
  const { data: acct } = await db
    .from("restaurant_loyalty_accounts")
    .select("*")
    .eq("user_id", order.user_id)
    .eq("phone", order.customer_phone)
    .maybeSingle();

  if (acct) {
    const lifetime = Number(acct.lifetime_spend || 0) + spend;
    await db
      .from("restaurant_loyalty_accounts")
      .update({
        points: Number(acct.points || 0) + Math.floor(spend * POINTS_PER_CURRENCY),
        lifetime_spend: lifetime,
        tier: loyaltyTier(lifetime),
      })
      .eq("id", acct.id);
    return acct.id as string;
  }

  const { data: created } = await db
    .from("restaurant_loyalty_accounts")
    .insert({
      user_id: order.user_id,
      phone: order.customer_phone,
      member_name: order.customer_name ?? null,
      customer_id: order.customer_id ?? null,
      points: Math.floor(spend * POINTS_PER_CURRENCY),
      lifetime_spend: spend,
      tier: loyaltyTier(spend),
    })
    .select("id")
    .maybeSingle();
  return (created?.id as string) ?? null;
}

/** Deduct an amount from a gift card balance. Returns the remaining balance. */
export async function redeemGiftCard(code: string, amount: number) {
  const { data: card } = await db
    .from("restaurant_gift_cards")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (!card) throw new Error("Gift card not found");
  if (card.status !== "active") throw new Error(`Gift card is ${card.status}`);
  if (Number(card.balance) < amount) throw new Error(`Insufficient balance (${card.balance})`);

  const balance = Number(card.balance) - amount;
  await db
    .from("restaurant_gift_cards")
    .update({ balance, status: balance <= 0 ? "redeemed" : "active" })
    .eq("id", card.id);
  return balance;
}
