import { supabase } from "@/integrations/supabase/client";

/**
 * Check operations (split / merge / transfer) run entirely in the database so
 * that totals, table state and the audit trail stay consistent. Every function
 * refuses to touch a check that is already paid, voided or posted.
 */
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function splitCheck(orderId: string, itemIds: string[], guests?: number) {
  const { data, error } = await rpc("restaurant_split_check", {
    _order_id: orderId,
    _item_ids: itemIds,
    _guests: guests ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function mergeChecks(sourceId: string, targetId: string) {
  const { error } = await rpc("restaurant_merge_checks", { _source_id: sourceId, _target_id: targetId });
  if (error) throw new Error(error.message);
}

export async function transferCheck(orderId: string, tableId?: string | null, serverName?: string | null) {
  const { error } = await rpc("restaurant_transfer_check", {
    _order_id: orderId,
    _table_id: tableId ?? null,
    _server_name: serverName?.trim() ? serverName.trim() : null,
  });
  if (error) throw new Error(error.message);
}

/** True cost of a check, from the server-calculated line costs (never client figures). */
export function checkCost(lines: { qty: number | string; unit_cost?: number | string | null }[]) {
  return lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_cost || 0), 0);
}

/** Lines whose cost is still zero — their margin cannot be trusted yet. */
export function linesMissingCost<T extends { unit_cost?: number | string | null }>(lines: T[]) {
  return lines.filter((l) => !Number(l.unit_cost || 0));
}
