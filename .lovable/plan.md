# Diagnosis: SifoBooks online site and login failure

## Current state (checked)
- https://sifobooks.com/ returns 500. https://sifobooks.lovable.app/ redirects (302). The preview /auth page returns 200.
- The current version is `c18578e` ("restore synchronous sqlite runtime loader for Windows"), pushed from GitHub at 19:37 today.
- The preview sign-in fix `f7ddba6` ("Fixed Lovable preview auth bug") is **not part of `c18578e`**. The two versions branched from the same point (`1806bc8`), and `c18578e` was committed on the other branch.

## Root cause
1. **`f7ddba6` is missing from the current version.** Because of this, the online app has no split between the cloud and Windows backends again. These files are absent: `backend-mode.ts`, `cloud-client*.ts`, `local-client*.ts`. The sign-in client (`client.ts`) is back to the local-database version. Every sign-in and data request goes to the local SQLite database through server functions, and that database cannot run on Lovable hosting. So login fails, even in the preview once a real sign-in is tried.
2. **`c18578e` itself** changes only `src/lib/db/database.ts`. It swaps the dynamic loader for a static `createRequire(import.meta.url)` plus `require("bun:sqlite")` or `require("node:sqlite")`. That works in the Windows build with Bun and in local development with Node. But in the hosted server runtime, `createRequire`/`require` of built-in modules cannot be resolved or bundled, and there is no disk for the database file. Whatever loads this file crashes, and with `f7ddba6` missing, the sign-in path loads it.
3. **The live site** is still running an older failed deployment (`No such module "assets/react"`). It has not been republished since the cloud split, so it never received `f7ddba6`.

## Smallest safe fix
1. Bring `f7ddba6`'s changes back on top of `c18578e`, using the cloud/local split files and the `client.ts` / `client.server.ts` / `auth-attacher.ts` / `auth-middleware.ts` versions from `f7ddba6`, plus the `build-desktop.ts` local flag. Keep `c18578e`'s Windows-side loader intent.
2. Make `database.ts` safe for hosting without breaking Windows. Keep the synchronous loader, but resolve the built-in module through `process.getBuiltinModule` (falling back to `createRequire` only when running under Bun or Node). The online app must never import this file; only the Windows/local client reaches it.
3. Check: code check, production build (confirm the built server has no `bun:sqlite`, `node:sqlite` or `assets/react` references), automated tests, and a preview sign-up **and** sign-in with the test account.
4. Publish only after you confirm, then verify that https://sifobooks.com/ returns 200 and the sign-in page loads.

## To prevent recurrence
The GitHub branch and Lovable edits diverged. Future Windows commits should be made on top of the latest Lovable version, or they will drop the cloud split again.

## Not touched
No code, database or business data changes in this diagnosis.
