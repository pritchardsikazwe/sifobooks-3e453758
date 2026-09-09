import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCustomers from "./tools/list-customers";
import listInvoices from "./tools/list-invoices";
import listExpenses from "./tools/list-expenses";
import listStockItems from "./tools/list-stock";
import listPosSales from "./tools/list-sales";
import getAccountBalances from "./tools/account-balances";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "sifobooks",
  title: "Sifobooks",
  version: "0.1.0",
  instructions:
    "Read-only tools over the signed-in Sifobooks account: customers, invoices, expenses, inventory, point-of-sale sales and ledger account balances. All data is scoped to the connected user's own company records.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCustomers, listInvoices, listExpenses, listStockItems, listPosSales, getAccountBalances],
});
