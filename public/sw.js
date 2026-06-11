// Service Worker for Tom Social Grow PWA
const CACHE_NAME = 'tomgrow-cache-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.jpg',
  '/icon-512.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS).catch((error) => {
        console.warn('Pre-cache warning (some assets will load dynamically):', error);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // We only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset if found, otherwise perform network fetch
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Caching is optional for dynamic API routes or external integrations
        const url = new URL(event.request.url);
        if (
          networkResponse.status === 200 && 
          !url.pathname.startsWith('/api') && 
          !url.hostname.includes('firestore.googleapis.com') &&
          !url.hostname.includes('firebase')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((fetchError) => {
        // Fallback to index.html for clientside routes
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        console.error('Fetch offline error:', fetchError);
      });
    })
  );
});
