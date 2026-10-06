# SifoBooks

TanStack Start app. Hosted build uses Lovable Cloud; Windows build uses local SQLite. Dev: `bun run dev`. Env: see `.env`.
Folder rules: src/lib/db/AGENTS.md (databases, Windows sync), src/lib/zra/AGENTS.md (ZRA), installer/AGENTS.md (Windows desktop).

- Ported files carry `// @ts-nocheck`; tsconfig strict:false + strictNullChecks; compat client is `any`. Why: port left ~250 type errors; remove per file.
- Hosted uses src/integrations/supabase/cloud-client*.ts; Windows sets VITE_SIFOBOOKS_BACKEND=local (local-client*.ts). Why: hosted must never load bun:sqlite.
- Deployment modes resolve via src/core/contracts/deployment.ts; device activation reuses print_devices. Why: one company, many devices, no duplicate registries.
- Inactive modules are wrapped in ModuleGate; never create placeholder tables. Why: no screen guaranteed to fail, no fake models.
- VAT/Turnover Tax maths live in src/lib/tax-reports.ts. Why: identical on web and Windows.
- Till sale numbers come only from next_doc_number('POS') inside pos_checkout (advisory lock); terminal numbers ignored. Why: unique, restart-safe, no renumbering.
- Core workspace UI composes `src/components/sifo/*`, shadcn controls, and `DataTable`; avoid page-local visual systems. Why: one SifoBooks 2026 source of truth.


## SifoBooks source-of-truth workflow

GitHub `main` is the primary source of truth.

- Inspect existing routes, components, migrations/schema and tests before editing.
- Extend working architecture; do not rebuild unless explicitly requested.
- Lovable is a development assistant, not a second source of truth.
- Never merge `lovable-development` or `lovable-sync` wholesale.
- When a Lovable change is useful, compare its exact diff against `main` and port only missing/relevant changes.
- Keep routes, generated route registration and sidebar navigation consistent.
- Treat implemented modules as implemented; investigate integration/schema mismatches instead of hiding them behind placeholder schemas.
- Inspect existing migrations before database changes. Avoid unnecessary duplicate or parallel schemas.
- Preserve data, RLS, accounting posting, ZRA queues, retries, fiscalization, connector check-ins and audit trails.
- Keep Windows/local SQLite and hosted/cloud backend paths separate.
- A hosted server must never call a customer's `127.0.0.1`/localhost VSDC endpoint directly.
- Do not change authentication, offline-first behavior or backend selection unless explicitly requested.
- After every change, run build/type checks and relevant tests and report remaining issues.

**Default principle: inspect first, extend second, rebuild only when explicitly requested.**
