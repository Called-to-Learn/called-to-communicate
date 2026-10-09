const CACHE = "called-to-communicate-v37";
const APP_FILES = ["./", "./index.html", "./styles.css?v=9", "./app.js?v=34", "./firebase.js?v=24", "./firebase-config.js?v=5", "./manifest.webmanifest", "./app-icon-v2.png", "./favicon-v2.png", "./brand-mark-v1.png"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match("./index.html"))));
});
