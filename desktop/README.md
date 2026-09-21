# SifoBooks Desktop (Windows .exe)

SifoBooks can be packaged as a standalone Windows executable that runs entirely
offline — no internet connection, no server installation, no external
dependencies. All data is stored in a local SQLite database file.

## Prerequisites

- [Bun](https://bun.sh) installed on the build machine (any OS)
- The repository cloned and dependencies installed (`bun install`)

## Building the .exe

```sh
bun run build:desktop
```

This script (`scripts/build-desktop.ts`) does four things:

1. **Builds the web app** — `vite build` produces `dist/client/` (static assets)
   and `dist/server/` (TanStack Start server bundle).
2. **Compiles the desktop server** — `bun build --compile --target=bun-windows-x64`
   compiles `src/desktop/server.ts` into a standalone `sifobooks.exe` with the
   Bun runtime embedded.
3. **Copies client assets** — `dist/client/` is copied into `desktop-dist/client/`.
4. **Copies schema & config** — `schema.sql` and a default `.env` are placed
   next to the executable. A `start-sifobooks.bat` launcher is also created.

## Output

```
desktop-dist/
├── sifobooks.exe          ← double-click to run
├── start-sifobooks.bat    ← alternative launcher
├── client/                ← web assets (HTML, JS, CSS, images)
├── schema.sql             ← database schema (auto-applied on first run)
├── .env                   ← configuration (edit if needed)
└── data/                  ← created on first run, holds the SQLite DB
```

## Running on Windows

1. Copy the entire `desktop-dist/` folder to your Windows machine.
2. Double-click `sifobooks.exe` (or `start-sifobooks.bat`).
3. Your default browser opens automatically at `http://localhost:3000`.
4. The app is ready to use — the database is created automatically on first run.

## Configuration

Edit `.env` in the `desktop-dist/` folder before launching:

| Variable         | Default                              | Description                        |
| ---------------- | ------------------------------------ | ---------------------------------- |
| `JWT_SECRET`     | `sifobooks-local-dev-secret-...`     | Secret for JWT auth signing         |
| `DATABASE_PATH`  | `data/sifobooks.db`                  | Path to the SQLite database file   |
| `PORT`           | `3000`                               | Port the server listens on         |

## Data Location

The SQLite database is stored at `desktop-dist/data/sifobooks.db` by default.
To start fresh, delete the `data/` folder and relaunch the app.

## Multi-Terminal / Network Access

By default the desktop server binds to `127.0.0.1` (localhost only). To allow
other machines on the LAN to connect, set `HOST=0.0.0.0` in `.env` and access
the app via the host machine's IP address on port 3000.

## How It Works

The compiled `sifobooks.exe` contains:

- The **Bun runtime** (embedded by `--compile`)
- A **desktop server** (`src/desktop/server.ts`) that:
  - Serves static client assets from `./client/`
  - Delegates API and page requests to the built TanStack Start server bundle
  - Creates the SQLite database and applies the schema on first launch
  - Opens the default browser automatically

No external services, cloud dependencies, or internet connection required.


## Desktop shortcut and backups

Run `Create-SifoBooks-Shortcut.bat` once to create a **SifoBooks** shortcut on the Windows desktop using the bundled SifoBooks icon.

SifoBooks automatically creates a timestamped SQLite backup in `backups\\` when the desktop application starts. The latest 30 backups are retained. Keep the `backups\\` folder when moving the installation to another PC.
