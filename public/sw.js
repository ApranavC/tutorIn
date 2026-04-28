
/* eslint-disable @typescript-eslint/no-unused-vars */
const CACHE_NAME = "tutorin-cache-v1";

self.addEventListener("install", () => {
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
