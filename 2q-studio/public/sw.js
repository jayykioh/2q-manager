const CACHE_NAME = '2q-pos-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/login',
  '/manifest.webmanifest',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // For API/Supabase requests, try network first, then fail
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }

  // Network first, fallback to cache for HTML/assets
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return new Response('Network error and no cache available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});
