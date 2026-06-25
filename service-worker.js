const CACHE_NAME = 'dreams-contabilidad-v8';
const APP_SHELL = [
  './',
  './index.html',
  './contabilidad.html',
  './ventas.html',
  './gastos.html',
  './clientes.html',
  './productos.html',
  './balance.html',
  './movimientos.html',
  './assets/css/styles.css?v=security1',
  './assets/css/accounting.css?v=savefix5',
  './assets/js/main.js?v=security1',
  './assets/js/accounting.js?v=savefix5',
  './assets/js/supabase-config.js',
  './assets/js/supabase-client.js',
  './assets/img/favicon-dreams.png',
  './assets/img/pwa/icon-192.png',
  './assets/img/pwa/icon-512.png',
  './assets/img/marca-con-iso.png',
  './assets/img/logo-dreams-conta.png',
  './assets/video/hero-background.mp4?v=video1'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
