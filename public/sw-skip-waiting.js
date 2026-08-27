// Imported by the generated Workbox service worker (generateSW + importScripts).
// Lets the in-app update prompt activate a waiting build on demand.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
