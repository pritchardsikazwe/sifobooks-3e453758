# SifoBooks Architecture

## Goal

SifoBooks is maintained as a self-contained application. The Git repository is the master source, and runtime must not depend on Base44 or a particular hosting provider.

## Current runtime

- React + TanStack Start
- Bun 1.3.14
- SQLite through Bun native SQLite
- Local application authentication/JWT
- Local filesystem storage
- Internal Supabase-compatible API over SQLite

The compatibility layer does not require a live Supabase project for normal runtime.

## Deployment modes

### Windows desktop / offline POS

The desktop build packages the web application and local server together. SQLite data remains local, so Windows can run SifoBooks without GitHub, Base44, or a cloud provider.

### Self-hosted web server

Install Bun 1.3.14, install dependencies from the lockfile, configure .env, then run bun run build and bun run start.

Docker is an optional provider-neutral packaging method.

## Data boundary

Business logic should use application-level database functions rather than a cloud database SDK.

Current boundary:

UI -> application services -> local query executor -> SQLite

A future cloud database adapter can be added without selecting a hosting provider now.

## Offline-first direction

Windows POS -> local SQLite -> sync layer -> optional cloud database -> web dashboard

The sync layer is a future implementation step. No hosting provider is assumed.

## Database history

The supabase/ directory contains historical migrations from the previous system. They are retained as migration/reference material while the SQLite schema is verified. They are not required as a live Supabase service.

## Secrets

Never commit .env or production secrets. The desktop runtime generates a persistent local JWT secret on first launch when one is not supplied. Server deployments should provide a strong JWT_SECRET.

## Backups

Use the repository SQLite backup scripts before upgrades and migrations. Avoid copying a live WAL-mode database blindly.

## Hosting

No hosting provider is part of the application architecture. The repository can later be deployed to a VPS, container platform, private server, or another compatible environment after the hosting decision.
