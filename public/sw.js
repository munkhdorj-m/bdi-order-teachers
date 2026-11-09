/**
 * Service worker: caches only /_next/static/* (JS, CSS, fonts). Those
 * files are content-hashed, so a cached copy can never be stale. Pages,
 * server actions, images and data are never touched: caching those is how
 * you show old prices. (Adapted from the BDI site's sw.js.)
 */

const STATIC_CACHE = "bdi-shop-static-v1";
const MAX_STATIC_ENTRIES = 300;
const DEV_HOST = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("bdi-shop-") && n !== STATIC_CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trimStatic(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC_ENTRIES; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (DEV_HOST || req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.type === "basic") {
          event.waitUntil(cache.put(req, res.clone()).then(() => trimStatic(cache)));
        }
        return res;
      } catch {
        return fetch(req);
      }
    })(),
  );
});
