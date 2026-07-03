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

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || '',
        icon: data.icon || '/favicon.ico',
        data: data.data || {},
        vibrate: [100, 50, 100],
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Thông báo mới', options)
      );
    } catch (e) {
      // If not JSON, just show as text
      event.waitUntil(
        self.registration.showNotification('Thông báo mới', {
          body: event.data.text(),
          icon: '/favicon.ico'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
