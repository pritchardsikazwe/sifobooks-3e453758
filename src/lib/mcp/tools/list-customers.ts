import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failed, notAuthenticated, rows, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description: "List customers for the signed-in account, optionally filtered by a name search.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Filter customers whose name contains this text."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of customers to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("customers")
      .select("id,name,email,phone,city,credit_limit,payment_terms_days,active")
      .order("name")
      .limit(limit ?? 50);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    return error ? failed(error.message) : rows(data);
  },
});
