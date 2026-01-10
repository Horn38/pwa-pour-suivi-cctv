// sw.js - Service Worker optimisé pour PWA Rapport CCTV
// Version 2026-01 - Cache intelligent + mise à jour automatique + offline fallback

const CACHE_NAME = 'rapport-cctv-v2'; // Change le numéro de version pour forcer mise à jour
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/android-launchericon-48-48.png',
  '/android-launchericon-72-72.png',
  '/android-launchericon-96-96.png',
  '/android-launchericon-144-144.png',
  '/android-launchericon-192-192.png',
  '/android-launchericon-512-512.png'
];

const FALLBACK_HTML = '/index.html'; // Fallback offline = ta page principale

// 1. Installation : cache les fichiers statiques essentiels
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache ouvert - Version', CACHE_NAME);
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('[SW] Erreur cache install:', err))
  );
  // Skip waiting pour activer immédiatement la nouvelle version
  self.skipWaiting();
});

// 2. Activation : nettoie les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Prend le contrôle immédiatement de toutes les pages ouvertes
  self.clients.claim();
});

// 3. Intercepte les requêtes (stratégie Stale-While-Revalidate + fallback offline)
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET ou non-http/https (ex: chrome-extension)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si dans le cache → on renvoie ça immédiatement (rapide + offline)
        if (cachedResponse) {
          // En parallèle : on met à jour le cache depuis le réseau (stale-while-revalidate)
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse.clone()));
              }
            })
            .catch(() => {}); // Erreur réseau silencieuse (on garde le cache)
          
          return cachedResponse;
        }

        // Pas dans le cache → on essaie le réseau
        return fetch(event.request)
          .then(networkResponse => {
            // Si réponse valide → on la cache pour la prochaine fois
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, networkResponse.clone()));
            }
            return networkResponse;
          })
          .catch(() => {
            // Pas de réseau → fallback vers index.html (offline experience)
            console.log('[SW] Offline - fallback vers index.html');
            return caches.match(FALLBACK_HTML);
          });
      })
  );
});

// 4. Gestion des mises à jour (message SKIP_WAITING depuis l'app)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING reçu - Activation immédiate');
    self.skipWaiting();
  }
});
