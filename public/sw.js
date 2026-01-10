
const CACHE_NAME = "tutorin-cache-v1";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Simple pass-through fetch for now to satisfy PWA requirements
    // In production, you would handle caching strategies here.
    event.respondWith(fetch(event.request));
});
