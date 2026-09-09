// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Explicitly target Vercel/Nitro for production deployment.
    // Keep the custom server entry used by SifoBooks for SSR error handling.
    server: {
      entry: "server",
      preset: "vercel",
    },
  },
  plugins: [
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
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/lovable\//],
        // Adds the SKIP_WAITING message listener used by the in-app update prompt.
        importScripts: ["/sw-skip-waiting.js"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Old installs were getting stuck on a stale build: take over immediately.
        skipWaiting: true,
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
});
