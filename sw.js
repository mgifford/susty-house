/* =========================================================
   Sustainable House Evaluator — Service Worker
   Cache-First strategy; pre-caches all app assets on install
   ========================================================= */

const CACHE_NAME = 'susty-house-v4';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/main.css',
  '/src/css/print.css',
  '/src/css/overrides.css',
  '/src/js/app.js',
  '/src/js/pwa.js',
  '/src/js/db.js',
  '/src/js/store.js',
  '/src/js/profiles.js',
  '/src/js/assessment.js',
  '/src/js/scoring.js',
  '/src/js/recommendations.js',
  '/src/js/export-yaml.js',
  '/src/js/import-yaml.js',
  '/src/js/export-html.js',
  '/src/js/views/home.js',
  '/src/js/views/profile.js',
  '/src/js/views/assessment.js',
  '/src/js/views/results.js',
  '/src/data/items.json',
  '/src/data/strings.json',
  '/src/icons/icon-192.png',
  '/src/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js',
];

/* ----- Install: pre-cache all assets --------------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ----- Activate: purge old caches ------------------------ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('susty-house-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ----- Fetch: Cache-First strategy ----------------------- */
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses for same-origin and CDN requests
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
