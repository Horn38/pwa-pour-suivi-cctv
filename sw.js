// sw.js - Version V4 - Clone corrigé + offline fiable
const CACHE_NAME = 'rapport-cctv-v4'; // Change pour forcer mise à jour
const SCOPE_PATH = '/pwa-pour-suivi-cctv/';

const STATIC_ASSETS = [
  SCOPE_PATH,
  SCOPE_PATH + 'index.html',
  SCOPE_PATH + 'manifest.json',
  SCOPE_PATH + 'android-launchericon-48-48.png',
  SCOPE_PATH + 'android-launchericon-72-72.png',
  SCOPE_PATH + 'android-launchericon-96-96.png',
  SCOPE_PATH + 'android-launchericon-144-144.png',
  SCOPE_PATH + 'android-launchericon-192-192.png',
  SCOPE_PATH + 'android-launchericon-512-512.png'
];

const FALLBACK_HTML = SCOPE_PATH + 'index.html';

self.addEventListener('install', event => {
  console.log('[SW V4] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW V4] Cache ouvert');
        return cache.addAll(STATIC_ASSETS);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW V4] Activation - Nettoyage');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW V4] Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin + SCOPE_PATH)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si dans cache → renvoyer immédiatement + mise à jour en fond
        if (cachedResponse) {
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                // Clone seulement si nécessaire
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
              }
            })
            .catch(() => console.log('[SW V4] Mise à jour réseau échouée (offline)'));
          return cachedResponse;
        }

        // Pas dans cache → réseau direct
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            console.log('[SW V4] Offline - Fallback vers index.html');
            return caches.match(FALLBACK_HTML);
          });
      })
  );
});
