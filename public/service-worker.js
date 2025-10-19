self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// IMPORTANT: do not hijack navigations; let browser follow redirects.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) Allow native navigation handling (redirects included)
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { redirect: 'follow' }));
    return;
  }

  // 2) Intercept only same-origin GET requests
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (req.method !== 'GET' || !sameOrigin) return;

  // 3) Network First with redirect: 'follow' + offline fallback to cache
  event.respondWith(
    fetch(req, { redirect: 'follow' })
      .catch(() => caches.match(req))
  );
});
