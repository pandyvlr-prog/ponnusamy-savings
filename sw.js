/**
 * Ponnusamy Savings - Service Worker v301
 * Strategy: Stale-While-Revalidate for all app files.
 * App shell (HTML, JS, CSS) serves from cache INSTANTLY on hard refresh,
 * then fetches fresh copy in background — eliminates blank screen.
 */

const CACHE_NAME = 'pms-shell-v309';

// App shell files to cache immediately on install
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

// Install: pre-cache the app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting()) // Don't block on cache failure
    );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and external APIs (Supabase)
    if (request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;
    if (url.hostname.includes('googleapis.com')) return;
    if (url.hostname.includes('gstatic.com')) return;

    // For CDN scripts (lucide, supabase-js) — network first, fallback cache
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

    // For all app files: STALE-WHILE-REVALIDATE
    // → Serve from cache instantly (no blank screen)
    // → Fetch fresh copy in background silently
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(cached => {
                const networkFetch = fetch(request).then(response => {
                    if (response.ok) {
                        cache.put(request, response.clone());
                    }
                    return response;
                }).catch(() => null);

                // Return cached immediately if available, else wait for network
                return cached || networkFetch.then(res => {
                    if (res) return res;
                    // If network fails and it's a navigation request, serve offline page
                    const acceptHeader = request.headers.get('accept');
                    if (request.mode === 'navigate' || (request.method === 'GET' && acceptHeader && acceptHeader.includes('text/html'))) {
                        return caches.match('/offline.html').then(offlineRes => {
                            // If offline page is found, return it. Otherwise, return null (triggers default dinosaur)
                            return offlineRes || null;
                        });
                    }
                    return null;
                });
            });
        })
    );
});
