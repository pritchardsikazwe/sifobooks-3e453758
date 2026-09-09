import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failed, notAuthenticated, rows, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_expenses",
  title: "List expenses",
  description: "List recorded expenses with amounts, categories and status for a date range.",
  inputSchema: {
    from: z.string().date().optional().describe("Only expenses dated on or after this date (YYYY-MM-DD)."),
    to: z.string().date().optional().describe("Only expenses dated on or before this date (YYYY-MM-DD)."),
    category: z.string().trim().min(1).optional().describe("Filter by expense category."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of expenses to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("expenses")
      .select("id,expense_number,expense_date,category,amount,vat_amount,total,currency,status,reference")
      .order("expense_date", { ascending: false })
      .limit(limit ?? 50);
    if (from) query = query.gte("expense_date", from);
    if (to) query = query.lte("expense_date", to);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    return error ? failed(error.message) : rows(data);
  },
});
