// Offline support. Written to dist/sw.js by seo/plugin.ts, which fills in the version and the
// built files: they are all cached at install, so the second visit is instant and works offline.
// Pages are fetched network-first (so updates arrive); everything else comes from the cache.
const CACHE = 'meowtrix-__VERSION__';
const CORE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon.svg', ...__ASSETS__];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Each page (/, /eau/, /en/…) is kept under its own address; offline, any of them falls back to /.
    const page = new URL(request.url).pathname;
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(page, copy));
          }
          return res;
        })
        .catch(() => caches.match(page).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
