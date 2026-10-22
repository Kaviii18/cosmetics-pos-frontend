const CACHE_NAME = 'cosmetics-pos-v2';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    })
  );
});

// Activate: clean up older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: offline-first strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Handle SPA Navigation requests (e.g. /pos, /products, /sales, /reports)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // Cache latest index.html on successful response
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return networkRes;
        })
        .catch(() => {
          // Completely offline: serve cached index.html so React Router takes over!
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || caches.match('/');
          });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, SVGs, Fonts, Images)
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Return cached version immediately, and update cache in background if online
        fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
          })
          .catch(() => { /* Offline: ignore fetch error */ });

        return cachedRes;
      }

      // If not cached, fetch from network and cache for next time
      return fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(() => {
          // If offline and requesting an image, return placeholder if needed
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
