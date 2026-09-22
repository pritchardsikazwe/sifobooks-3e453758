CREATE TABLE IF NOT EXISTS demo_statement_register (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_id TEXT NOT NULL, bank_account_id TEXT,
  period_start TEXT NOT NULL, period_end TEXT NOT NULL, source_name TEXT NOT NULL,
  opening_balance REAL NOT NULL, total_credits REAL NOT NULL DEFAULT 0, total_debits REAL NOT NULL DEFAULT 0,
  statement_closing_balance REAL NOT NULL, cashbook_closing_balance REAL, difference REAL,
  entry_count INTEGER NOT NULL DEFAULT 0, reconciliation_status TEXT NOT NULL DEFAULT 'pending',
  source_note TEXT, installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_demo_statement_register_user ON demo_statement_register(user_id,period_start);