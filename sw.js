const CACHE_NAME = 'ponnusamy-savings-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to network
  event.respondWith(fetch(event.request));
});
