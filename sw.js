/* =========================================================
   Sustainable House Evaluator — Service Worker
   Cache-First strategy; pre-caches all app assets on install
   ========================================================= */

const CACHE_NAME = 'susty-house-v4';

const PRECACHE_URLS = [
  '/susty-house/',
  '/susty-house/index.html',
  '/susty-house/manifest.json',
  '/susty-house/src/css/main.css',
  '/susty-house/src/css/print.css',
  '/susty-house/src/css/overrides.css',
  '/susty-house/src/js/app.js',
  '/susty-house/src/js/pwa.js',
  '/susty-house/src/js/db.js',
  '/susty-house/src/js/store.js',
  '/susty-house/src/js/profiles.js',
  '/susty-house/src/js/assessment.js',
  '/susty-house/src/js/scoring.js',
  '/susty-house/src/js/recommendations.js',
  '/susty-house/src/js/export-yaml.js',
  '/susty-house/src/js/import-yaml.js',
  '/susty-house/src/js/export-html.js',
  '/susty-house/src/js/views/home.js',
  '/susty-house/src/js/views/profile.js',
  '/susty-house/src/js/views/assessment.js',
  '/susty-house/src/js/views/results.js',
  '/susty-house/src/data/items.json',
  '/susty-house/src/data/strings.json',
  '/susty-house/src/icons/icon-192.png',
  '/susty-house/src/icons/icon-512.png',
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
