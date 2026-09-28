# SifoBooks Enterprise (Windows x64) — Acceptance Test Checklist

Status: NOT YET RUN on physical Windows. Use a **test company only** — never a real customer company.
Record for each step: Pass / Fail, Windows version, tester, date, and attach `C:\ProgramData\SifoBooks\logs\desktop-startup.log` on failure.

Build under test: see `version.json` beside `SifoBooks.exe`.

| # | Area | Steps | Expected |
|---|------|-------|----------|
| A | Fresh installation | Run `SifoBooks-enterprise-Windows-Setup.exe` on a clean PC (admin). Accept Start Menu / Desktop shortcuts. | Installs to `C:\Program Files\SifoBooks\enterprise`. `C:\ProgramData\SifoBooks\{data,backups,config,logs}` exist; Users group has Modify. No extra runtime prompted. |
| B | First launch | Start from Desktop shortcut. | No black console window. Browser opens `http://localhost:3000` (or next free port) within ~10 s. Log shows "server started" + "Browser opened". Launching again opens the same address; no second copy in Task Manager. |
| C | Create company | Welcome → create **test** company. | Company created; stays after restart. |
| D | Sign in | Sign out, sign back in; wrong password once. | Correct password works; wrong one refused with a clear message. |
| E | Device activation | Activate this PC for the test company/branch. | Device shows as active; activating again does not create a duplicate. |
| F | Local database creation | Check `C:\ProgramData\SifoBooks\data\sifobooks.db`. | File exists; nothing written under Program Files. |
| G | Database migrations | Open `/api/health` and System Status. | 28 applied, 0 pending. |
| H | Backup creation | Wait ~5 s after launch; create a manual backup. | New files in `C:\ProgramData\SifoBooks\backups`. |
| I | Offline mode | Disconnect network. | App keeps working; offline indicator shown. |
| J | POS sale offline | Make a small test sale. | Receipt issued; sale marked pending sync. |
| K | Reconnection | Reconnect network. | Online indicator returns; no errors. |
| L | Synchronization | Wait for sync / press Sync. | Pending count → 0; sale appears in cloud test company once. |
| M | Duplicate prevention | Force retry (reconnect twice / restart mid-sync). | Sale exists exactly once; stock deducted once. |
| N | Printing | Print a receipt and an invoice to installed printer. | Correct printer dialog / thermal output; layout readable. |
| O | Application restart | Start Menu → "Stop SifoBooks", then relaunch. Also reboot PC. | Process exits; log shows "runtime stopped cleanly"; data intact after relaunch. |
| P | Upgrade | Install newer Setup over existing install. | Same shortcuts; test company, users, sales intact; new migrations applied. |
| Q | Data preservation | Compare record counts before/after P. | Identical (plus new migrations only). |
| R | Uninstall/reinstall | Uninstall via Settings → Apps; reinstall. | Program files removed; `C:\ProgramData\SifoBooks\data\sifobooks.db` and backups remain; reinstall reopens same company. |
| S | Multiple Windows users | Sign in to Windows as a second (standard) user and launch. | Same shared company database opens; no permission errors. |
| T | Error logging | Rename `client` folder temporarily (or block port) and launch; restore after. | Clear error recorded in `desktop-startup.log` with timestamp on separate lines. |

## Known limitations before testing
- Linux-built EXE: console window is hidden, but the icon and version details are **not embedded** in the EXE (shortcuts and installer use `SifoBooks.ico`). Building on Windows (`bun run build:desktop`) embeds icon, version and publisher.
- Closing the browser tab does not stop SifoBooks (it runs in the background so POS keeps working). Use "Stop SifoBooks" to shut it down.
- Installer has not yet been compiled (Inno Setup requires Windows) — run `installer\build-installer.ps1` on Windows after `bun run build:desktop`.
- ZRA/VSDC: not configured; no fiscal production integration.
- Debug build with visible console: `SIFOBOOKS_CONSOLE=1 bun run build:desktop`.
