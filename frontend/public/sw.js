/**
 * FUGUSAU Portal — Service Worker
 *
 * Previous version cached index.html + assets forever with a hardcoded,
 * never-bumped cache name. After every redeploy, returning visitors (mostly
 * mobile — desktop browsers without a prior visit had no stale cache to hit)
 * got served a stale index.html referencing deleted hashed bundle files,
 * i.e. a blank white screen with a 404'd script and no way to recover short
 * of manually clearing site data.
 *
 * Fix: the HTML shell and JS/CSS bundles are now network-first (always try
 * fresh, fall back to cache only if offline). Old cache versions are wiped
 * on activate, and skipWaiting/clients.claim make new deploys take over
 * immediately instead of waiting for every tab to be closed.
 */
const CACHE_VERSION = 'v2';
const CACHE_NAME = `fugusau-cache-${CACHE_VERSION}`;
const PRECACHE_ASSETS = ['/manifest.json', '/fugusau-logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate';
  const isBuildAsset = req.destination === 'script' || req.destination === 'style';

  if (isNavigation || isBuildAsset) {
    // Network-first: always get the current deploy's HTML/JS/CSS when online.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (fonts, images, icons): cache-first, network fallback.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        return res;
      });
    })
  );
});
