import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failed, notAuthenticated, rows, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pos_sales",
  title: "List point-of-sale sales",
  description: "List till sales with totals, discounts and status for a date range, newest first.",
  inputSchema: {
    from: z.string().datetime({ offset: true }).or(z.string().date()).optional().describe("Sales made on or after this date/time."),
    to: z.string().datetime({ offset: true }).or(z.string().date()).optional().describe("Sales made on or before this date/time."),
    status: z.string().trim().min(1).optional().describe("Filter by sale status, e.g. completed, void, refund."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of sales to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("pos_sales")
      .select("id,sale_no,sold_at,status,customer_name,subtotal,discount,tax,total,paid,change_due,branch_id,location_id")
      .order("sold_at", { ascending: false })
      .limit(limit ?? 50);
    if (from) query = query.gte("sold_at", from);
    if (to) query = query.lte("sold_at", to);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    return error ? failed(error.message) : rows(data);
  },
});
