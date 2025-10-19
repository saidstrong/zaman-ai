self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated.');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, { redirect: 'follow' })
      .then((response) => {
        if (!response || response.status !== 200) return response;
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
