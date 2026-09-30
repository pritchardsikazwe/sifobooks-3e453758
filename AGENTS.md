# SifoBooks

TanStack Start app. Hosted build uses Lovable Cloud; Windows build uses local SQLite. Dev: `bun run dev`. Env: see `.env`.
Folder rules: src/lib/db/AGENTS.md (databases, Windows sync), src/lib/zra/AGENTS.md (ZRA), installer/AGENTS.md (Windows desktop).

- Ported files carry `// @ts-nocheck`; tsconfig strict:false + strictNullChecks; compat client is `any`. Why: port left ~250 type errors; remove per file.
- Hosted uses src/integrations/supabase/cloud-client*.ts; Windows sets VITE_SIFOBOOKS_BACKEND=local (local-client*.ts). Why: hosted must never load bun:sqlite.
- Deployment modes resolve via src/core/contracts/deployment.ts; device activation reuses print_devices. Why: one company, many devices, no duplicate registries.
- Inactive modules are wrapped in ModuleGate; never create placeholder tables. Why: no screen guaranteed to fail, no fake models.
- VAT/Turnover Tax maths live in src/lib/tax-reports.ts. Why: identical on web and Windows.
- Till sale numbers come only from next_doc_number('POS') inside pos_checkout (advisory lock); terminal numbers ignored. Why: unique, restart-safe, no renumbering.
