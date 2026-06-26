const CACHE_NAME = "horaire-usi-partage-v91";
const APP_SHELL = ["./", "./index.html", "./styles.css?v=85", "./assets/logo-medi-cal.png", "./assets/nav-holidays.png", "./assets/nav-hsfa.png", "./vendor-xlsx.full.min.js", "./api-client.js?v=4", "./app.js?v=84", "./pwa.js?v=1", "./manifest.json?v=87", "./icons/medi-cal-v3-180.png", "./icons/medi-cal-v3-192.png", "./icons/medi-cal-v3-512.png", "./icons/medi-cal-v3-maskable-192.png", "./icons/medi-cal-v3-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
});
