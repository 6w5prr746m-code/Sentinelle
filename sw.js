const CACHE = 'sentinelle-v3';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/base.css', './css/themes.css',
  './js/app.js', './js/data.js', './js/store.js', './js/theme.js',
  './js/feed.js', './js/map.js', './js/report.js', './js/sim.js', './js/utils.js',
  './js/geo.js', './js/departments.js', './js/vigilance.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Les données de vigilance/hydrométrie doivent toujours être fraîches :
  // on ne les met jamais en cache, on laisse le fetch normal du navigateur faire foi.
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || fetchPromise;
    })
  );
});
