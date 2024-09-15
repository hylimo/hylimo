// This file is loaded automatically by <head><script/></head>, so .vitepress/config

export type {};
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "hylimo_v1";

const URLS: string[] = ["/index.html"]; // <- This line must stay like this, our CI fills it automatically

/**
 * Install event - download and cache all pre-defined URLs
 */
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS);
        })
    );
});

/**
 * Fetch event - serve from cache or fetch and cache
 */
self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then((request) => {
            return request || fetchAndCache(e.request);
        })
    );
});

/**
 * Re-fetches the given request and caches its response
 * @param request the request to fetch
 */
function fetchAndCache(request: Request): Promise<Response> {
    return fetch(request).then((response) =>
        caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
        })
    );
}

/**
 * Activate event - clean up old caches if needed
 */
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                    return undefined;
                })
            );
        })
    );
});
