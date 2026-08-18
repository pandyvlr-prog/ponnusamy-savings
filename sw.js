/**
 * Ponnusamy Savings - Service Worker v200 (NO-CACHE for JS/CSS)
 * JS and CSS are NEVER cached — always fetched fresh from Vercel.
 */

const CACHE_VERSION = 'pms-v201-nocache';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;

    // NEVER cache JS, CSS, or HTML — always fetch fresh
    const noCache = url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.css') ||
                    url.pathname === '/' ||
                    url.pathname.endsWith('.html');

    if (noCache) {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .catch(() => caches.match(request))
        );
        return;
    }

    // For other assets (images, fonts), use network-first
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(c => c.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});