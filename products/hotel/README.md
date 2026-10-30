# SifoBooks Hotel

Standalone hotel-management app foundation. It uses the dedicated Supabase project `fotnafyrjawypbsttplf` and does not require the main SifoBooks runtime at runtime.

## Implemented foundation

- Dedicated Supabase project and hotel data schema.
- Tenant membership and row-level security policies.
- Hotel setup/onboarding, sign-in and sign-up UI.
- Initial operations workspace for room types, rooms, guests, reservations, housekeeping and folios.
- Room date-overlap protection at the database layer.
- Zambia defaults: ZMW, Africa/Lusaka, Zambia.

## Local run

1. Install a supported Node.js version and npm.
2. Copy `.env.example` to `.env.local`.
3. In Supabase project settings, obtain the project's publishable key (or legacy anon key) and set `VITE_SUPABASE_ANON_KEY`. Never use a service-role/secret key in this browser app.
4. Run `npm install`.
5. Run `npm run dev`.
6. Run `npm run build` before deploying.

Project URL: https://fotnafyrjawypbsttplf.supabase.co

## Deployment

Deploy this folder as a separate Vite static app and set the same environment variables in the hosting provider. Configure the eventual `hotel.sifobooks.com` domain, TLS, and Supabase Auth redirect URLs only after the hosting target is chosen. Do not create DNS records pointing to an unprovisioned host.

## Important current limitation

The code is being prepared in `products/hotel/` on the existing migration branch because the connected GitHub integration cannot create a new repository. This folder is a standalone build target, but it is not yet a separate GitHub repository or live domain. Once the new repository `sifobooks-hotel` is created, this folder should become its repository root. Existing SifoBooks production has not been modified.
