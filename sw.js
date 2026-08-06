/**
 * Ponnusamy Savings - Service Worker (v177 Network-First)
 * Ensures all devices ALWAYS load the latest UI from server without stale cache!
 */

const CACHE_VERSION = 'pms-v186-flush';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

self.addEventListener('install', (event) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                // Delete ALL old caches to purge stale v150 assets completely
                keys.map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;

    // NETWORK-FIRST STRATEGY: Always fetch fresh code from Vercel server first
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok && request.url.startsWith(self.location.origin)) {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => {
                // Offline fallback from local cache if no internet connection
                return caches.match(request);
            })
    );
});