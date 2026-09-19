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

Build the portable Windows package from a Windows development machine:

```sh
bun install
bun run build:desktop
```

The resulting `desktop-dist/` package contains:
- `sifobooks.exe`
- `client/`
- `schema.sql`
- `.env.example`
- `start-sifobooks.bat`

Copy the complete `desktop-dist/` folder to a Windows PC and run `sifobooks.exe`.

On first launch, the desktop runtime creates `data/.jwt-secret` automatically when no `JWT_SECRET` is supplied. This keeps the authentication secret local to that installation instead of embedding a shared development secret.

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
