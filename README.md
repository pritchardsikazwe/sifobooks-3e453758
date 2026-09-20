# SifoBooks

SifoBooks is a standalone accounting, POS, inventory and business-management platform designed for Zambia and other African markets.

The application is designed to run **without Base44**. It can run locally as a Windows desktop/offline POS application and can also be deployed as a self-hosted web application.

## Architecture

```
                         SIFOBOOKS
                            |
              +-------------+-------------+
              |                           |
        Windows Desktop              Self-hosted SaaS
              |                           |
        Local SQLite                 Server database
              |                           |
        Offline POS               Web dashboard / API
              |
       Local printing & data
              |
        Optional cloud sync
```

### Desktop mode

- Standalone Windows `.exe`
- Local SQLite database
- Works without GitHub, Base44 or an internet connection
- Local data and storage
- POS and inventory operations can continue offline
- Local printing agents can be used
- Database is stored under `data/`

### Server mode

- Self-hosted with Bun
- Docker Compose deployment supported
- Environment variables are controlled by the server owner
- No Base44 runtime dependency
- Authentication uses the application's own JWT implementation
- File storage uses the application's local storage layer

## Development

Requirements:
- Bun 1.3.x
- Git

```sh
git clone https://github.com/pritchardsikazwe/sifobooks-3e453758.git
cd sifobooks-3e453758
bun install
cp .env.example .env
bun run dev
```

## Production deployment

Create a real `.env` on the server. Do not commit it.

At minimum:

```env
DATABASE_PATH=data/sifobooks.db
JWT_SECRET=generate-a-long-random-production-secret
PORT=3000
NODE_ENV=production
```

Then:

```sh
bun install --frozen-lockfile
bun run build
bun run start
```

Or with Docker Compose:

```sh
cp .env.example .env
# edit .env and set a strong JWT_SECRET
docker compose up -d
```

The persistent application data is mounted at `./data`.

## Windows desktop build

The standalone Windows edition is the primary local/offline testing target.

Build it from a Windows development machine:

```sh
bun install
bun run build:desktop
```

The resulting `desktop-dist/` folder is a self-contained local application package:
- `sifobooks.exe` — standalone application server
- `client/` — browser assets
- `schema.sql` — local SQLite schema
- `start-sifobooks.bat` — one-click Windows launcher
- `README-FIRST.txt` — first-run instructions
- `.env.example` — optional configuration example
- `data/` — created automatically on first launch and contains the local company database

Copy the complete `desktop-dist/` folder to another Windows PC. Double-click `start-sifobooks.bat`; the local server starts and the browser opens at `http://localhost:3000`.

The local edition does not require GitHub, Base44, Namecheap, Contabo, WAMP, or an internet connection.

**Important:** keep the `data/` folder. It contains the company's SQLite database. Do not replace or delete it when moving an existing installation.

## Database

The current desktop/server implementation uses the application's SQLite database layer and schema in `src/lib/db/`.

The repository also contains historical Supabase migrations and compatibility shims from the migration period. They are retained until the migration is fully verified; they are not required by the standalone SQLite runtime.

## Zambia functionality

The application contains modules and foundations for:
- Accounting and chart of accounts
- Sales and invoicing
- Purchases and suppliers
- Inventory and warehouses
- POS and cashier controls
- VAT and tax configuration
- ZRA Smart Invoice integration
- Banking and reconciliation
- Multi-company / branch structures
- Restaurant and sector-specific ERP features
- Reports and exports

ZRA credentials, API secrets and other production credentials must be supplied through server-side environment variables or a secure secrets manager.

## Migration principle

Base44 is no longer part of the runtime architecture. Changes should be made in the Git repository and deployed from source.

Before removing the historical Supabase migration files or changing database schemas, back up production data and verify all affected modules.


## Repository verification and data tools

Run the standalone dependency guard:

```bash
bun run scripts/standalone-check.ts
```

Create a safe SQLite backup:

```bash
bun run scripts/backup-db.ts
```

Restore a SQLite backup:

```bash
bun run scripts/restore-db.ts backups/sifobooks-YYYY-MM-DD.db
```

The repository also includes a provider-neutral `Dockerfile`, Docker Compose configuration, architecture documentation, and GitHub Actions CI. These files are packaging and verification options; they do not select or lock SifoBooks to a hosting provider.

## What is intentionally not selected yet

SifoBooks does not currently depend on a specific VPS, cloud provider, or managed database. Hosting, cloud database selection, and production sync can be decided after the standalone application is fully verified.
