-- Restore the accounting posting-rule registry used by POS and restaurant checkout.
-- The checkout has COA-code fallbacks, so an empty registry is valid.
CREATE TABLE IF NOT EXISTS accounting_posting_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  rule_key TEXT NOT NULL,
  debit_account_id TEXT,
  credit_account_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, company_id, rule_key)
);
CREATE INDEX IF NOT EXISTS idx_accounting_posting_rules_user
  ON accounting_posting_rules(user_id, company_id, rule_key, active);
