# SifoBooks Desktop (Windows .exe)

SifoBooks is packaged as a native Windows desktop application that runs entirely
offline. It uses a local compiled server hosted inside a native Microsoft Edge WebView2
window, so customers do not need Chrome or another browser installed. The package
also includes an offline WebView2 runtime bootstrap for fresh Windows PCs.

## Prerequisites

- [Bun](https://bun.sh) installed on the build machine (any OS)
- The repository cloned and dependencies installed (`bun install`)

## Building the .exe

```sh
bun run build:desktop
```

This script (`scripts/build-desktop.ts`) builds the native Windows package:

1. **Builds the web app** — Vite produces the client/server bundles.
2. **Compiles the local server** — Bun compiles the SifoBooks server into a Windows server executable.
3. **Builds the native desktop host** — .NET 8 WinForms hosts SifoBooks inside Microsoft Edge WebView2.
4. **Bundles WebView2 runtime** — the x64 Evergreen Standalone Runtime is included for fresh/offline PCs.
5. **Copies protected application assets** — client assets, compressed schema/migrations, configuration and backups are packaged.

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

1. Copy the entire `desktop-dist/` folder to the Windows machine.
2. Double-click the SifoBooks edition executable or `start-sifobooks.bat`.
3. On a fresh PC, the launcher checks for WebView2 and silently installs the bundled x64 runtime if it is missing.
4. SifoBooks opens in its own native desktop window — **Chrome is not required**.
5. The local SQLite database is created automatically on first run.

The Inno Setup installer also installs WebView2 before launching SifoBooks.

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
