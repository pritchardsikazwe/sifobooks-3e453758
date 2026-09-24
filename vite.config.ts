import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  // Published hosting loads dist/server/server.js as a self-contained module
  // with no node_modules resolution — every dependency must be bundled in.
  // (bun:sqlite stays external; it is only reachable on the bun/self-hosted
  // runtime where the DB layer is actually used.)
  ssr: command === "build" ? { noExternal: true, external: ["bun"] } : { external: ["bun"] },
  // Vite 8/Rolldown resolves build-time imports separately from SSR externals.
  // Bun is provided by the Bun runtime and must not be bundled/resolved by Rolldown.
  build: { rolldownOptions: { external: ["bun"] } },
  // Multi-terminal: run `bun run dev:lan` to bind 0.0.0.0 so other
  // computers on the same network can connect to http://<this-laptop-ip>:3000
  plugins: [
    tanstackStart({
      // The local app relies on browser-side SQLite server functions; avoid the
      // incompatible SSR virtual-module path while preserving all client features.
      spa: { enabled: true },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      // The guarded wrapper in src/lib/pwa/register-sw.ts is the ONLY registrar.
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      // The served static root is dist/client — emit the SW there, not dist/.
      outDir: "dist/client",
      manifest: false, // public/manifest.webmanifest is authored by hand
      workbox: {
        globDirectory: "dist/client",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        // Adds the SKIP_WAITING message listener used by the in-app update prompt.
        importScripts: ["/sw-skip-waiting.js"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Old installs were getting stuck on a stale build: take over immediately.
        skipWaiting: false,
        runtimeCaching: [
          {
            // App navigations: always try the network first so deploys land.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "sifobooks-pages-v1",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            // Same-origin hashed build assets.
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin &&
              (request.destination === "script" ||
                request.destination === "style" ||
                request.destination === "font" ||
                request.destination === "image") &&
              !url.pathname.startsWith("/api/"),
            handler: "CacheFirst",
            options: {
              cacheName: "sifobooks-assets-v1",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "sifobooks-fonts-v1",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "sifobooks-font-css-v1" },
          },
        ],
        // Never let the SW touch backend/auth traffic — offline writes go through
        // the IndexedDB queue instead, and private data must not sit in the cache.
        navigationPreload: false,
      },
    }),
  ],
}));
