/**
 * Ponnusamy Savings - Service Worker
 * Cache-first strategy for static assets, network-first for API calls
 */

const CACHE_VERSION = 'pms-v36';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// App shell files to cache on install (critical for sub-1s load)
const APP_SHELL = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/auth.js',
    '/auth.css',
    '/manifest.json',
    '/logo-dark.jpg',
    '/logo-light.jpg',
    '/target_icon.png',
    '/avatar_icon.png',
    '/calendar_icon.png',
];

// External CDN resources to cache at runtime
const CDN_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com',
    'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        // Remove old cache versions
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k.startsWith('pms-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Supabase API calls (always network-first, no caching)
    if (url.hostname.includes('supabase.co')) return;

    // CDN resources: stale-while-revalidate
    const isCDN = CDN_HOSTS.some(h => url.hostname.includes(h));
    if (isCDN) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(cache =>
                cache.match(request).then(cached => {
                    const networkFetch = fetch(request).then(response => {
                        if (response.ok) cache.put(request, response.clone());
                        return response;
                    });
                    return cached || networkFetch;
                })
            )
        );
        return;
    }

    // App shell: cache-first
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                if (response.ok && request.url.startsWith(self.location.origin)) {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});
