import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failed, notAuthenticated, rows, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_stock_items",
  title: "List stock items",
  description: "List inventory items with quantity on hand, cost and selling price; can show only low-stock items.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Filter by item name or SKU text."),
    low_stock_only: z.boolean().default(false).describe("Only return items at or below their reorder level."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of items to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, low_stock_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("stock_items")
      .select("id,name,sku,unit,category,quantity_on_hand,reorder_level,cost_price,sell_price,is_active")
      .order("name")
      .limit(low_stock_only ? 200 : (limit ?? 50));
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return failed(error.message);
    const list = low_stock_only
      ? (data ?? [])
          .filter((i) => Number(i.quantity_on_hand ?? 0) <= Number(i.reorder_level ?? 0))
          .slice(0, limit ?? 50)
      : data;
    return rows(list);
  },
});
