# SifoBooks Core Boundary

This directory contains platform-neutral SifoBooks business contracts.

## Rules

- Core code must not import `bun:sqlite`, Node/Bun filesystem APIs, Windows APIs, PostgreSQL clients, Supabase clients, or browser-only APIs.
- Windows-specific runtime behavior belongs under `src/platform/windows/` or the existing `src/desktop/` runtime.
- Cloud-specific runtime behavior belongs under `src/platform/cloud/` or the existing `src/lib/cloud/` services.
- Business rules should depend on interfaces/contracts, not on a database driver.
- Existing production code is migrated incrementally. This boundary is intentionally additive so the Windows branch can be tested after each step.
- Do not duplicate accounting, inventory, POS, tax, or document business rules between editions.

The first extraction target is the Windows edition. Existing SQLite/desktop code remains untouched until an individual dependency has a tested adapter.
