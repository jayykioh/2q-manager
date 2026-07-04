const CACHE_NAME = "2q-pos-cache-v4";
const URLS_TO_CACHE = ["/", "/login", "/manifest.webmanifest", "/icon.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
          }
        } catch (e) {
          console.error("SW cache error for", url, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/") || event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const response = await caches.match(event.request);
      return response || new Response("Network error and no cache available", {
        status: 503,
        statusText: "Service Unavailable",
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(payload.title || "Thông báo mới", {
    body: payload.body || "",
    icon: payload.icon || "/icon.jpg",
    badge: "/icon.jpg",
    tag: payload.tag || data.notification_id,
    data,
    vibrate: [100, 50, 100],
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      if ("navigate" in client) await client.navigate(destination);
      return client.focus();
    }
    return self.clients.openWindow(destination);
  })());
});
