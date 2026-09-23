-- Secure administrator password reset and session invalidation.
ALTER TABLE auth_users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auth_users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auth_users ADD COLUMN password_changed_at TEXT;
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
