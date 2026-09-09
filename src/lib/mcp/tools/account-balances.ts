import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failed, notAuthenticated, rows, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_account_balances",
  title: "Get account balances",
  description: "Read the trial-balance style account balances (debits, credits and net balance) per ledger account.",
  inputSchema: {
    account_type: z.string().trim().min(1).optional().describe("Filter by account type, e.g. Asset, Liability, Income, Expense."),
    limit: z.number().int().min(1).max(500).default(200).describe("Maximum number of accounts to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ account_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("account_balances")
      .select("account_code,account_name,account_type,total_debit,total_credit,balance,entry_count")
      .order("account_code")
      .limit(limit ?? 200);
    if (account_type) query = query.ilike("account_type", account_type);
    const { data, error } = await query;
    return error ? failed(error.message) : rows(data);
  },
});
