import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failed, notAuthenticated, rows, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_invoices",
  title: "List invoices",
  description: "List sales invoices with totals, amount paid and balance due, newest first.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by invoice status, e.g. draft, sent, paid."),
    from: z.string().date().optional().describe("Only invoices issued on or after this date (YYYY-MM-DD)."),
    to: z.string().date().optional().describe("Only invoices issued on or before this date (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of invoices to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("invoices")
      .select("id,number,issue_date,due_date,status,currency,total,amount_paid,balance_due,customer_id")
      .order("issue_date", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);
    if (from) query = query.gte("issue_date", from);
    if (to) query = query.lte("issue_date", to);
    const { data, error } = await query;
    return error ? failed(error.message) : rows(data);
  },
});
