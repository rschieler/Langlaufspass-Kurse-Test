// Service Worker: macht die App installierbar und startet sie auch ohne Netz.
// Eigene Dateien: zuerst vom Netz (immer aktuell), bei Funkloch aus dem Zwischenspeicher.
// Die Daten selbst hält Firestore offline vor.
// Test und Produktiv liegen auf derselben Domain: Cache-Namen pro Pfad trennen.
const PREFIX = 'llk' + new URL(self.registration.scope).pathname;
const CACHE = PREFIX + 'v4';
const SHELL = ['./', 'index.html', 'config.js', 'firebase.js', 'jspdf.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'logo-band.png', 'logo-print.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/__/')) return; // Firebase-Anmeldung nicht abfangen
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
  }
});
