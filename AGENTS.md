# SifoBooks — Independent Project

This project is an independent TanStack Start + Supabase application.
It is no longer connected to Lovable or any low-code platform.

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

- `SUPABASE_URL` / `VITE_SUPABASE_URL` — Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — server-side service role key (never expose to client)
- `AI_API_KEY` — API key for the AI commentary feature (OpenAI-compatible endpoint)
- `AI_API_URL` — base URL for the AI API (defaults to OpenAI)
- `AI_MODEL` — model name for the AI API
