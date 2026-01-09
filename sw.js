// sw.js - Service Worker basique pour offline + cache de l'app

const CACHE_NAME = 'rapport-cctv-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Ajoute tes icônes ici si tu veux qu'elles soient cachées aussi
  '/android-launchericon-192-192.png',
  '/android-launchericon-512-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si dans le cache → on retourne ça (super rapide + offline)
        if (response) {
          return response;
        }
        // Sinon → on va chercher sur le réseau
        return fetch(event.request).catch(() => {
          // Si pas de réseau → on retourne la page principale comme fallback
          return caches.match('/index.html');
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
