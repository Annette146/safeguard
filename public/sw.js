// Minimal service worker: caches the app shell so the SOS page and emergency
// numbers still open without a connection. API calls and evidence are NEVER cached.
const CACHE = 'safeguard-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/sos', '/icon.svg', '/manifest.webmanifest'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Network first, fall back to cache (keeps the app current but usable offline)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.pathname.startsWith('/assets/') || e.request.mode === 'navigate')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request.mode === 'navigate' ? '/' : e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request.mode === 'navigate' ? '/' : e.request).then((r) => r || Response.error())),
  );
});
