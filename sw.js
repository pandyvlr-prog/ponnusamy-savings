/**
 * Ponnusamy Savings - Service Worker
 * Cache-first strategy for static assets, network-first for API calls
 */

const CACHE_VERSION = 'pms-v150';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

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

const CDN_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com',
    'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
    // Add cache buster query to ensure fresh fetch from server
    const cb = '?cb=' + Date.now();
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            return Promise.all(
                APP_SHELL.map(url => {
                    return fetch(url + cb, { cache: 'no-store' })
                        .then(res => {
                            if (!res.ok) throw new Error('Failed ' + url);
                            // Store it under the original URL without cache buster
                            return cache.put(url, res);
                        });
                })
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k.startsWith('pms-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;

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

    // App shell: cache-first but ignore query strings so ?v=xxx matches
    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then(cached => {
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