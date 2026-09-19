# SifoBooks — Independent Project

This project is an independent TanStack Start application with local SQLite + JWT auth.
It is no longer connected to Lovable, Base44, or Supabase.

## Architecture

- **Frontend**: TanStack Start (React + Vite + SSR)
- **Database**: Local SQLite via `bun:sqlite` (see `src/lib/db/`)
- **Auth**: JWT-based local auth (see `src/lib/db/auth.ts`)
- **Storage**: Local file storage (see `src/lib/db/storage.ts`)
- **Compatibility**: `src/integrations/supabase/client.ts` is a shim that mimics the Supabase JS client API but routes all calls to local SQLite via server functions. This allows 226+ files that use `supabase.from(...)` to work without changes.

## Development

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
```

## Environment Variables

See `.env` for required variables. Key variables:

- `JWT_SECRET` — secret key for JWT signing/verification (auto-generated if not set)
- `DATABASE_PATH` — path to SQLite database file (defaults to `data/sifobooks.db`)
- `AI_API_KEY` — API key for the AI commentary feature (OpenAI-compatible endpoint)
- `AI_API_URL` — base URL for the AI API (defaults to OpenAI)
- `AI_MODEL` — model name for the AI API
