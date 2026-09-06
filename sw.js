const CACHE_NAME = 'turnosalud-v1';
const ASSETS = [
  './',
  './index.html',
  './css/global.css',
  './js/supabase-config.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});