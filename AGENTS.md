<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Base44 dev environment

This is a TanStack Start (SSR via nitro) + Vite 8 + React 19 app using **Bun** as the
package manager (`bun@1.3.14`). It connects to a **remote Supabase** project — no
local database is needed.

### Running it
- `docker compose -f docker-compose.base44.yml up -d` starts the dev server on port 3000.
- The container runs `bun install` then `bun run dev` (Vite dev with HMR + TanStack Start SSR).
- Source is bind-mounted at `/app`, so edits hot-reload without rebuilds.
- `node_modules` lives in a named volume (kept off the host, persists across restarts).

### Environment
- Supabase publishable keys (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and their
  `VITE_`-prefixed copies) are committed in `.env`. These are **public/client-safe**
  publishable keys, not secrets — no credentials are needed to boot.
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed through so Vite accepts the
  preview origin.
- `LOVABLE_API_KEY` is referenced by an optional AI feature (`src/lib/afs-ai.functions.ts`)
  but is not required to boot.

### Verifying it works
- `curl -s --compressed http://localhost:3000/` should return HTTP 200 with the
  SifoBooks title in the SSR HTML.
- `@vite/client` (HMR) should return 200.
