/**
 * Ponnusamy Savings â€” Service Worker v315
 * Strategy: Stale-While-Revalidate for app shell files.
 * â†’ Serves from cache INSTANTLY on hard refresh (no blank screen).
 * â†’ Fetches fresh copy in background silently.
 * â†’ Falls back to premium offline.html for any failed navigation.
 * v311: Fixes offline "Syncing..." hang + offline indicator on all cached devices.
 */

const CACHE_NAME = 'pms-shell-v315';

// App shell files to pre-cache on install
const SHELL_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/style.css',
    '/auth.js',
    '/app.js',
    '/js/state.js',
    '/js/ui.js',
    '/js/utils.js',
    '/js/settings.js',
    '/js/pdf.js',
    '/js/pnl.js',
    '/js/sound.js',
    '/logo-light.jpg',
    '/logo-light.png',
    '/manifest.json'
];

/* â”€â”€ Install: pre-cache the app shell â”€â”€ */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting()) // don't block on cache failure
    );
});

/* â”€â”€ Activate: clean up old caches â”€â”€ */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

/* â”€â”€ Fetch: smart routing â”€â”€ */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only intercept GET requests
    if (request.method !== 'GET') return;

    // Skip Supabase API calls â€” always go to network
    if (url.hostname.includes('supabase.co'))     return;
    if (url.hostname.includes('googleapis.com'))  return;
    if (url.hostname.includes('gstatic.com'))     return;

    // CDN scripts (lucide, supabase-js): network-first, fallback to cache
    if (url.hostname.includes('unpkg.com') || url.hostname.includes('jsdelivr.net')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // All local app files: STALE-WHILE-REVALIDATE
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(cached => {

                // Always kick off a background network refresh
                const networkFetch = fetch(request)
                    .then(response => {
                        if (response && response.ok) {
                            cache.put(request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => null);

                // If we have a cached copy, return it immediately
                if (cached) return cached;

                // No cache â€” wait for network
                return networkFetch.then(res => {
                    if (res) return res;

                    // Network failed: serve premium offline page for navigation requests
                    const isNavigation = request.mode === 'navigate';
                    const acceptsHtml  = (request.headers.get('accept') || '').includes('text/html');

                    if (isNavigation || (request.method === 'GET' && acceptsHtml)) {
                        return caches.match('/offline.html');
                    }

                    return new Response('', { status: 503, statusText: 'Service Unavailable' });
                });
            });
        })
    );
});

